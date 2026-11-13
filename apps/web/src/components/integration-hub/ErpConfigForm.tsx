'use client';

import { useState } from 'react';
import { Save, Link, Lock, Loader2, Workflow, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { configureErp } from '@/actions/erp-actions';

export function ErpConfigForm({ integrationId, initialConfig }: { integrationId: string, initialConfig?: any }) {
    const [endpoint, setEndpoint] = useState(initialConfig?.api_endpoint || '');
    const [authHeader, setAuthHeader] = useState(initialConfig?.auth_header || '');
    const [isSaving, setIsSaving] = useState(false);
    const [lastTestResult, setLastTestResult] = useState<boolean | null>(null);

    const handleSave = async () => {
        setIsSaving(true);
        setLastTestResult(null);

        try {
            const formData = new FormData();
            formData.append('integrationId', integrationId);
            formData.append('endpoint', endpoint);
            formData.append('authHeader', authHeader);

            const result = await configureErp(formData);

            if (result.success) {
                toast.success('Configuration saved');
                setLastTestResult(true);
            } else {
                toast.error(result.error || 'Failed to save');
                setLastTestResult(false);
            }
        } catch (error) {
            toast.error('An unexpected error occurred');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Workflow className="w-5 h-5 text-indigo-600" /> Connection Details
            </h3>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        API Endpoint URL
                    </label>
                    <div className="relative">
                        <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="url"
                            value={endpoint}
                            onChange={(e) => setEndpoint(e.target.value)}
                            placeholder="https://api.my-erp.com/v1/webhook"
                            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                        We will POST webhook events to this URL.
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        Authorization Header
                    </label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="password"
                            value={authHeader}
                            onChange={(e) => setAuthHeader(e.target.value)}
                            placeholder="Bearer sk_test_..."
                            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                        />
                    </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                    {lastTestResult === true && (
                        <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Connection Verified
                        </span>
                    )}
                    {lastTestResult === false && (
                        <span className="text-xs text-red-600 font-medium">
                            Connection Failed
                        </span>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={isSaving || !endpoint}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save & Test
                    </button>
                </div>
            </div>
        </div>
    );
}
