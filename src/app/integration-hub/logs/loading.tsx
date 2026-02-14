export default function Loading() {
    return (
        <div className="min-h-screen bg-slate-50 font-[family-name:var(--font-geist-sans)]">
            <div className="p-8 space-y-6 animate-pulse">
                <div>
                    <div className="h-8 w-44 bg-slate-200 rounded-lg" />
                    <div className="h-4 w-56 bg-slate-100 rounded mt-2" />
                </div>

                {/* Log entries skeleton */}
                <div className="bg-white rounded-xl border border-slate-100 divide-y divide-slate-50">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="p-4 flex items-center gap-4">
                            <div className="w-2 h-2 rounded-full bg-slate-200 shrink-0" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-slate-200 rounded w-2/3" />
                                <div className="h-3 bg-slate-100 rounded w-1/3" />
                            </div>
                            <div className="h-6 w-16 bg-slate-100 rounded-full" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
