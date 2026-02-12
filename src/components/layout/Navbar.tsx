'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { LayoutGrid, FileSpreadsheet, Activity, Terminal, LogOut } from 'lucide-react';
import clsx from 'clsx';

export function Navbar() {
    const pathname = usePathname();
    const { data: session, status } = useSession();

    // Hide navbar on login page
    if (pathname === '/login') return null;

    const navItems = [
        { name: 'BOM Importer', href: '/bom-importer', icon: FileSpreadsheet },
        { name: 'Integration Hub', href: '/integration-hub', icon: Activity },
        { name: 'Developer', href: '/developer/playground', icon: Terminal },
    ];

    const userInitials = session?.user?.name
        ? session.user.name.split(' ').map(n => n[0]).join('').toUpperCase()
        : '?';

    return (
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50 h-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
                <div className="flex items-center gap-8">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight text-slate-900">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                            <LayoutGrid className="w-5 h-5" />
                        </div>
                        Nexus<span className="text-blue-600">.OS</span>
                    </Link>

                    {/* Desktop Nav */}
                    <nav className="hidden md:flex gap-1">
                        {navItems.map((item) => {
                            const isActive = pathname.startsWith(item.href);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={clsx(
                                        "px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors",
                                        isActive
                                            ? "bg-slate-100 text-blue-600"
                                            : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                                    )}
                                >
                                    <item.icon className="w-4 h-4" />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                {/* Right side — session-aware */}
                <div className="flex items-center gap-4">
                    {status === 'authenticated' && session?.user ? (
                        <div className="flex items-center gap-3">
                            <div className="hidden sm:flex items-center gap-3 pr-4 border-r border-slate-200">
                                <div className="text-right">
                                    <div className="text-sm font-medium text-slate-900">{session.user.name || session.user.email}</div>
                                    <div className="text-xs text-slate-500">Admin Workspace</div>
                                </div>
                                {session.user.image ? (
                                    <img
                                        src={session.user.image}
                                        alt={session.user.name || "User"}
                                        className="w-9 h-9 rounded-full border border-slate-200"
                                    />
                                ) : (
                                    <div className="w-9 h-9 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-600 font-medium text-sm">
                                        {userInitials}
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => signOut({ callbackUrl: '/login' })}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Sign out"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        </div>
                    ) : status === 'unauthenticated' ? (
                        <Link
                            href="/login"
                            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                            Sign In
                        </Link>
                    ) : (
                        <div className="w-9 h-9 rounded-full bg-slate-100 animate-pulse" />
                    )}
                </div>
            </div>
        </header>
    );
}
