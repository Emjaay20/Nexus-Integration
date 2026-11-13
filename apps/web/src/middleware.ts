export { auth as middleware } from "@/auth"

export const config = {
    matcher: [
        "/integration-hub/:path*",
        "/bom-importer/:path*",
        "/developer/:path*",
    ],
}
