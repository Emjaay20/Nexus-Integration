import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import GitHub from "next-auth/providers/github"

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
                // Demo credentials for portfolio showcase
                if (
                    credentials?.email === "demo@nexus.dev" &&
                    credentials?.password === "demo1234"
                ) {
                    return {
                        id: "demo-user",
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
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user
            const isOnProtected = nextUrl.pathname.startsWith('/integration-hub') ||
                nextUrl.pathname.startsWith('/bom-importer') ||
                nextUrl.pathname.startsWith('/developer')
            const isOnLogin = nextUrl.pathname.startsWith('/login')

            if (isOnProtected) {
                if (isLoggedIn) return true
                return false // Redirect to login
            }

            if (isOnLogin && isLoggedIn) {
                return Response.redirect(new URL('/integration-hub', nextUrl))
            }

            return true
        },
    },
})
