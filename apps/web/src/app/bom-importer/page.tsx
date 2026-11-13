import { FileSpreadsheet } from "lucide-react";
import { ImporterWizard } from "@/components/bom-importer/ImporterWizard";
import { ProductTour } from "@/components/bom-importer/ProductTour";

export default function BOMImporterPage() {
    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <FileSpreadsheet className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">BOM Importer</h1>
                    <p className="text-slate-500">Upload, map, and validate your Bill of Materials.</p>
                </div>
            </div>

            <ImporterWizard />
            <ProductTour />
        </div>
    );
}
