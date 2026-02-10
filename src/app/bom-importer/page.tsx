
import { ImporterWizard } from "@/components/bom-importer/ImporterWizard";

export default function BomImporterPage() {
    return (
        <div className="min-h-screen bg-white font-[family-name:var(--font-geist-sans)]">
            <header className="border-b border-slate-100 bg-white/50 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <a href="/" className="font-bold text-xl tracking-tight text-slate-900">
                            Luminovo<span className="text-blue-600">.demo</span>
                        </a>
                        <span className="text-slate-300">/</span>
                        <span className="font-medium text-slate-600">BOM Importer</span>
                    </div>
                    <nav className="flex gap-4 text-sm font-medium text-slate-600">
                        <a href="/" className="hover:text-slate-900">All Apps</a>
                    </nav>
                </div>
            </header>

            <main className="py-12">
                <ImporterWizard />
            </main>
        </div>
    );
}
