'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, HelpCircle } from 'lucide-react';

const TOUR_STEPS = [
    {
        title: "Welcome to BOM Importer",
        content: "Here you can upload your CSV or Excel files containing Bill of Materials data. We'll automatically map the columns for you.",
        target: "upload-zone",
        position: "bottom"
    },
    {
        title: "Smart Mapping",
        content: "Our AI maps your columns (like 'Part Num' to 'Part Number'). You can adjust them here before validating.",
        target: "mapping-step",
        position: "top"
    },
    {
        title: "Validation Engine",
        content: "We instantly highlight missing quantities, invalid MPNs, or formatting issues so you can fix them before import.",
        target: "validation-step",
        position: "top"
    }
];

export function ProductTour() {
    const [isOpen, setIsOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);

    // Auto-start tour if they haven't seen it
    useEffect(() => {
        const hasSeenTour = localStorage.getItem('nexus-bom-tour');
        if (!hasSeenTour) {
            // Small delay to let page load
            setTimeout(() => setIsOpen(true), 1500);
        }
    }, []);

    const closeTour = () => {
        setIsOpen(false);
        localStorage.setItem('nexus-bom-tour', 'true');
    };

    const nextStep = () => {
        if (currentStep < TOUR_STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            closeTour();
        }
    };

    return (
        <>
            <button 
                onClick={() => setIsOpen(true)}
                className="fixed bottom-24 right-6 w-12 h-12 bg-white text-slate-700 border border-slate-200 rounded-full flex items-center justify-center shadow-md hover:bg-slate-50 transition-colors z-40"
                title="Start Product Tour"
            >
                <HelpCircle size={20} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none">
                        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm pointer-events-auto" onClick={closeTour} />
                        
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: -20 }}
                            transition={{ type: "spring", bounce: 0.4, duration: 0.5 }}
                            className="bg-white rounded-2xl shadow-2xl p-6 w-[400px] relative pointer-events-auto"
                        >
                            <button onClick={closeTour} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors">
                                <X size={18} />
                            </button>
                            
                            <div className="flex gap-1 mb-6">
                                {TOUR_STEPS.map((_, i) => (
                                    <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= currentStep ? 'bg-blue-600' : 'bg-slate-100'}`} />
                                ))}
                            </div>

                            <h3 className="text-xl font-bold text-slate-900 mb-2">{TOUR_STEPS[currentStep].title}</h3>
                            <p className="text-slate-600 mb-8 leading-relaxed">
                                {TOUR_STEPS[currentStep].content}
                            </p>

                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-slate-400">
                                    Step {currentStep + 1} of {TOUR_STEPS.length}
                                </span>
                                <button 
                                    onClick={nextStep}
                                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors"
                                >
                                    {currentStep === TOUR_STEPS.length - 1 ? 'Finish Tour' : 'Next'}
                                    {currentStep !== TOUR_STEPS.length - 1 && <ChevronRight size={16} />}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
