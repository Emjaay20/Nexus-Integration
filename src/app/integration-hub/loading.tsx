export default function Loading() {
    return (
        <div className="min-h-screen bg-slate-50 font-[family-name:var(--font-geist-sans)]">
            <div className="p-8 space-y-6 animate-pulse">
                {/* Header skeleton */}
                <div>
                    <div className="h-8 w-48 bg-slate-200 rounded-lg" />
                    <div className="h-4 w-72 bg-slate-100 rounded mt-2" />
                </div>

                {/* Cards skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-white rounded-xl p-6 border border-slate-100">
                            <div className="flex items-center justify-between mb-4">
                                <div className="h-10 w-10 bg-slate-100 rounded-lg" />
                                <div className="h-3 w-16 bg-slate-100 rounded-full" />
                            </div>
                            <div className="h-5 w-32 bg-slate-200 rounded mb-2" />
                            <div className="h-3 w-48 bg-slate-100 rounded" />
                        </div>
                    ))}
                </div>

                {/* Activity feed skeleton */}
                <div className="bg-white rounded-xl p-6 border border-slate-100">
                    <div className="h-6 w-40 bg-slate-200 rounded mb-6" />
                    <div className="space-y-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-center gap-4">
                                <div className="w-2 h-2 rounded-full bg-slate-200" />
                                <div className="h-4 bg-slate-100 rounded flex-1" />
                                <div className="h-4 w-20 bg-slate-100 rounded" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
