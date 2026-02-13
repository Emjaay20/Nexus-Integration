'use client';

import { useState } from 'react';
import { RotateCcw, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/Toaster';
import { useRouter } from 'next/navigation';

export function ResetDataButton() {
    const [showModal, setShowModal] = useState(false);
    const [action, setAction] = useState<'reset' | 'clear'>('reset');
    const [loading, setLoading] = useState(false);
    const { success, error } = useToast();
    const router = useRouter();

    const handleAction = async () => {
        setLoading(true);
        try {
            const endpoint = action === 'reset' ? '/api/user/reset' : '/api/user/clear';
            const res = await fetch(endpoint, { method: 'POST' });
            if (!res.ok) throw new Error('Failed');

            success(
                action === 'reset' ? 'Demo data restored' : 'All data cleared',
                action === 'reset'
                    ? 'Your dashboard has been populated with sample data.'
                    : 'You can now upload your own files and create your own data.'
            );
            setShowModal(false);
            router.refresh();
        } catch (err) {
            error('Action failed', 'Please try again or contact support.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Data Management Section */}
            <div className="mt-10 pt-8 border-t border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Data Management</h3>
                <p className="text-sm text-slate-500 mb-6">
                    Reset your data to explore the demo again, or clear everything to start fresh with your own files.
                </p>

                <div className="flex flex-wrap gap-4">
                    <button
                        onClick={() => { setAction('reset'); setShowModal(true); }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Reset to Demo Data
                    </button>

                    <button
                        onClick={() => { setAction('clear'); setShowModal(true); }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                        Clear All Data
                    </button>
                </div>
            </div>

            {/* Confirmation Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 animate-in fade-in zoom-in-95">
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${action === 'reset' ? 'bg-indigo-100' : 'bg-red-100'
                                }`}>
                                <AlertTriangle className={`w-5 h-5 ${action === 'reset' ? 'text-indigo-600' : 'text-red-600'
                                    }`} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">
                                {action === 'reset' ? 'Reset to Demo Data?' : 'Clear All Data?'}
                            </h3>
                        </div>

                        <p className="text-sm text-slate-600 mb-6">
                            {action === 'reset'
                                ? 'This will delete all your current data and restore the sample demo data. Your integrations, logs, BOM imports, and settings will be replaced.'
                                : 'This will permanently delete all your data including integrations, activity logs, BOM imports, and settings. Your dashboard will be empty afterward.'
                            }
                        </p>

                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowModal(false)}
                                disabled={loading}
                                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAction}
                                disabled={loading}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${action === 'reset'
                                        ? 'bg-indigo-600 hover:bg-indigo-700'
                                        : 'bg-red-600 hover:bg-red-700'
                                    } disabled:opacity-50`}
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                {action === 'reset' ? 'Reset Data' : 'Clear Everything'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
