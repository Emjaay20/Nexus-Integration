import { LoginForm } from '@/components/auth/LoginForm';
import { Suspense } from 'react';
import Link from 'next/link';

export default function LoginPage() {
    return (
        <div className="min-h-screen flex font-[family-name:var(--font-geist-sans)]">
            {/* Left Panel — Brand */}
            <div className="hidden lg:flex lg:w-[48%] relative bg-gradient-to-br from-slate-100 via-slate-50 to-white flex-col justify-between p-10 overflow-hidden">
                {/* Subtle grid pattern */}
                <div className="absolute inset-0 bg-[radial-gradient(#d1d5db_1px,transparent_1px)] [background-size:28px_28px] opacity-30 pointer-events-none" />
                {/* Gradient overlay at top */}
                <div className="absolute top-0 right-0 w-full h-72 bg-gradient-to-b from-indigo-100/40 to-transparent pointer-events-none" />

                {/* Logo → Home link */}
                <div className="relative z-10">
                    <Link
                        href="/"
                        className="group inline-flex items-center gap-3 transition-all duration-300"
                    >
                        <div className="w-11 h-11 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-indigo-300 group-hover:rounded-2xl">
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                            </svg>
                        </div>
                        <span className="text-sm font-semibold text-slate-400 opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0">
                            Back to Home
                        </span>
                    </Link>
                </div>

                {/* Tagline */}
                <div className="relative z-10">
                    <h2 className="text-[2.6rem] leading-tight font-light text-slate-800 tracking-tight">
                        Orchestrating the<br />
                        <span className="italic font-normal text-indigo-600">future of supply.</span>
                    </h2>
                    {/* Carousel dots */}
                    <div className="flex items-center gap-2 mt-8">
                        <div className="w-10 h-1 bg-slate-800 rounded-full" />
                        <div className="w-3 h-1 bg-slate-300 rounded-full" />
                        <div className="w-3 h-1 bg-slate-300 rounded-full" />
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="relative z-10 flex items-center justify-between">
                    <p className="text-xs font-medium tracking-[0.25em] text-slate-400 uppercase">
                        Data &nbsp;•&nbsp; Logistics &nbsp;•&nbsp; Intelligence
                    </p>
                </div>
            </div>

            {/* Right Panel — Form */}
            <div className="flex-1 flex flex-col justify-between bg-white">
                <div className="flex-1 flex items-center justify-center px-6 py-12">
                    <div className="w-full max-w-md">
                        {/* Header */}
                        <div className="mb-10">
                            {/* Mobile logo - only show on small screens */}
                            <div className="lg:hidden flex items-center gap-2 mb-8">
                                <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                    </svg>
                                </div>
                                <span className="text-xl font-[900] tracking-tight text-slate-900">
                                    Nexus<span className="text-indigo-600">.OS</span>
                                </span>
                            </div>
                            <p className="text-xs font-semibold tracking-[0.2em] text-slate-400 uppercase mb-2">Welcome</p>
                            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Sign In</h1>
                        </div>

                        {/* Login Card */}
                        <Suspense fallback={<div className="h-80 animate-pulse rounded-xl bg-slate-50" />}>
                            <LoginForm />
                        </Suspense>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-10 py-6 flex items-center justify-end">
                    <p className="text-xs text-slate-300 tracking-wide">© 2026 NEXUS.OS</p>
                </div>
            </div>
        </div>
    );
}
