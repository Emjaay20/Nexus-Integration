"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
const links = [
  ["Overview", "/integration-hub"],
  ["Activity", "/integration-hub/logs"],
  ["Analytics", "/integration-hub/analytics"],
  ["Connectors", "/integration-hub/connectors"],
  ["Settings", "/integration-hub/settings"],
];
export default function IntegrationHubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const path = usePathname();
  return (
    <main id="main-content" className="wrap">
      <header className="pagehead">
        <div className="eyebrow">WORKSPACE / CONNECTIONS</div>
        <h1>Integration Hub</h1>
        <p>
          Your systems, in sync. Monitor connections, review activity, and
          resolve issues in one place.
        </p>
      </header>
      <nav className="workspace-nav" aria-label="Integration workspace">
        {links.map(([label, href]) => (
          <Link
            key={href}
            href={href}
            className={
              (
                href === "/integration-hub"
                  ? path === href
                  : path.startsWith(href)
              )
                ? "active"
                : ""
            }
            aria-current={
              (
                href === "/integration-hub"
                  ? path === href
                  : path.startsWith(href)
              )
                ? "page"
                : undefined
            }
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="workspace-main">{children}</div>
    </main>
  );
}
