"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, X, Loader2, CheckCircle2, Info } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns/format';
import { isPast } from 'date-fns/isPast';
import { isToday } from 'date-fns/isToday';
import { startOfDay } from 'date-fns/startOfDay';
import api from '@/lib/axios';
import { toast } from 'react-hot-toast';
import 'react-day-picker/dist/style.css';

interface WFHModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    existingWfhDates?: Date[];
}

export default function WFHModal({ isOpen, onClose, onSuccess, existingWfhDates = [] }: WFHModalProps) {
    const [selectedDates, setSelectedDates] = useState<Date[]>([]);
    const [loading, setLoading] = useState(false);

    // Style for the calendar
    const calendarStyles = `
        .rdp {
            --rdp-cell-size: 40px;
            --rdp-accent-color: #101828;
            --rdp-background-color: #f3f4f6;
            margin: 0;
            width: 100%;
        }
        .rdp-day_selected:not([disabled]) { 
            background-color: var(--rdp-accent-color);
            color: white;
            border-radius: 8px;
            font-weight: bold;
        }
        .rdp-day_selected:hover:not([disabled]) { 
            background-color: #1d2939;
        }
        .rdp-day_applied { 
            color: #059669; 
            font-weight: bold;
            background-color: #ecfdf5;
            border: 2px solid #10b981;
            border-radius: 8px;
        }
        .rdp-day_today { 
            color: #059669;
            font-weight: 800;
            text-decoration: underline;
        }
        .rdp-button:hover:not([disabled]):not(.rdp-day_selected) {
            background-color: #f9fafb;
            border-radius: 8px;
        }
        .rdp-day_disabled { 
            opacity: 0.25; 
        }
    `;

    const handleApply = async () => {
        if (selectedDates.length === 0) {
            toast.error("Please select at least one date");
            return;
        }

        setLoading(true);
        try {
            await api.post('/wfh/apply', {
                wfhDates: selectedDates.map(d => format(d, 'yyyy-MM-dd'))
            });
            toast.success("WFH Applied Successfully!");
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to apply WFH");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                <style>{calendarStyles}</style>
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                />
                
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-[#E6E8EC]"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-[#E6E8EC]">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                                    <CalendarIcon size={20} />
                                </div>
                                <div>
                                    <h2 className="text-[18px] font-bold text-[#101828]">Remote Application</h2>
                                    <p className="text-[12px] text-[#667085]">Select your work-from-home dates.</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-lg text-[#667085] transition-all">
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col items-center">
                            <DayPicker
                                mode="multiple"
                                selected={selectedDates}
                                onSelect={(dates: Date[] | undefined) => setSelectedDates(dates || [])}
                                modifiers={{ applied: existingWfhDates }}
                                modifiersClassNames={{ applied: 'rdp-day_applied' }}
                                disabled={[
                                    { before: startOfDay(new Date()) }
                                ]}
                                className="border-none"
                            />
                        </div>

                        <div className="mt-4 flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                            <Info size={16} className="text-amber-600 mt-0.5" />
                            <p className="text-[11px] text-amber-800 leading-normal">
                                Past dates and currently registered WFH days are disabled. Note: WFH status skips biometric validation but still tracks against your usage limit.
                            </p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 bg-slate-50 border-t border-[#E6E8EC] flex gap-3">
                        <button onClick={onClose} className="btn-secondary flex-1 py-3 text-[14px]">
                            Cancel
                        </button>
                        <button 
                            onClick={handleApply} 
                            disabled={loading || selectedDates.length === 0}
                            className="btn-primary flex-1 py-3 text-[14px] flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <><CheckCircle2 size={18} /> Confirm</>}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
