'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface EventsChartProps {
    data: { day: string; success: number; failure: number }[];
}

export function EventsChart({ data }: EventsChartProps) {
    // If no real data, show placeholder data
    const chartData = data.length > 0 ? data : generatePlaceholderData();

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Event Volume</h3>
            <p className="text-sm text-slate-500 mb-6">Integration events over the last 30 days</p>

            <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                        <defs>
                            <linearGradient id="successGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="failureGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                        <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#fff',
                                border: '1px solid #e2e8f0',
                                borderRadius: '12px',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
                                fontSize: '13px',
                            }}
                        />
                        <Legend />
                        <Area
                            type="monotone"
                            dataKey="success"
                            stroke="#22c55e"
                            strokeWidth={2}
                            fill="url(#successGradient)"
                            name="Success"
                        />
                        <Area
                            type="monotone"
                            dataKey="failure"
                            stroke="#ef4444"
                            strokeWidth={2}
                            fill="url(#failureGradient)"
                            name="Failures"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

function generatePlaceholderData() {
    const days = ['Jan 14', 'Jan 15', 'Jan 16', 'Jan 17', 'Jan 18', 'Jan 19', 'Jan 20', 'Jan 21', 'Jan 22', 'Jan 23', 'Jan 24', 'Jan 25', 'Jan 26', 'Jan 27'];
    return days.map(day => ({
        day,
        success: Math.floor(Math.random() * 20) + 5,
        failure: Math.floor(Math.random() * 4),
    }));
}
