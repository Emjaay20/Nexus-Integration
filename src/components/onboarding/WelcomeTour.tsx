'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, FileSpreadsheet, BarChart3, Code2, ArrowRight, X, Sparkles } from 'lucide-react';

const ONBOARDED_KEY = 'nexus_onboarded';

const slides = [
    {
        icon: <Sparkles className="w-8 h-8 text-indigo-500" />,
        title: 'Welcome to Nexus Integration Hub',
        description: 'Your all-in-one platform for managing supply chain integrations, monitoring activity, and analyzing performance.',
        color: 'bg-indigo-50 border-indigo-200',
    },
    {
        icon: <LayoutGrid className="w-8 h-8 text-emerald-500" />,
        title: 'Integration Dashboard',
        description: 'View all your connected systems at a glance. Monitor health status, uptime, and recent activity for each integration.',
        color: 'bg-emerald-50 border-emerald-200',
    },
    {
        icon: <FileSpreadsheet className="w-8 h-8 text-amber-500" />,
        title: 'Intelligent BOM Importer',
        description: 'Upload CSV or Excel files and let AI auto-map your columns. Validate data quality before import with detailed error reports.',
        color: 'bg-amber-50 border-amber-200',
    },
    {
        icon: <BarChart3 className="w-8 h-8 text-violet-500" />,
        title: 'Analytics & API Playground',
        description: 'Dive deep into performance metrics with interactive charts. Test webhooks in real-time with the API Playground.',
        color: 'bg-violet-50 border-violet-200',
    },
];

export function WelcomeTour() {
    const [isOpen, setIsOpen] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);

    useEffect(() => {
        // Check if user has been onboarded
        if (typeof window !== 'undefined') {
            const onboarded = localStorage.getItem(ONBOARDED_KEY);
            if (!onboarded) {
                // Small delay so the page renders first
                setTimeout(() => setIsOpen(true), 800);
            }
        }
    }, []);

    const handleDismiss = () => {
        localStorage.setItem(ONBOARDED_KEY, 'true');
        setIsOpen(false);
    };

    const handleNext = () => {
        if (currentSlide < slides.length - 1) {
            setCurrentSlide(prev => prev + 1);
        } else {
            handleDismiss();
        }
    };

    if (!isOpen) return null;

    const slide = slides[currentSlide];
    const isLast = currentSlide === slides.length - 1;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
                >
                    {/* Close button */}
                    <div className="flex justify-end p-4 pb-0">
                        <button
                            onClick={handleDismiss}
                            className="text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="px-8 pb-8">
                        <motion.div
                            key={currentSlide}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3 }}
                            className="text-center"
                        >
                            <div className={`w-16 h-16 rounded-2xl ${slide.color} border flex items-center justify-center mx-auto mb-6`}>
                                {slide.icon}
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 mb-3">{slide.title}</h2>
                            <p className="text-sm text-slate-600 leading-relaxed max-w-md mx-auto">{slide.description}</p>
                        </motion.div>

                        {/* Progress dots */}
                        <div className="flex justify-center gap-2 mt-8 mb-6">
                            {slides.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentSlide(i)}
                                    className={`w-2 h-2 rounded-full transition-all ${i === currentSlide
                                            ? 'bg-indigo-600 w-6'
                                            : 'bg-slate-200 hover:bg-slate-300'
                                        }`}
                                />
                            ))}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 justify-center">
                            {currentSlide > 0 && (
                                <button
                                    onClick={() => setCurrentSlide(prev => prev - 1)}
                                    className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                                >
                                    Back
                                </button>
                            )}
                            <button
                                onClick={handleNext}
                                className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                            >
                                {isLast ? 'Get Started' : 'Next'}
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
