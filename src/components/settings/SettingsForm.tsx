'use client';

import { useState } from 'react';
import { Save, Bell, Shield, Database, RotateCw, Loader2 } from 'lucide-react';
import { updateSettings, rotateApiKey } from '@/actions/settings';
import { useRouter } from 'next/navigation';

interface SettingsProps {
    initialSettings: {
        id: number;
        api_key: string;
        email_alerts: boolean;
        slack_alerts: boolean;
        retention_days: number;
    }
}

export function SettingsForm({ initialSettings }: SettingsProps) {
    const router = useRouter();
    const [settings, setSettings] = useState(initialSettings);
    const [isSaving, setIsSaving] = useState(false);
    const [isRotating, setIsRotating] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        await updateSettings({
            email_alerts: settings.email_alerts,
            slack_alerts: settings.slack_alerts,
            retention_days: settings.retention_days
        });
        setIsSaving(false);
        router.refresh();
    };

    const handleRotateKey = async () => {
        if (!confirm('Are you sure? This will invalidate the old key immediately.')) return;

        setIsRotating(true);
        const result = await rotateApiKey();
        if (result.success && result.apiKey) {
            setSettings(prev => ({ ...prev, api_key: result.apiKey }));
        }
        setIsRotating(false);
        router.refresh();
    };

    return (
        <div className="p-8">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
                    <p className="text-slate-500">Manage your integration configurations.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 rounded-lg text-sm font-medium text-white hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
                >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            </header>

            <div className="space-y-6 max-w-2xl">
                {/* Notification Settings */}
                <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <Bell className="w-5 h-5 text-slate-400" /> Notifications
                    </h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-medium text-slate-900">Email Alerts</h3>
                                <p className="text-sm text-slate-500">Receive emails when integrations fail.</p>
                            </div>
                            <Toggle
                                checked={settings.email_alerts}
                                onChange={(checked) => setSettings({ ...settings, email_alerts: checked })}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-medium text-slate-900">Slack Notifications</h3>
                                <p className="text-sm text-slate-500">Post updates to a dedicated Slack channel.</p>
                            </div>
                            <Toggle
                                checked={settings.slack_alerts}
                                onChange={(checked) => setSettings({ ...settings, slack_alerts: checked })}
                            />
                        </div>
                    </div>
                </section>

                {/* API Access */}
                <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-slate-400" /> API Access
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">API Key</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={settings.api_key}
                                    readOnly
                                    className="flex-1 px-3 py-2 border border-slate-300 rounded-md bg-slate-50 text-slate-600 font-mono text-sm"
                                />
                                <button
                                    onClick={handleRotateKey}
                                    disabled={isRotating}
                                    className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-md text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
                                >
                                    {isRotating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCw className="w-3 h-3" />}
                                    Rotate
                                </button>
                            </div>
                            <p className="mt-2 text-xs text-slate-500">
                                This key allows external systems to send webhooks to your integration hub. Keep it secret.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Data Retention */}
                <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <Database className="w-5 h-5 text-slate-400" /> Data Retention
                    </h2>
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-medium text-slate-900">Log Retention</h3>
                            <p className="text-sm text-slate-500">How long to keep detailed integration logs.</p>
                        </div>
                        <select
                            value={settings.retention_days}
                            onChange={(e) => setSettings({ ...settings, retention_days: parseInt(e.target.value) })}
                            className="px-3 py-2 border border-slate-300 rounded-md text-sm bg-white"
                        >
                            <option value={30}>30 Days</option>
                            <option value={60}>60 Days</option>
                            <option value={90}>90 Days</option>
                            <option value={365}>1 Year</option>
                        </select>
                    </div>
                </section>
            </div>
        </div>
    );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
    return (
        <label className="relative inline-flex items-center cursor-pointer">
            <input
                type="checkbox"
                className="sr-only peer"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
        </label>
    );
}
