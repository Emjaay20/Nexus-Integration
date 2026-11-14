import { LoginForm } from "@/components/auth/LoginForm";
import { Suspense } from "react";
import Link from "next/link";
export default function LoginPage() {
  return (
    <main id="main-content" className="wrap">
      <div className="login-layout">
        <section className="login-story">
          <div className="eyebrow">YOUR SOURCING WORKSPACE</div>
          <h1>
            Good builds start
            <br />
            with better information.
          </h1>
          <p>
            Keep your parts lists, supplier options, and system activity
            connected.
          </p>
          <div className="login-rule" />
          <div className="eyebrow">ONE CLEAR WORKFLOW</div>
          <ol>
            <li>Bring your Bill of Materials.</li>
            <li>Validate the details that matter.</li>
            <li>Make your next sourcing decision.</li>
          </ol>
          <Link className="textlink" href="/platform-core">
            Explore Studio before signing in ↗
          </Link>
        </section>
        <section className="login-form">
          <div className="eyebrow">WELCOME TO NEXUS</div>
          <h2>Sign in to your workspace.</h2>
          <p>Pick up where your last build left off.</p>
          <Suspense fallback={<p>Loading sign-in options…</p>}>
            <LoginForm />
          </Suspense>
        </section>
      </div>
    </main>
  );
}
