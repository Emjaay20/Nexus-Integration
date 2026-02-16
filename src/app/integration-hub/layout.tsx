'use client';

import { Activity, LayoutGrid, Settings, ChevronLeft, ChevronRight, BarChart3, Menu, X, Blocks } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import clsx from 'clsx';
import { WelcomeTour } from '@/components/onboarding/WelcomeTour';

export default function IntegrationHubLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    // Close mobile sidebar on route change
    useEffect(() => {
        setIsMobileOpen(false);
    }, [pathname]);

    // Prevent body scroll when mobile sidebar is open
    useEffect(() => {
        if (isMobileOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isMobileOpen]);

    return (
        <div className="min-h-screen bg-slate-50 flex font-[family-name:var(--font-geist-sans)]">
            <WelcomeTour />

            {/* Mobile menu button */}
            <button
                onClick={() => setIsMobileOpen(true)}
                className="lg:hidden fixed top-[1.125rem] left-4 z-30 p-2 rounded-lg bg-white border border-slate-200 shadow-sm text-slate-600 hover:text-slate-900 transition-colors"
                aria-label="Open navigation"
            >
                <Menu className="w-5 h-5" />
            </button>

            {/* Mobile backdrop */}
            {isMobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/40 z-30 backdrop-blur-sm"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={clsx(
                    "bg-slate-900 text-slate-300 flex flex-col fixed top-16 bottom-0 border-t border-slate-800 transition-all duration-300",
                    // Desktop behavior
                    "max-lg:translate-x-[-100%] max-lg:z-40 max-lg:w-64 max-lg:top-0",
                    isMobileOpen && "max-lg:translate-x-0",
                    // Desktop collapse/expand
                    "lg:z-10",
                    isCollapsed ? "lg:w-16" : "lg:w-64"
                )}
            >
                {/* Mobile close button */}
                <div className="lg:hidden p-4 border-b border-slate-800 flex justify-between items-center h-16">
                    <span className="font-bold text-sm text-white uppercase tracking-wider">Nexus</span>
                    <button
                        onClick={() => setIsMobileOpen(false)}
                        className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Desktop header */}
                <div className="hidden lg:flex p-4 border-b border-slate-800 justify-between items-center h-14">
                    {!isCollapsed && (
                        <span className="font-bold text-sm text-slate-400 uppercase tracking-wider whitespace-nowrap">
                            Integration Hub
                        </span>
                    )}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors ml-auto"
                    >
                        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                    </button>
                </div>

                <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
                    <NavItem
                        icon={<LayoutGrid className="w-5 h-5" />}
                        label="Dashboard"
                        href="/integration-hub"
                        active={pathname === '/integration-hub'}
                        collapsed={isCollapsed}
                    />
                    <NavItem
                        icon={<Activity className="w-5 h-5" />}
                        label="Activity Logs"
                        href="/integration-hub/logs"
                        active={pathname?.startsWith('/integration-hub/logs')}
                        collapsed={isCollapsed}
                    />
                    <NavItem
                        icon={<BarChart3 className="w-5 h-5" />}
                        label="Analytics"
                        href="/integration-hub/analytics"
                        active={pathname?.startsWith('/integration-hub/analytics')}
                        collapsed={isCollapsed}
                    />
                    <NavItem
                        icon={<Blocks className="w-5 h-5" />}
                        label="Connectors"
                        href="/integration-hub/connectors"
                        active={pathname?.startsWith('/integration-hub/connectors')}
                        collapsed={isCollapsed}
                    />
                    <NavItem
                        icon={<Settings className="w-5 h-5" />}
                        label="Settings"
                        href="/integration-hub/settings"
                        active={pathname?.startsWith('/integration-hub/settings')}
                        collapsed={isCollapsed}
                    />
                </nav>

                <div className={clsx("p-4 border-t border-slate-800 transition-all", isCollapsed && "lg:items-center lg:justify-center lg:p-2")}>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold shrink-0">JD</div>
                        {(!isCollapsed || isMobileOpen) && (
                            <div className="text-sm overflow-hidden">
                                <div className="text-white font-medium truncate">Forward Deployed</div>
                                <div className="text-xs text-slate-500">Admin</div>
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main
                className={clsx(
                    "flex-1 transition-all duration-300",
                    // No margin on mobile (sidebar overlays)
                    "lg:ml-64",
                    isCollapsed && "lg:ml-16"
                )}
            >
                {children}
            </main>
        </div>
    );
}

function NavItem({ icon, label, href, active, collapsed }: { icon: React.ReactNode, label: string, href: string, active?: boolean, collapsed: boolean }) {
    return (
        <Link
            href={href}
            className={clsx(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors group relative",
                active ? 'bg-blue-500/10 text-blue-400' : 'text-slate-400 hover:text-white hover:bg-slate-800',
                collapsed ? "justify-center" : ""
            )}
            title={collapsed ? label : undefined}
        >
            <span className="shrink-0">{icon}</span>
            {!collapsed && <span className="truncate">{label}</span>}

            {/* Tooltip for collapsed state */}
            {collapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                    {label}
                </div>
            )}
        </Link>
    )
}
