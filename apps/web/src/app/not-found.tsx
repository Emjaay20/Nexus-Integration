import Link from 'next/link';
import { ArrowLeft, Compass } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-white font-[family-name:var(--font-geist-sans)]">
            <div className="text-center max-w-md px-6">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-8">
                    <Compass className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">404</p>
                <h1 className="text-3xl font-extrabold text-slate-900 mb-3">Page not found</h1>
                <p className="text-slate-500 mb-8 leading-relaxed">
                    The page you&apos;re looking for doesn&apos;t exist or has been moved.
                </p>
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Home
                </Link>
            </div>
        </div>
    );
}
