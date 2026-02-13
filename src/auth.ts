import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import GitHub from "next-auth/providers/github"
import { db } from "@/lib/db"
import { seedUserData } from "@/db/seed"

// Fixed UUID for demo user so their data persists across sessions
const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001"

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        GitHub({
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
        }),
        Credentials({
            name: "Demo Account",
            credentials: {
                email: { label: "Email", type: "email", placeholder: "demo@nexus.dev" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (
                    credentials?.email === "demo@nexus.dev" &&
                    credentials?.password === "demo1234"
                ) {
                    return {
                        id: DEMO_USER_ID,
                        name: "Demo User",
                        email: "demo@nexus.dev",
                        image: null,
                    }
                }
                return null
            },
        }),
    ],
    pages: {
        signIn: "/login",
    },
    callbacks: {
        async signIn({ user, account }) {
            try {
                const email = user.email
                if (!email) return true

                // Upsert user into database
                const provider = account?.provider || 'credentials'
                const userId = provider === 'credentials' ? DEMO_USER_ID : undefined

                const result = await db.query(
                    `INSERT INTO users (${userId ? 'id, ' : ''}email, name, image, provider)
                     VALUES (${userId ? '$1, $2, $3, $4, $5' : '$1, $2, $3, $4'})
                     ON CONFLICT (email) DO UPDATE SET
                         name = EXCLUDED.name,
                         image = EXCLUDED.image
                     RETURNING id`,
                    userId
                        ? [userId, email, user.name, user.image, provider]
                        : [email, user.name, user.image, provider]
                )

                const dbUserId = result.rows[0].id

                // Seed demo data for new users
                await seedUserData(dbUserId)

                // Store the DB user ID on the user object for JWT callback
                user.id = dbUserId
            } catch (error) {
                console.error('Error in signIn callback:', error)
            }
            return true
        },

        async jwt({ token, user }) {
            // On initial sign-in, user object is available
            if (user?.id) {
                token.userId = user.id
            }
            return token
        },

        async session({ session, token }) {
            // Attach the DB user ID to the session
            if (token.userId && session.user) {
                session.user.id = token.userId as string
            }
            return session
        },

        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user
            const isOnProtected = nextUrl.pathname.startsWith('/integration-hub') ||
                nextUrl.pathname.startsWith('/bom-importer') ||
                nextUrl.pathname.startsWith('/developer')
            const isOnLogin = nextUrl.pathname.startsWith('/login')

            if (isOnProtected) {
                if (isLoggedIn) return true
                return false
            }

            if (isOnLogin && isLoggedIn) {
                return Response.redirect(new URL('/integration-hub', nextUrl))
            }

            return true
        },
    },
})
