'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, Github, Mail, ArrowRight, Loader2 } from 'lucide-react';

export function LoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [magicLinkSent, setMagicLinkSent] = useState(false);
    const [magicEmail, setMagicEmail] = useState('');
    const [magicLoading, setMagicLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();

    const urlError = searchParams.get('error');
    const errorMessages: Record<string, string> = {
        'invalid-link': 'This login link is invalid or has already been used.',
        'expired': 'This login link has expired. Please request a new one.',
        'config': 'Server configuration error. Please try again later.',
        'server': 'Something went wrong. Please try again.',
    };

    const handleCredentialsLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await signIn('credentials', {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                setError('Invalid credentials. Use the demo hint below.');
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

    const handleMagicLink = async () => {
        if (!magicEmail) return;
        setMagicLoading(true);
        setError('');
        try {
            const res = await fetch('/api/auth/magic-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: magicEmail }),
            });
            if (!res.ok) throw new Error('Failed');
            setMagicLinkSent(true);
        } catch {
            setError('Failed to send magic link. Try again.');
        } finally {
            setMagicLoading(false);
        }
    };

    // Magic link sent confirmation
    if (magicLinkSent) {
        return (
            <div className="text-center py-8">
                <div className="w-14 h-14 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-center mx-auto mb-5">
                    <Mail className="w-7 h-7 text-emerald-500" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Check your email</h2>
                <p className="text-sm text-slate-500 mb-1">We sent a magic link to</p>
                <p className="text-sm font-semibold text-slate-800 mb-6">{magicEmail}</p>
                <p className="text-xs text-slate-400 mb-6">Click the link in the email to sign in. It expires in 10 minutes.</p>
                <button
                    onClick={() => { setMagicLinkSent(false); setMagicEmail(''); }}
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                    ← Use a different email
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

            {/* Demo Form */}
            <form onSubmit={handleCredentialsLogin} className="space-y-6">
                <div>
                    <label className="block text-[11px] font-semibold tracking-[0.15em] text-slate-400 uppercase mb-2">
                        Email Address
                    </label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@company.com"
                        required
                        className="w-full px-0 py-3 border-0 border-b border-slate-200 bg-transparent text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors text-[15px]"
                    />
                </div>

                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="block text-[11px] font-semibold tracking-[0.15em] text-slate-400 uppercase">
                            Password
                        </label>
                        <span className="text-xs text-slate-400 cursor-pointer hover:text-indigo-600 transition-colors">Forgot?</span>
                    </div>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full px-0 py-3 border-0 border-b border-slate-200 bg-transparent text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors text-[15px]"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-4 bg-indigo-600 text-white rounded-xl font-semibold text-sm tracking-wide uppercase hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-200/50 mt-8"
                >
                    {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <>Access Dashboard</>
                    )}
                </button>
            </form>

            {/* Divider */}
            <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-100"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                    <span className="px-4 bg-white text-slate-400">or continue with</span>
                </div>
            </div>

            {/* Social buttons */}
            <div className="flex items-center justify-center gap-4">
                <button
                    onClick={handleGitHubLogin}
                    className="w-12 h-12 flex items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700 hover:bg-slate-50 transition-all"
                    title="Sign in with GitHub"
                >
                    <Github className="w-5 h-5" />
                </button>
                <div className="relative group">
                    <button
                        onClick={() => {
                            const el = document.getElementById('magic-link-popover');
                            if (el) el.classList.toggle('hidden');
                        }}
                        className="w-12 h-12 flex items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700 hover:bg-slate-50 transition-all"
                        title="Sign in with email link"
                    >
                        <Mail className="w-5 h-5" />
                    </button>
                    {/* Magic link popover */}
                    <div id="magic-link-popover" className="hidden absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-10">
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-3 h-3 bg-white border-r border-b border-slate-200 rotate-45" />
                        <p className="text-xs font-medium text-slate-700 mb-3">Sign in with a passwordless magic link:</p>
                        <div className="flex gap-2">
                            <input
                                type="email"
                                value={magicEmail}
                                onChange={(e) => setMagicEmail(e.target.value)}
                                placeholder="you@email.com"
                                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                            <button
                                onClick={handleMagicLink}
                                disabled={magicLoading || !magicEmail}
                                className="px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                            >
                                {magicLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Demo hint */}
            <div className="mt-10 pt-6 border-t border-slate-100 text-center">
                <p className="text-sm text-slate-400">
                    Demo: <button
                        onClick={() => { setEmail('demo@nexus.dev'); setPassword('demo1234'); }}
                        className="text-indigo-600 hover:text-indigo-700 font-mono font-medium transition-colors"
                    >
                        demo@nexus.dev
                    </button>
                </p>
            </div>
        </div>
    );
}
