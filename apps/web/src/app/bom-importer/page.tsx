import { ImporterWizard } from "@/components/bom-importer/ImporterWizard";
export default function BOMImporterPage() {
  return (
    <main id="main-content" className="wrap">
      <header className="pagehead">
        <div className="eyebrow">WORKSPACE / IMPORT</div>
        <h1>BOM Importer</h1>
        <p>
          A clean parts list starts here. Upload your file, map the columns, and
          resolve issues before sourcing.
        </p>
      </header>
      <div className="importer-content">
        <ImporterWizard />
      </div>
    </main>
  );
}
