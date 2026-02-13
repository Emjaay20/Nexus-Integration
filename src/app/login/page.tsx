import { LoginForm } from '@/components/auth/LoginForm';
import { Suspense } from 'react';

export default function LoginPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-50 flex items-center justify-center p-4 font-[family-name:var(--font-geist-sans)]">
            {/* Subtle background pattern */}
            <div className="fixed inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

            <div className="w-full max-w-md relative z-10">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 mb-4">
                        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                            </svg>
                        </div>
                        <span className="text-2xl font-[900] tracking-tight text-slate-900">
                            Nexus<span className="text-indigo-600">.OS</span>
                        </span>
                    </div>
                    <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Welcome back</h1>
                    <p className="text-slate-500">Sign in to your supply chain dashboard.</p>
                </div>

                {/* Login Card — Suspense needed for useSearchParams */}
                <Suspense fallback={<div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-8 h-64 animate-pulse" />}>
                    <LoginForm />
                </Suspense>
            </div>
        </div>
    );
}
