'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, FileSpreadsheet, Activity, Terminal } from 'lucide-react';
import clsx from 'clsx';

export function Navbar() {
    const pathname = usePathname();

    // Don't show on home page if you want a clean landing, but user asked for navigation.
    // Let's show it everywhere for consistency as requested.

    const navItems = [
        { name: 'BOM Importer', href: '/bom-importer', icon: FileSpreadsheet },
        { name: 'Integration Hub', href: '/integration-hub', icon: Activity },
        { name: 'Developer', href: '/developer/playground', icon: Terminal },
    ];

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

                {/* Right side actions */}
                <div className="flex items-center gap-4">
                    <div className="hidden sm:flex items-center gap-3 pr-4 border-r border-slate-200">
                        <div className="text-right">
                            <div className="text-sm font-medium text-slate-900">Yusuf Abubakar</div>
                            <div className="text-xs text-slate-500">Admin Workspace</div>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-medium">
                            YA
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
