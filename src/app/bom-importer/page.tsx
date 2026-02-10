
import { ImporterWizard } from "@/components/bom-importer/ImporterWizard";

export default function BomImporterPage() {
    return (
        <div className="min-h-screen bg-white font-[family-name:var(--font-geist-sans)]">
            {/* Header removed in favor of global Navbar */}

            <main className="py-12">
                <ImporterWizard />
            </main>
        </div>
    );
}
