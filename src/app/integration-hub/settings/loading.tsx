export default function Loading() {
    return (
        <div className="min-h-screen bg-slate-50 font-[family-name:var(--font-geist-sans)]">
            <div className="p-8 space-y-6 animate-pulse">
                <div>
                    <div className="h-8 w-32 bg-slate-200 rounded-lg" />
                    <div className="h-4 w-52 bg-slate-100 rounded mt-2" />
                </div>

                {/* Settings form skeleton */}
                <div className="bg-white rounded-xl p-6 border border-slate-100 max-w-2xl space-y-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="space-y-2">
                            <div className="h-4 w-28 bg-slate-200 rounded" />
                            <div className="h-10 bg-slate-100 rounded-lg" />
                        </div>
                    ))}
                    <div className="h-10 w-32 bg-slate-200 rounded-lg mt-4" />
                </div>
            </div>
        </div>
    );
}
