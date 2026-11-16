"use client";

import { loginTarget } from "@/lib/login-target";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Github,
  Mail,
  ArrowRight,
  Loader2,
  Sparkles,
  CheckCircle2,
  Lock,
  UserPlus,
  Building2,
} from "lucide-react";

type AuthTab = "signin" | "signup" | "magic-link" | "demo";

export function LoginForm() {
  const [activeTab, setActiveTab] = useState<AuthTab>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("Munich Robotics OEM");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const searchParams = useSearchParams();

  const urlError = searchParams.get("error");
  const targetPath = loginTarget(searchParams.get("callbackUrl"));
  const errorMessages: Record<string, string> = {
    "invalid-link": "This login link is invalid or has already been used.",
    expired: "This login link has expired. Please request a new one.",
    config: "Server configuration error. Please try again later.",
    server: "Something went wrong. Please try again.",
  };

  const handleGitHubLogin = () => {
    signIn("github", { callbackUrl: targetPath });
  };

  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (res?.error) {
        setError(
          "Invalid email or password. Need an account? Switch to Create Account.",
        );
      } else {
        window.location.assign(targetPath);
      }
    } catch {
      setError("Sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const regRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name,
          password,
          organization,
        }),
      });
      const data = await regRes.json();
      if (!regRes.ok) {
        setError(data.error || "Could not create account");
        setLoading(false);
        return;
      }
      const signRes = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (signRes?.error) {
        setError("Account created, please sign in.");
        setActiveTab("signin");
      } else {
        window.location.assign(targetPath);
      }
    } catch {
      setError("Failed to register account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("Failed");
      setMagicLinkSent(true);
    } catch {
      setError(
        "Magic link requires SMTP configured. Use Email & Password or Create Account instead.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError("");
    setDemoLoading(true);
    try {
      const result = await signIn("credentials", {
        email: "demo@nexus.dev",
        password: "demo1234",
        redirect: false,
      });
      if (result?.error) {
        setError("Demo login failed. Please try again.");
      } else {
        window.location.assign(targetPath);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setDemoLoading(false);
    }
  };

  if (magicLinkSent) {
    return (
      <div className="text-center py-6">
        <div className="w-16 h-16 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          Check your inbox
        </h2>
        <p className="text-sm text-slate-500 mb-1">We sent a sign-in link to</p>
        <p className="text-sm font-semibold text-slate-800 mb-6 font-mono">
          {email}
        </p>
        <button
          onClick={() => {
            setMagicLinkSent(false);
            setEmail("");
          }}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
        >
          ← Back to Sign In
        </button>
      </div>
    );
  }

  return (
    <div>
      {(error || urlError) && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 rounded-lg p-3 mb-5 text-xs font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            {error || errorMessages[urlError!] || "Authentication error"}
          </span>
        </div>
      )}

      {/* Auth Method Tabs */}
      <div className="grid grid-cols-4 gap-1 bg-slate-100 rounded-xl p-1 mb-6">
        <button
          type="button"
          onClick={() => {
            setActiveTab("signin");
            setError("");
          }}
          className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "signin"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          Sign In
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab("signup");
            setError("");
          }}
          className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "signup"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <UserPlus className="w-3.5 h-3.5" />
          Register
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab("demo");
            setError("");
          }}
          className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "demo"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          Instant Demo
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab("magic-link");
            setError("");
          }}
          className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "magic-link"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          Magic Link
        </button>
      </div>

      {/* TAB 1: EMAIL & PASSWORD SIGN IN */}
      {activeTab === "signin" && (
        <form onSubmit={handlePasswordSignIn} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-[11px] font-semibold tracking-wider text-slate-500 uppercase mb-1.5"
            >
              Work Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="engineer@company.de"
              required
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition text-sm"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-[11px] font-semibold tracking-wider text-slate-500 uppercase mb-1.5"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition shadow-lg shadow-blue-200/50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                Sign In to Workspace <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={handleDemoLogin}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Or sign in with one click using the pre-seeded Read-only Demo
              account →
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: MULTI-TENANT ACCOUNT REGISTRATION */}
      {activeTab === "signup" && (
        <form onSubmit={handleRegister} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="register-name"
                className="block text-[11px] font-semibold tracking-wider text-slate-500 uppercase mb-1"
              >
                Full Name
              </label>
              <input
                id="register-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Inga Lindqvist"
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label
                htmlFor="register-email"
                className="block text-[11px] font-semibold tracking-wider text-slate-500 uppercase mb-1"
              >
                Work Email
              </label>
              <input
                id="register-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="inga@oem.de"
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="register-organization"
                className="block text-[11px] font-semibold tracking-wider text-slate-500 uppercase mb-1"
              >
                Organization (Tenant)
              </label>
              <div className="relative">
                <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="register-organization"
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  required
                  className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl bg-slate-50/50 text-slate-900 text-xs focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>
            <p className="note" style={{ fontSize: 11 }}>
              Your account gets a private workspace. Only a workspace owner can
              assign shared access.
            </p>
          </div>

          <div>
            <label
              htmlFor="register-password"
              className="block text-[11px] font-semibold tracking-wider text-slate-500 uppercase mb-1"
            >
              Password (min. 10 chars)
            </label>
            <input
              id="register-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a strong password"
              minLength={10}
              required
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:border-blue-600"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition shadow-lg shadow-blue-200/50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                Provision Tenant & Sign In
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}

      {/* TAB 3: MAGIC LINK */}
      {activeTab === "magic-link" && (
        <form onSubmit={handleMagicLink} className="space-y-4">
          <div>
            <label
              htmlFor="magic-email"
              className="block text-[11px] font-semibold tracking-wider text-slate-500 uppercase mb-1.5"
            >
              Email Address
            </label>
            <input
              id="magic-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:border-blue-600"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>Send Magic Link</>
            )}
          </button>
        </form>
      )}

      {/* TAB 4: DEMO */}
      {activeTab === "demo" && (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-slate-900 mb-1">
              Instant Read-only Demo Evaluation Session
            </p>
            <p className="text-xs text-slate-600 leading-relaxed">
              Signs in with a pre-seeded multi-tenant workspace (
              <span className="font-mono">demo@nexus.dev</span>) connected to
              the Rust Platform Core and Go Ingestion Engine.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={demoLoading}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition shadow-lg shadow-blue-200/50"
          >
            {demoLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                Launch Demo Workspace <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      )}

      {/* Divider + GitHub */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200"></div>
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="px-3 bg-white text-slate-400">or SSO</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleGitHubLogin}
        className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-medium hover:bg-slate-800 transition"
      >
        <Github className="w-4 h-4" />
        Continue with GitHub OAuth
      </button>
    </div>
  );
}
