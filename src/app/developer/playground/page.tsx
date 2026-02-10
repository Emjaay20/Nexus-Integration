'use client';

import { Terminal, Book } from 'lucide-react';
import { PlaygroundRequest } from '@/components/playground/PlaygroundRequest';
import { PlaygroundResponse } from '@/components/playground/PlaygroundResponse';
import { useState } from 'react';

export default function ApiPlaygroundPage() {
    const [response, setResponse] = useState<any>(null);

    const handleResponse = (data: any) => {
        setResponse(data);
    };

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-6xl mx-auto">
                <header className="mb-10">
                    <div className="flex items-center gap-3 text-indigo-600 mb-2">
                        <Terminal className="w-6 h-6" />
                        <span className="font-bold tracking-tight">LUMINOVO DEVELOPER</span>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900">API Playground</h1>
                    <p className="text-slate-500 mt-2 max-w-2xl">
                        Test your integrations in real-time. Requests sent here will trigger events in your
                        <span className="font-medium text-slate-700"> Activity Feed</span>.
                    </p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-250px)] min-h-[600px]">
                    {/* Left Panel: Request Builder */}
                    <div className="flex flex-col gap-6">
                        <PlaygroundRequest onResponse={handleResponse} />

                        {/* Documentation Snippet */}
                        <div className="bg-indigo-50 rounded-xl p-6 border border-indigo-100 flex-1">
                            <h3 className="font-semibold text-indigo-900 flex items-center gap-2 mb-3">
                                <Book className="w-4 h-4" /> Quick Docs
                            </h3>
                            <p className="text-sm text-indigo-800 mb-4">
                                Use this endpoint to simulate incoming webhooks from external providers.
                            </p>

                            <div className="space-y-3">
                                <div>
                                    <div className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-1">Authorization</div>
                                    <code className="text-xs bg-white px-2 py-1 rounded border border-indigo-200 block overflow-hidden text-ellipsis text-indigo-600">
                                        Bearer sk_test_51Mx...
                                    </code>
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-1">Rate Limit</div>
                                    <div className="text-xs text-indigo-700">100 req/min</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel: Response */}
                    <div>
                        <PlaygroundResponse
                            status={response?.status}
                            duration={response?.duration}
                            body={response?.body}
                            error={response?.error}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
