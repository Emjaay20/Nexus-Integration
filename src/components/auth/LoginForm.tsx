'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, Github, Mail, ArrowRight, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';

type AuthTab = 'magic-link' | 'demo';

export function LoginForm() {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [demoLoading, setDemoLoading] = useState(false);
    const [magicLinkSent, setMagicLinkSent] = useState(false);
    const [activeTab, setActiveTab] = useState<AuthTab>('magic-link');
    const router = useRouter();
    const searchParams = useSearchParams();

    const urlError = searchParams.get('error');
    const errorMessages: Record<string, string> = {
        'invalid-link': 'This login link is invalid or has already been used.',
        'expired': 'This login link has expired. Please request a new one.',
        'config': 'Server configuration error. Please try again later.',
        'server': 'Something went wrong. Please try again.',
    };

    const handleGitHubLogin = () => {
        signIn('github', { callbackUrl: '/integration-hub' });
    };

    const handleMagicLink = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;
        setError('');
        setLoading(true);
        try {
            const res = await fetch('/api/auth/magic-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            if (!res.ok) throw new Error('Failed');
            setMagicLinkSent(true);
        } catch {
            setError('Failed to send magic link. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleDemoLogin = async () => {
        setError('');
        setDemoLoading(true);
        try {
            const result = await signIn('credentials', {
                email: 'demo@nexus.dev',
                password: 'demo1234',
                redirect: false,
            });
            if (result?.error) {
                setError('Demo login failed. Please try again.');
            } else {
                router.push('/integration-hub');
                router.refresh();
            }
        } catch {
            setError('Something went wrong. Please try again.');
        } finally {
            setDemoLoading(false);
        }
    };

    // ── Magic link sent confirmation ──
    if (magicLinkSent) {
        return (
            <div className="text-center py-6">
                <div className="w-16 h-16 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-center mx-auto mb-5">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Check your inbox</h2>
                <p className="text-sm text-slate-500 mb-1">We sent a sign-in link to</p>
                <p className="text-sm font-semibold text-slate-800 mb-6 font-mono">{email}</p>
                <div className="bg-slate-50 rounded-xl p-4 mb-6 text-left">
                    <p className="text-xs text-slate-500 leading-relaxed">
                        Click the link in the email to sign in instantly. The link expires in <span className="font-semibold text-slate-700">10 minutes</span>. Check your spam folder if you don't see it.
                    </p>
                </div>
                <button
                    onClick={() => { setMagicLinkSent(false); setEmail(''); }}
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
                >
                    ← Try a different email
                </button>
            </div>
        );
    }

    return (
        <div>
            {/* Error */}
            {(error || urlError) && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 rounded-lg p-3 mb-6 text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error || errorMessages[urlError!] || 'An error occurred'}
                </div>
            )}

            {/* ── GitHub OAuth ── */}
            <button
                onClick={handleGitHubLogin}
                className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-all shadow-sm mb-8"
            >
                <Github className="w-5 h-5" />
                Continue with GitHub
            </button>

            {/* ── Divider ── */}
            <div className="relative mb-8">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                    <span className="px-4 bg-white text-slate-400">or choose a method</span>
                </div>
            </div>

            {/* ── Auth Method Tabs ── */}
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6">
                <button
                    onClick={() => { setActiveTab('magic-link'); setError(''); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'magic-link'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <Mail className="w-4 h-4" />
                    Magic Link
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md leading-none">
                        ★
                    </span>
                </button>
                <button
                    onClick={() => { setActiveTab('demo'); setError(''); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'demo'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <Sparkles className="w-4 h-4" />
                    Demo Account
                </button>
            </div>

            {/* ── Magic Link Tab ── */}
            {activeTab === 'magic-link' && (
                <form onSubmit={handleMagicLink} className="space-y-5">
                    <div>
                        <label className="block text-[11px] font-semibold tracking-[0.15em] text-slate-400 uppercase mb-2">
                            Email Address
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@company.com"
                            required
                            className="w-full px-0 py-3 border-0 border-b-2 border-slate-200 bg-transparent text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors text-[15px]"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 py-4 bg-indigo-600 text-white rounded-xl font-semibold text-sm tracking-wide uppercase hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-200/50"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <Mail className="w-4 h-4" />
                                Send Magic Link
                            </>
                        )}
                    </button>

                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                        <p className="text-xs text-slate-500 leading-relaxed">
                            <span className="font-semibold text-slate-700">No password needed.</span>{' '}
                            We'll send a secure sign-in link to your email. Click it and you're in — fast, safe, and modern.
                        </p>
                    </div>
                </form>
            )}

            {/* ── Demo Tab ── */}
            {activeTab === 'demo' && (
                <div className="space-y-5">
                    <div className="bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 rounded-xl p-5">
                        <div className="flex items-start gap-3">
                            <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                                <Sparkles className="w-4 h-4 text-indigo-600" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-800 mb-1">Try the full experience</p>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    Sign in instantly with a pre-populated account. Explore integrations, BOM imports, analytics, and the API playground — all with realistic demo data.
                                </p>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleDemoLogin}
                        disabled={demoLoading}
                        className="w-full flex items-center justify-center gap-2 py-4 bg-indigo-600 text-white rounded-xl font-semibold text-sm tracking-wide uppercase hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-200/50"
                    >
                        {demoLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                Access Dashboard
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>

                    <p className="text-center text-xs text-slate-400">
                        Credentials: <span className="font-mono text-slate-500">demo@nexus.dev</span> / <span className="font-mono text-slate-500">demo1234</span>
                    </p>
                </div>
            )}
        </div>
    );
}
