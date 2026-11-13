import Link from 'next/link';
import { BookOpen, Zap, Upload, BarChart3, Settings, ArrowLeft, Search, LifeBuoy, Terminal, Blocks } from 'lucide-react';
import { helpDocs } from '@/lib/docsData';

export default function HelpCenterPage() {
    return (
        <div className="min-h-screen bg-slate-50 font-[family-name:var(--font-geist-sans)]">
            {/* Header */}
            <header className="bg-slate-900 text-white sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3 text-slate-300 hover:text-white transition-colors group">
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                                <LifeBuoy className="w-4 h-4 text-white" />
                            </div>
                            <span className="font-bold text-white">Lumi Enablement</span>
                        </div>
                    </Link>
                    <Link href="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
                        Sign In →
                    </Link>
                </div>
            </header>

            {/* Hero Section */}
            <div className="bg-slate-900 text-white pt-16 pb-24 px-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                <div className="max-w-3xl mx-auto text-center relative z-10">
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6">
                        How can we help you?
                    </h1>
                    <div className="relative max-w-2xl mx-auto">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input 
                            type="text" 
                            placeholder="Search articles, tutorials, and troubleshooting guides..." 
                            className="w-full bg-white/10 border border-slate-700 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                    </div>
                </div>
            </div>

            <main className="max-w-5xl mx-auto px-6 -mt-12 relative z-20 pb-24">
                {/* Categories */}
                <div className="grid md:grid-cols-3 gap-6 mb-16">
                    <CategoryCard
                        icon={<Upload className="w-6 h-6 text-blue-600" />}
                        title="BOM Importer"
                        description="Learn how to upload, map, and validate your bills of materials."
                        count={12}
                    />
                    <CategoryCard
                        icon={<Blocks className="w-6 h-6 text-indigo-600" />}
                        title="Integrations"
                        description="Connect Shopify, Salesforce, ERPs, and manage webhooks."
                        count={8}
                    />
                    <CategoryCard
                        icon={<BarChart3 className="w-6 h-6 text-emerald-600" />}
                        title="Enablement Metrics"
                        description="Track support resolution, CSAT, and AI deflection."
                        count={5}
                    />
                </div>

                {/* Popular Articles */}
                <section>
                    <div className="flex items-center gap-3 mb-8">
                        <BookOpen className="w-6 h-6 text-slate-700" />
                        <h2 className="text-2xl font-bold text-slate-900">Popular Articles</h2>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                        {helpDocs.map(doc => (
                            <div key={doc.id} className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-md transition-all group cursor-pointer">
                                <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                                    {doc.title}
                                </h3>
                                <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">
                                    {doc.content}
                                </p>
                                <div className="mt-4 flex items-center text-sm font-medium text-blue-600">
                                    Read article <ArrowLeft className="w-4 h-4 ml-1 rotate-180" />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
                
                {/* Developer APIs */}
                <section className="mt-16 bg-white border border-slate-200 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div>
                        <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center mb-4">
                            <Terminal className="w-6 h-6 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Developer API Reference</h2>
                        <p className="text-slate-600 max-w-lg">
                            Building a custom integration? Check out our webhook guides and API reference for developers.
                        </p>
                    </div>
                    <button className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium transition-colors whitespace-nowrap">
                        View API Docs
                    </button>
                </section>
            </main>

            <footer className="border-t border-slate-200 bg-white py-12">
                <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between text-sm text-slate-500 gap-4">
                    <p>&copy; 2026 Lumi Enablement Portal</p>
                    <div className="flex gap-6">
                        <Link href="/docs" className="font-medium text-slate-900">Help Center</Link>
                        <Link href="/integration-hub" className="hover:text-slate-900 transition-colors">Dashboard</Link>
                        <Link href="/status" className="hover:text-slate-900 transition-colors">System Status</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}

function CategoryCard({ icon, title, description, count }: any) {
    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group">
            <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                {icon}
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
            <p className="text-sm text-slate-500 mb-4 h-10">{description}</p>
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                {count} Articles
            </div>
        </div>
    );
}
