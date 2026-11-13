'use client';

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { TrendingUp, Users, MessageSquare, Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const responseTimeData = [
    { day: 'Mon', time: 15 },
    { day: 'Tue', time: 14 },
    { day: 'Wed', time: 12 },
    { day: 'Thu', time: 8 },
    { day: 'Fri', time: 5 },
    { day: 'Sat', time: 4 },
    { day: 'Sun', time: 2 },
];

const resolutionData = [
    { name: 'AI Deflected', value: 68 },
    { name: 'Human Handled', value: 32 },
];
const COLORS = ['#3b82f6', '#94a3b8'];

const volumeData = [
    { day: 'Mon', tickets: 120 },
    { day: 'Tue', tickets: 132 },
    { day: 'Wed', tickets: 101 },
    { day: 'Thu', tickets: 134 },
    { day: 'Fri', tickets: 90 },
    { day: 'Sat', tickets: 40 },
    { day: 'Sun', tickets: 30 },
];

export default function EnablementMetricsPage() {
    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">Enablement Metrics</h1>
                <p className="text-slate-500 text-sm mt-1">Track support performance, AI deflection rates, and customer satisfaction.</p>
            </div>

            {/* Top Scorecards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 text-slate-500 mb-2">
                        <Clock size={18} className="text-blue-500" />
                        <span className="text-sm font-medium">First Response Time</span>
                    </div>
                    <div className="flex items-end justify-between">
                        <span className="text-3xl font-semibold text-slate-800">2.4m</span>
                        <span className="text-sm text-green-500 flex items-center bg-green-50 px-2 py-0.5 rounded-full"><ArrowDownRight size={14} /> 12%</span>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 text-slate-500 mb-2">
                        <Bot size={18} className="text-indigo-500" />
                        <span className="text-sm font-medium">AI Deflection Rate</span>
                    </div>
                    <div className="flex items-end justify-between">
                        <span className="text-3xl font-semibold text-slate-800">68%</span>
                        <span className="text-sm text-green-500 flex items-center bg-green-50 px-2 py-0.5 rounded-full"><ArrowUpRight size={14} /> 5%</span>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 text-slate-500 mb-2">
                        <MessageSquare size={18} className="text-orange-500" />
                        <span className="text-sm font-medium">Weekly Volume</span>
                    </div>
                    <div className="flex items-end justify-between">
                        <span className="text-3xl font-semibold text-slate-800">647</span>
                        <span className="text-sm text-slate-400">tickets</span>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 text-slate-500 mb-2">
                        <TrendingUp size={18} className="text-emerald-500" />
                        <span className="text-sm font-medium">CSAT Score</span>
                    </div>
                    <div className="flex items-end justify-between">
                        <span className="text-3xl font-semibold text-slate-800">4.8</span>
                        <span className="text-sm text-slate-400">/ 5.0</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Response Time Chart */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2">
                    <h2 className="text-lg font-semibold mb-4">First Response Time (mins)</h2>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={responseTimeData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                                <RechartsTooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Line type="monotone" dataKey="time" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Deflection Chart */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                    <h2 className="text-lg font-semibold mb-4">Resolution Source</h2>
                    <div className="flex-1 min-h-[250px] relative flex flex-col justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={resolutionData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={90}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {resolutionData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none flex-col">
                            <span className="text-3xl font-bold text-slate-800">68%</span>
                            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">AI Deflected</span>
                        </div>
                    </div>
                    <div className="mt-4 flex justify-center gap-6">
                        {resolutionData.map((entry, index) => (
                            <div key={entry.name} className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                                <span className="text-sm text-slate-600">{entry.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
                
                {/* Volume Chart */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-3">
                    <h2 className="text-lg font-semibold mb-4">Support Ticket Volume</h2>
                    <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={volumeData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                                <RechartsTooltip 
                                    cursor={{ fill: '#f1f5f9' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="tickets" fill="#0ea5e9" radius={[4, 4, 0, 0]} maxBarSize={50} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Quick missing import for Bot icon
import { Bot } from 'lucide-react';
