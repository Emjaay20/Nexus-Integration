'use client';

import { CheckCircle2, Clock, ArrowRight, XCircle, Loader2 } from 'lucide-react';
import clsx from 'clsx';

interface EventTimelineProps {
    status: string;
    time: string;
    duration?: string;
}

export function EventTimeline({ status, time, duration }: EventTimelineProps) {
    const isSuccess = status === 'success';

    const steps = [
        {
            label: 'Received',
            time: time,
            icon: Clock,
            status: 'done' as const,
        },
        {
            label: 'Processing',
            time: duration || '~120ms',
            icon: Loader2,
            status: 'done' as const,
        },
        {
            label: isSuccess ? 'Completed' : 'Failed',
            time: isSuccess ? 'Success' : 'Error',
            icon: isSuccess ? CheckCircle2 : XCircle,
            status: (isSuccess ? 'success' : 'error') as 'success' | 'error',
        },
    ];

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-6">Request Timeline</h3>
            <div className="relative">
                {/* Connector line */}
                <div className="absolute left-5 top-6 bottom-6 w-0.5 bg-slate-200" />

                <div className="space-y-6">
                    {steps.map((step, i) => (
                        <div key={step.label} className="flex items-center gap-4 relative">
                            <div
                                className={clsx(
                                    "w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10",
                                    step.status === 'success' ? 'bg-emerald-100 text-emerald-600' :
                                        step.status === 'error' ? 'bg-red-100 text-red-600' :
                                            'bg-blue-100 text-blue-600'
                                )}
                            >
                                <step.icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-slate-800">{step.label}</p>
                                <p className="text-xs text-slate-500">{step.time}</p>
                            </div>
                            {i < steps.length - 1 && (
                                <ArrowRight className="w-4 h-4 text-slate-300 hidden sm:block" />
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
