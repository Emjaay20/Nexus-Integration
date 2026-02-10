
import { FileSpreadsheet, Activity, Terminal, ArrowRight, Github, Linkedin, Mail } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 font-[family-name:var(--font-geist-sans)]">
      {/* Hero Section */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl md:text-6xl mb-6">
              Engineering the Future of <span className="text-blue-600">Connected Supply Chains</span>
            </h1>
            <p className="mt-4 text-xl text-slate-500 max-w-2xl">
              Hi, I'm a Forward Deployed Engineer candidate. This portfolio demonstrates my ability to solve complex integration challenges, build intuitive tools, and scale technical solutions.
            </p>
            <div className="mt-8 flex gap-4">
              <a href="mailto:hello@example.com" className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                Contact Me
              </a>
              <a href="#" className="inline-flex items-center justify-center px-5 py-3 border border-slate-200 text-base font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50">
                <Github className="w-5 h-5 mr-2" /> View Code
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Projects Grid */}
      <main className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

          {/* Project 1: BOM Importer */}
          <ProjectCard
            title="Intelligent BOM Importer"
            description="A smart tool to ingest, map, and validate messy customer Bill of Materials files. Solves the first mile of supply chain digitization."
            icon={<FileSpreadsheet className="w-8 h-8 text-blue-600" />}
            href="/bom-importer"
            status="Complete"
            tags={['Data Parsing', 'Validation', 'UX']}
          />

          {/* Project 2: Integration Hub */}
          <ProjectCard
            title="Integration Hub"
            description="Visual dashboard for managing mission-critical data flows between customer ERPs and our platform. Monitor sync health in real-time."
            icon={<Activity className="w-8 h-8 text-indigo-600" />}
            href="/integration-hub"
            status="In Progress"
            tags={['System Design', 'Monitoring', 'Webhooks']}
            isNext
          />

          {/* Project 3: API Developer Portal */}
          <ProjectCard
            title="Developer API Portal"
            description="A rigorous documentation hub and SDK wrapper to empower external developers to build on top of our ecosystem."
            icon={<Terminal className="w-8 h-8 text-emerald-600" />}
            href="/developer/playground"
            status="Beta"
            tags={['DX', 'Documentation', 'SDK']}
          />

        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">
          <p className="text-slate-400">Created for Nexus-Integration • 2026</p>
        </div>
      </footer>
    </div>
  );
}

function ProjectCard({ title, description, icon, href, status, tags, isNext }: any) {
  return (
    <a href={href} className="group relative bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col h-full">
      {isNext && (
        <div className="absolute top-0 right-0 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
          NEXT PROJECT
        </div>
      )}
      <div className="p-8 flex-1">
        <div className="w-14 h-14 bg-slate-50 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-slate-100">
          {icon}
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors">
          {title}
        </h3>
        <p className="text-slate-500 leading-relaxed mb-6">
          {description}
        </p>
        <div className="flex flex-wrap gap-2 mt-auto">
          {tags.map((tag: string) => (
            <span key={tag} className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-medium">
              {tag}
            </span>
          ))}
        </div>
      </div>
      <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-sm font-medium">
        <span className={`
            flex items-center gap-1.5
            ${status === 'Complete' ? 'text-green-600' : status === 'In Progress' ? 'text-indigo-600' : 'text-slate-400'}
         `}>
          <span className={`w-2 h-2 rounded-full ${status === 'Complete' ? 'bg-green-600' : status === 'In Progress' ? 'bg-indigo-600 animate-pulse' : 'bg-slate-300'}`} />
          {status}
        </span>
        <span className="text-slate-400 group-hover:text-slate-900 flex items-center gap-1 transition-colors">
          View App <ArrowRight className="w-4 h-4" />
        </span>
      </div>
    </a>
  );
}
