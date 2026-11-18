import { consumeLimit } from "@/lib/request-limits"
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import GitHub from "next-auth/providers/github"
import { authConfig } from "./auth.config"
import { db } from "@/lib/db"
import { seedUserData } from "@/db/seed"
import crypto from "crypto"

const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001"

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
    const parts = storedHash.split(":")
    if (parts.length !== 2) return false
    const [salt, originalHex] = parts
    const derived = await new Promise<Buffer>((resolve,reject)=>crypto.scrypt(password,salt,64,(error,key)=>error?reject(error):resolve(key)))
    const original = Buffer.from(originalHex, "hex")
    if (derived.length !== original.length) return false
    return crypto.timingSafeEqual(derived, original)
}

export const { handlers, signIn, signOut, auth } = NextAuth({
    ...authConfig,
    providers: [
        GitHub({
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
        }),
        Credentials({
            name: "Email & Password",
            credentials: {
                email: { label: "Email", type: "email", placeholder: "you@company.com" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                const email = ((credentials?.email as string) || "").trim().toLowerCase()
                const password = (credentials?.password as string) || ""
                if (!email || !password || email.length>254 || password.length>128) return null
                try { if (!await consumeLimit("login",email,20,600) || !await consumeLimit("login-global","global",300,600)) return null } catch { return null }

                if (email === "demo@nexus.dev" && password === "demo1234") {
                    return {
                        id: DEMO_USER_ID,
                        name: "Nexus Demo (read only)",
                        email: "demo@nexus.dev",
                        image: null,
                    }
                }

                try {
                    const res = await db.query(
                        `SELECT id, email, name, image, password_hash FROM users WHERE email = $1`,
                        [email]
                    )
                    if (res.rows.length === 0) return null
                    const row = res.rows[0]
                    if (!row.password_hash) return null
                    if (!await verifyPassword(password, row.password_hash)) return null

                    return {
                        id: row.id,
                        name: row.name || email.split("@")[0],
                        email: row.email,
                        image: row.image || null,
                    }
                } catch (err) {
                    console.error("Credential verify error:", err)
                    return null
                }
            },
        }),
    ],
    callbacks: {
        ...authConfig.callbacks,
        async signIn({ user, account }) {
            try {
                const email = user.email
                if (!email) return true

                const provider = account?.provider || "credentials"
                const isDemo = email === "demo@nexus.dev"
                const userId = isDemo ? DEMO_USER_ID : provider === "credentials" ? user.id : undefined

                const result = await db.query(
                    `INSERT INTO users (${userId ? "id, " : ""}email, name, image, provider)
                     VALUES (${userId ? "$1, $2, $3, $4, $5" : "$1, $2, $3, $4"})
                     ON CONFLICT (email) DO UPDATE SET
                         name = COALESCE(EXCLUDED.name, users.name),
                         image = COALESCE(EXCLUDED.image, users.image)
                     RETURNING id`,
                    userId
                        ? [userId, email, user.name, user.image, provider]
                        : [email, user.name, user.image, provider]
                )

                const dbUserId = result.rows[0].id
                await seedUserData(dbUserId)
                user.id = dbUserId
            } catch (error) {
                console.error("Error in signIn callback:", error)
                return false
            }
            return true
        },
    },
})
