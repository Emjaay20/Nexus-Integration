import Link from "next/link";
export function Footer() {
  return (
    <footer className="app-footer">
      <div className="wrap footer-inner">
        <span>
          <strong style={{ color: "var(--ink)" }}>nexus.</strong> &nbsp;
          Electronics supply chain, connected.
        </span>
        <div className="footer-links">
          <Link href="/docs">Documentation</Link>
          <Link href="/api-reference">API reference</Link>
          <Link href="/status">System status</Link>
          <span>© {new Date().getFullYear()} Nexus Integration</span>
        </div>
      </div>
    </footer>
  );
}
