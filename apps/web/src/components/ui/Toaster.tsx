'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import clsx from 'clsx';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
}

interface ToastContextType {
    toast: (type: ToastType, title: string, message?: string) => void;
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within a ToastProvider');
    return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const addToast = useCallback((type: ToastType, title: string, message?: string) => {
        const id = Math.random().toString(36).slice(2, 9);
        setToasts(prev => [...prev.slice(-2), { id, type, title, message }]); // Max 3
        setTimeout(() => removeToast(id), 4000);
    }, [removeToast]);

    const value: ToastContextType = {
        toast: addToast,
        success: (title, msg) => addToast('success', title, msg),
        error: (title, msg) => addToast('error', title, msg),
        info: (title, msg) => addToast('info', title, msg),
    };

    const icons = {
        success: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
        error: <XCircle className="w-5 h-5 text-red-500" />,
        info: <Info className="w-5 h-5 text-blue-500" />,
    };

    const borders = {
        success: 'border-l-emerald-500',
        error: 'border-l-red-500',
        info: 'border-l-blue-500',
    };

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
                <AnimatePresence>
                    {toasts.map(t => (
                        <motion.div
                            key={t.id}
                            initial={{ opacity: 0, x: 80, scale: 0.95 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 80, scale: 0.95 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            className={clsx(
                                'pointer-events-auto flex items-start gap-3 p-4 bg-white rounded-xl border border-slate-200 border-l-4 shadow-lg max-w-sm',
                                borders[t.type]
                            )}
                        >
                            <div className="mt-0.5 shrink-0">{icons[t.type]}</div>
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm text-slate-800">{t.title}</p>
                                {t.message && <p className="text-xs text-slate-500 mt-0.5">{t.message}</p>}
                            </div>
                            <button
                                onClick={() => removeToast(t.id)}
                                className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}
