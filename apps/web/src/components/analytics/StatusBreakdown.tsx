'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface StatusBreakdownProps {
    data: { name: string; value: number; color: string }[];
}

export function StatusBreakdown({ data }: StatusBreakdownProps) {
    const chartData = data.length > 0 ? data : [
        { name: 'Success', value: 42, color: '#22c55e' },
        { name: 'Failed', value: 3, color: '#ef4444' },
    ];

    const total = chartData.reduce((sum, d) => sum + d.value, 0);

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Status Breakdown</h3>
            <p className="text-sm text-slate-500 mb-6">Success vs failure ratio</p>

            <div className="h-56 flex items-center">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={3}
                            dataKey="value"
                            strokeWidth={0}
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#fff',
                                border: '1px solid #e2e8f0',
                                borderRadius: '12px',
                                fontSize: '13px',
                            }}
                            formatter={(value: number | undefined) => [`${value ?? 0} events`, '']}
                        />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            {/* Summary */}
            <div className="mt-4 flex justify-center gap-8">
                {chartData.map(d => (
                    <div key={d.name} className="text-center">
                        <p className="text-2xl font-bold" style={{ color: d.color }}>{d.value}</p>
                        <p className="text-xs text-slate-500">{d.name} ({total > 0 ? ((d.value / total) * 100).toFixed(0) : 0}%)</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
