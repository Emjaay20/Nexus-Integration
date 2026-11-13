'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface IntegrationHealthProps {
    data: { integration: string; success: number; failure: number; total: number }[];
}

export function IntegrationHealth({ data }: IntegrationHealthProps) {
    const chartData = data.length > 0 ? data : [
        { integration: 'ecommerce-sync', success: 18, failure: 1, total: 19 },
        { integration: 'plm-erp', success: 12, failure: 0, total: 12 },
        { integration: 'crm-updates', success: 8, failure: 3, total: 11 },
        { integration: 'bom-importer', success: 5, failure: 0, total: 5 },
    ];

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Integration Health</h3>
            <p className="text-sm text-slate-500 mb-6">Event distribution per integration</p>

            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis type="number" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                        <YAxis
                            dataKey="integration"
                            type="category"
                            tick={{ fontSize: 11 }}
                            stroke="#94a3b8"
                            width={110}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#fff',
                                border: '1px solid #e2e8f0',
                                borderRadius: '12px',
                                fontSize: '13px',
                            }}
                        />
                        <Bar dataKey="success" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} name="Success" />
                        <Bar dataKey="failure" stackId="a" fill="#ef4444" radius={[0, 4, 4, 0]} name="Failed" />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Health indicators */}
            <div className="mt-4 grid grid-cols-2 gap-2">
                {chartData.map(item => {
                    const healthPct = item.total > 0 ? (item.success / item.total * 100) : 100;
                    return (
                        <div key={item.integration} className="flex items-center justify-between bg-slate-50 rounded-lg p-2.5 text-sm">
                            <span className="text-slate-700 font-medium truncate">{item.integration}</span>
                            <span className={`font-bold ${healthPct >= 95 ? 'text-emerald-600' : healthPct >= 80 ? 'text-amber-600' : 'text-red-600'}`}>
                                {healthPct.toFixed(0)}%
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
