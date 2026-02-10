
'use client';

import { Activity, LayoutGrid, Settings, Box } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function IntegrationHubLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    return (
        <div className="min-h-screen bg-slate-50 flex font-[family-name:var(--font-geist-sans)]">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col fixed top-16 bottom-0 z-10 border-t border-slate-800">
                <div className="p-6 border-b border-slate-800">
                    <span className="font-bold text-sm text-slate-400 uppercase tracking-wider">
                        Integration Hub
                    </span>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    <NavItem
                        icon={<LayoutGrid className="w-5 h-5" />}
                        label="Dashboard"
                        href="/integration-hub"
                        active={pathname === '/integration-hub'}
                    />
                    <NavItem
                        icon={<Activity className="w-5 h-5" />}
                        label="Activity Logs"
                        href="/integration-hub/logs"
                        active={pathname?.startsWith('/integration-hub/logs')}
                    />
                    <NavItem
                        icon={<Settings className="w-5 h-5" />}
                        label="Settings"
                        href="/integration-hub/settings"
                        active={pathname?.startsWith('/integration-hub/settings')}
                    />
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold">JD</div>
                        <div className="text-sm">
                            <div className="text-white font-medium">Forward Deployed</div>
                            <div className="text-xs text-slate-500">Admin</div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-64">
                {children}
            </main>
        </div>
    );
}

function NavItem({ icon, label, href, active }: { icon: React.ReactNode, label: string, href: string, active?: boolean }) {
    return (
        <Link href={href} className={`
            flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
            ${active ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'}
        `}>
            {icon}
            {label}
        </Link>
    )
}
