'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Github, ArrowRight, Loader2 } from 'lucide-react';

export function LoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

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
                setError('Invalid email or password. Try the demo credentials below.');
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
                    <span className="px-3 bg-white text-slate-400">or sign in with email</span>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 rounded-lg p-3 mb-4 text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                </div>
            )}

            {/* Credentials Form */}
            <form onSubmit={handleCredentialsLogin} className="space-y-4">
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                        Email
                    </label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="demo@nexus.dev"
                        required
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-900 placeholder:text-slate-400"
                    />
                </div>

                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                        Password
                    </label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
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
                            Sign In <ArrowRight className="w-4 h-4" />
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}
