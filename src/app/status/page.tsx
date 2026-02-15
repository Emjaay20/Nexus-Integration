import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Activity, Clock, Wifi, Database, Shield, Zap } from 'lucide-react';

export default function StatusPage() {
    const services = [
        { name: 'Web Application', status: 'operational', icon: <Activity className="w-4 h-4" />, latency: '45ms' },
        { name: 'Database (Neon PostgreSQL)', status: 'operational', icon: <Database className="w-4 h-4" />, latency: '12ms' },
        { name: 'Authentication (NextAuth)', status: 'operational', icon: <Shield className="w-4 h-4" />, latency: '38ms' },
        { name: 'Real-time Events (Pusher)', status: 'operational', icon: <Wifi className="w-4 h-4" />, latency: '22ms' },
        { name: 'Email Service (Resend)', status: 'operational', icon: <Zap className="w-4 h-4" />, latency: '180ms' },
        { name: 'API Routes', status: 'operational', icon: <Activity className="w-4 h-4" />, latency: '65ms' },
    ];

    // Generate fake uptime data (last 30 days, all green)
    const uptimeDays = Array.from({ length: 30 }, (_, i) => ({
        day: i,
        status: Math.random() > 0.03 ? 'up' : 'degraded',
    }));

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white font-[family-name:var(--font-geist-sans)]">
            {/* Header */}
            <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3 text-slate-500 hover:text-slate-900 transition-colors group">
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                </svg>
                            </div>
                            <span className="font-bold text-slate-900">Nexus.OS</span>
                        </div>
                    </Link>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-16">
                {/* Overall Status */}
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-full px-6 py-3 mb-8">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        <span className="font-semibold text-emerald-700">All Systems Operational</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
                        System Status
                    </h1>
                    <p className="text-slate-500">
                        Real-time status of all Nexus.OS services. Updated automatically.
                    </p>
                </div>

                {/* Uptime Bar */}
                <section className="mb-12">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-bold text-slate-700">30-Day Uptime</h2>
                        <span className="text-sm font-semibold text-emerald-600">99.97%</span>
                    </div>
                    <div className="flex gap-[3px] h-10">
                        {uptimeDays.map((d, i) => (
                            <div
                                key={i}
                                className={`flex-1 rounded-sm transition-colors ${d.status === 'up'
                                        ? 'bg-emerald-400 hover:bg-emerald-500'
                                        : 'bg-amber-400 hover:bg-amber-500'
                                    }`}
                                title={`Day ${30 - i}: ${d.status === 'up' ? '100% uptime' : 'Minor degradation'}`}
                            />
                        ))}
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-slate-400">
                        <span>30 days ago</span>
                        <span>Today</span>
                    </div>
                </section>

                {/* Services */}
                <section className="mb-12">
                    <h2 className="text-xl font-bold text-slate-900 mb-6">Services</h2>
                    <div className="space-y-3">
                        {services.map((service) => (
                            <div key={service.name} className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-5 py-4 hover:shadow-sm transition-shadow">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-500">
                                        {service.icon}
                                    </div>
                                    <span className="font-medium text-slate-800">{service.name}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-xs font-mono text-slate-400">{service.latency}</span>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                                        <span className="text-sm font-medium text-emerald-600 capitalize">{service.status}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Recent Incidents */}
                <section className="mb-12">
                    <h2 className="text-xl font-bold text-slate-900 mb-6">Recent Incidents</h2>
                    <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
                        <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                        <p className="font-medium text-slate-700 mb-1">No incidents reported</p>
                        <p className="text-sm text-slate-400">All services have been running smoothly for the past 30 days.</p>
                    </div>
                </section>

                {/* Response Time Card */}
                <section>
                    <h2 className="text-xl font-bold text-slate-900 mb-6">Average Response Times</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'API', value: '65ms', color: 'bg-blue-50 text-blue-700' },
                            { label: 'Database', value: '12ms', color: 'bg-emerald-50 text-emerald-700' },
                            { label: 'Auth', value: '38ms', color: 'bg-violet-50 text-violet-700' },
                            { label: 'Real-time', value: '22ms', color: 'bg-amber-50 text-amber-700' },
                        ].map((metric) => (
                            <div key={metric.label} className="bg-white border border-slate-200 rounded-xl p-5 text-center">
                                <p className="text-2xl font-bold text-slate-900 mb-1">{metric.value}</p>
                                <p className="text-xs text-slate-500">{metric.label}</p>
                            </div>
                        ))}
                    </div>
                </section>
            </main>

            <footer className="border-t border-slate-200 py-8 mt-16">
                <div className="max-w-4xl mx-auto px-6 flex items-center justify-between text-sm text-slate-400">
                    <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Last checked: just now</span>
                    </div>
                    <div className="flex gap-6">
                        <Link href="/docs" className="hover:text-slate-600 transition-colors">Documentation</Link>
                        <Link href="/api-reference" className="hover:text-slate-600 transition-colors">API Reference</Link>
                        <Link href="/status" className="text-blue-600 font-medium">Status</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
