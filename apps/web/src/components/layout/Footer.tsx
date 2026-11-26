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
          <Link href="/case-study">Why I built Nexus</Link>
          <Link href="/#contact">Contact via FlowMeet</Link>
          <Link href="/api-reference">API reference</Link>
          <Link href="/status">System status</Link>
          <a href="https://github.com/Emjaay20/Nexus-Integration" target="_blank" rel="noopener noreferrer">Source code</a>
          <a href="https://yusufsaka.dev" target="_blank" rel="noopener noreferrer">Builder portfolio</a>
          <span>© {new Date().getFullYear()} Nexus Integration</span>
        </div>
      </div>
    </footer>
  );
}
