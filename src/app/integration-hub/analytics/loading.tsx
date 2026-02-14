export default function Loading() {
    return (
        <div className="min-h-screen bg-slate-50 font-[family-name:var(--font-geist-sans)]">
            <div className="p-8 space-y-6 animate-pulse">
                <div>
                    <div className="h-8 w-36 bg-slate-200 rounded-lg" />
                    <div className="h-4 w-64 bg-slate-100 rounded mt-2" />
                </div>

                {/* KPI cards skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-white rounded-xl p-5 border border-slate-100">
                            <div className="h-3 w-20 bg-slate-100 rounded mb-3" />
                            <div className="h-7 w-16 bg-slate-200 rounded" />
                        </div>
                    ))}
                </div>

                {/* Charts skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-xl p-6 border border-slate-100 h-72" />
                    <div className="bg-white rounded-xl p-6 border border-slate-100 h-72" />
                </div>
            </div>
        </div>
    );
}
