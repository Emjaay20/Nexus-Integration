'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, Github, ArrowRight, Loader2, Mail, CheckCircle2, Sparkles } from 'lucide-react';

type LoginMode = 'magic-link' | 'demo';

export function LoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [magicLinkSent, setMagicLinkSent] = useState(false);
    const [mode, setMode] = useState<LoginMode>('magic-link');
    const router = useRouter();
    const searchParams = useSearchParams();

    // Show errors from magic link redirects
    const urlError = searchParams.get('error');
    const errorMessages: Record<string, string> = {
        'invalid-link': 'This login link is invalid or has already been used.',
        'expired': 'This login link has expired. Please request a new one.',
        'config': 'Server configuration error. Please try again later.',
        'server': 'Something went wrong. Please try again.',
    };

    const handleMagicLink = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/auth/magic-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to send magic link');
            }

            setMagicLinkSent(true);
        } catch (err: any) {
            setError(err.message || 'Failed to send magic link. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleDemoLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await signIn('credentials', {
                email: 'demo@nexus.dev',
                password: 'demo1234',
                redirect: false,
            });

            if (result?.error) {
                setError('Something went wrong. Please try again.');
            } else {
                router.push('/integration-hub');
                router.refresh();
            }
        } catch {
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleGitHubLogin = () => {
        signIn('github', { callbackUrl: '/integration-hub' });
    };

    // Magic link sent success state
    if (magicLinkSent) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 p-8 text-center">
                <div className="w-16 h-16 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-center mx-auto mb-5">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Check your email</h2>
                <p className="text-sm text-slate-500 mb-1">
                    We sent a magic link to
                </p>
                <p className="text-sm font-semibold text-slate-800 mb-6">{email}</p>
                <p className="text-xs text-slate-400 mb-6">
                    Click the link in the email to sign in. It expires in 10 minutes.
                </p>
                <button
                    onClick={() => { setMagicLinkSent(false); setEmail(''); }}
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                    ← Use a different email
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 p-8">
            {/* GitHub Login */}
            <button
                onClick={handleGitHubLogin}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors mb-6"
            >
                <Github className="w-5 h-5" />
                Continue with GitHub
            </button>

            {/* Divider */}
            <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-3 bg-white text-slate-400">or</span>
                </div>
            </div>

            {/* Mode Tabs */}
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1 mb-6">
                <button
                    onClick={() => { setMode('magic-link'); setError(''); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${mode === 'magic-link'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <Mail className="w-4 h-4" />
                    Email Login
                </button>
                <button
                    onClick={() => { setMode('demo'); setError(''); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${mode === 'demo'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <Sparkles className="w-4 h-4" />
                    Demo Account
                </button>
            </div>

            {/* Error messages */}
            {(error || urlError) && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 rounded-lg p-3 mb-4 text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error || errorMessages[urlError!] || 'An error occurred'}
                </div>
            )}

            {/* Magic Link Form */}
            {mode === 'magic-link' && (
                <form onSubmit={handleMagicLink} className="space-y-4">
                    <div>
                        <label htmlFor="magic-email" className="block text-sm font-medium text-slate-700 mb-1.5">
                            Email address
                        </label>
                        <input
                            id="magic-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@company.com"
                            required
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-900 placeholder:text-slate-400"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-200"
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
                    <p className="text-xs text-slate-400 text-center">
                        No password needed — we'll email you a secure login link.
                    </p>
                </form>
            )}

            {/* Demo Form */}
            {mode === 'demo' && (
                <form onSubmit={handleDemoLogin} className="space-y-4">
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                        <p className="text-sm text-indigo-700 font-medium mb-1">🎯 One-Click Demo</p>
                        <p className="text-xs text-indigo-600">
                            Sign in instantly with pre-populated demo data to explore all features.
                        </p>
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-200"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                Sign In as Demo User <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </form>
            )}
        </div>
    );
}
