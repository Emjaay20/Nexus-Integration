
import clsx from 'clsx';
import { Copy, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface PlaygroundResponseProps {
    status?: number;
    duration?: string;
    body?: string; // JSON string
    error?: string;
}

export function PlaygroundResponse({ status, duration, body, error }: PlaygroundResponseProps) {
    if (!status && !error) {
        return (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm font-medium border-2 border-dashed border-slate-200 rounded-lg p-8">
                Send a request to see the response here
            </div>
        );
    }

    const isSuccess = status && status >= 200 && status < 300;

    return (
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
            <div className="border-b border-slate-100 p-4 bg-slate-50/50 flex items-center justify-between shrink-0">
                <h2 className="font-semibold text-slate-900">Response</h2>
                {status && (
                    <div className="flex items-center gap-4 text-xs font-mono">
                        <span className={clsx(
                            "px-2 py-0.5 rounded font-bold",
                            isSuccess ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        )}>
                            {status} {isSuccess ? 'OK' : 'Error'}
                        </span>
                        <span className="flex items-center gap-1 text-slate-500">
                            <Clock className="w-3 h-3" /> {duration}
                        </span>
                    </div>
                )}
            </div>

            <div className="relative flex-1 bg-slate-900 text-slate-50 p-4 font-mono text-xs overflow-auto">
                <button className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded bg-slate-800 hover:bg-slate-700 transition">
                    <Copy className="w-4 h-4" />
                </button>
                <pre>
                    {error ? error : body}
                </pre>
            </div>
        </section>
    );
}
