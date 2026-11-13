import NextAuth from "next-auth"
import { authConfig } from "./auth.config"

export default NextAuth(authConfig).auth

export const config = {
    matcher: [
        "/integration-hub/:path*",
        "/bom-importer/:path*",
        "/developer/:path*",
    ],
}
