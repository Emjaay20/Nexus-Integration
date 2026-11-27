"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
const links = [
  ["Workspace", "/workspace"],
  ["Studio", "/platform-core"],
  ["BOM Importer", "/bom-importer"],
  ["Integrations", "/integration-hub"],
  ["Docs", "/docs"],
  ["Why Nexus", "/case-study"],
];
export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, []);
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="topbar">
        <div className="topbar-in">
          <Link
            href="/"
            className="logo"
            aria-label="Nexus Integration home"
            onClick={() => setOpen(false)}
          >
            <span className="logo-mark">N</span>
            <span className="brand-word">
              nexus<span style={{ color: "var(--blue)" }}>.</span>
            </span>
            <span className="brand-sub">Integration</span>
          </Link>
          <nav className="mainnav" aria-label="Main navigation">
            {links.map(([label, href]) => (
              <Link
                key={href}
                className={pathname.startsWith(href) ? "active" : ""}
                aria-current={pathname.startsWith(href) ? "page" : undefined}
                href={href}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="top-actions">
            <Link href="/status" className="signin desktop-action">
              System status
            </Link>
            {session ? (
              <button
                className="signin desktop-action"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                Sign out
              </button>
            ) : (
              <Link href="/login" className="signin desktop-action">
                Sign in
              </Link>
            )}
            <a
              className="btn btn-primary btn-sm"
              href="https://flowmeet.aetherhost.app/book/aetherhost"
              data-flowmeet-open
            >
              Contact builder <ArrowUpRight size={14} />
            </a>
            <button
              ref={toggle}
              className="mobile-toggle"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="mobile-navigation"
              onClick={() => setOpen(!open)}
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        {open && (
          <nav
            id="mobile-navigation"
            className="mobile-nav"
            aria-label="Mobile navigation"
          >
            {links.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className={pathname.startsWith(href) ? "active" : ""}
                onClick={() => setOpen(false)}
              >
                {label}
              </Link>
            ))}
            <Link href="/status" onClick={() => setOpen(false)}>
              System status
            </Link>
            {session ? (
              <button onClick={() => signOut({ callbackUrl: "/login" })}>
                Sign out
              </button>
            ) : (
              <Link href="/login" onClick={() => setOpen(false)}>
                Sign in
              </Link>
            )}
          </nav>
        )}
      </header>
    </>
  );
}
