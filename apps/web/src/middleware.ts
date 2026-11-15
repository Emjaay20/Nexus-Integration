import NextAuth from "next-auth"
import { authConfig } from "./auth.config"

export default NextAuth(authConfig).auth

export const config = {
    matcher: [
        "/workspace/:path*",
        "/integration-hub/:path*",
        "/bom-importer/:path*",
        "/developer/:path*",
    ],
}
