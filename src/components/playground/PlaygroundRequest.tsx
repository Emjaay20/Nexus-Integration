
'use client';

import { useState } from 'react';
import { Play, Loader2 } from 'lucide-react';
import clsx from 'clsx';

interface PlaygroundRequestProps {
    onResponse: (data: any) => void;
}

export function PlaygroundRequest({ onResponse }: PlaygroundRequestProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [method, setMethod] = useState('POST');
    const [endpoint, setEndpoint] = useState('/api/integrations/webhook/trigger');
    const [body, setBody] = useState(`{
  "event": "inventory.update",
  "source": "shopify",
  "payload": {
    "sku": "NEXUS-001",
    "qty": 450
  }
}`);

    const handleSend = async () => {
        setIsLoading(true);

        try {
            const parsedBody = JSON.parse(body);

            const response = await fetch('/api/integrations/webhook/trigger', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    method,
                    endpoint,
                    ...parsedBody
                }),
            });

            const data = await response.json();

            onResponse({
                status: response.status,
                duration: data.data?.duration || '0ms',
                body: JSON.stringify(data, null, 2)
            });
        } catch (error) {
            console.error('Request failed', error);
            onResponse({
                status: 500,
                duration: '0ms',
                error: 'Failed to send request. Check your JSON syntax.',
                body: String(error)
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 p-4 bg-slate-50/50 flex items-center justify-between">
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                    <Play className="w-4 h-4 text-indigo-500" /> Request Builder
                </h2>
                <div className="text-xs font-mono text-slate-400">api.nexus.com/v1</div>
            </div>

            <div className="p-6 space-y-6">
                {/* Method & Endpoint */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Endpoint</label>
                    <div className="flex rounded-md shadow-sm">
                        <select
                            value={method}
                            onChange={(e) => setMethod(e.target.value)}
                            className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-slate-300 bg-slate-50 text-slate-700 text-sm font-bold focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option>POST</option>
                            <option>GET</option>
                        </select>
                        <input
                            type="text"
                            value={endpoint}
                            onChange={(e) => setEndpoint(e.target.value)}
                            className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-slate-300 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-mono text-slate-600"
                        />
                    </div>
                </div>

                {/* Body Editor */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Request Body (JSON)</label>
                    <div className="relative">
                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 font-mono text-sm min-h-[200px] p-4 bg-slate-900 text-slate-50"
                            spellCheck={false}
                        />
                    </div>
                </div>

                <button
                    onClick={handleSend}
                    disabled={isLoading}
                    className={clsx(
                        "w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white transition-all",
                        isLoading ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    )}
                >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    {isLoading ? 'Sending Request...' : 'Send Request'}
                </button>
            </div>
        </section>
    );
}
