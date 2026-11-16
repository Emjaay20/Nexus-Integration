import type { NextAuthConfig } from "next-auth"

export const authConfig = {
    trustHost: true,
    pages: {
        signIn: "/login",
    },
    providers: [],
    callbacks: {
        jwt({ token, user }) {
            if (user?.id) {
                token.userId = user.id
            }
            return token
        },
        session({ session, token }) {
            if (token.userId && session.user) {
                session.user.id = token.userId as string
            }
            return session
        },
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user
            const isOnProtected =
                nextUrl.pathname.startsWith("/workspace") ||
                nextUrl.pathname.startsWith("/integration-hub") ||
                nextUrl.pathname.startsWith("/bom-importer") ||
                nextUrl.pathname.startsWith("/developer")
            const isOnLogin = nextUrl.pathname.startsWith("/login")

            if (isOnProtected) {
                if (isLoggedIn) return true
                const callbackPath = `${nextUrl.pathname}${nextUrl.search}`
                const loginUrl = new URL("/login", nextUrl)
                loginUrl.searchParams.set("callbackUrl", callbackPath)
                return Response.redirect(loginUrl)
            }

            if (isOnLogin && isLoggedIn) {
                return Response.redirect(new URL("/workspace", nextUrl))
            }

            return true
        },
    },
} satisfies NextAuthConfig
