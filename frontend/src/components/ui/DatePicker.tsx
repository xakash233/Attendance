"use client";

import React, { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns/format';
import { addMonths } from 'date-fns/addMonths';
import { subMonths } from 'date-fns/subMonths';
import { startOfMonth } from 'date-fns/startOfMonth';
import { endOfMonth } from 'date-fns/endOfMonth';
import { startOfWeek } from 'date-fns/startOfWeek';
import { endOfWeek } from 'date-fns/endOfWeek';
import { isSameMonth } from 'date-fns/isSameMonth';
import { isSameDay } from 'date-fns/isSameDay';
import { addDays } from 'date-fns/addDays';
import { eachDayOfInterval } from 'date-fns/eachDayOfInterval';
import { parseISO } from 'date-fns/parseISO';
import { isValid } from 'date-fns/isValid';
import { isBefore } from 'date-fns/isBefore';
import { startOfToday } from 'date-fns/startOfToday';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface DatePickerProps {
    date: string; // ISO format
    onChange: (date: string) => void;
    label?: string;
    placeholder?: string;
    required?: boolean;
    disablePast?: boolean;
}

export default function DatePicker({ date, onChange, label, placeholder = "Select date", required, disablePast = true }: DatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(new Date());
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedDate = date && isValid(parseISO(date)) ? parseISO(date) : null;

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const renderHeader = () => {
        return (
            <div className="flex items-center justify-between px-3 py-2 border-b border-black/5 bg-neutral-50/30">
                <button
                    type="button"
                    onClick={() => setViewDate(subMonths(viewDate, 1))}
                    className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors"
                >
                    <ChevronLeft size={14} />
                </button>
                <span className="text-[10px] font-black uppercase tracking-[0.1em] text-black">
                    {format(viewDate, 'MMMM yyyy')}
                </span>
                <button
                    type="button"
                    onClick={() => setViewDate(addMonths(viewDate, 1))}
                    className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors"
                >
                    <ChevronRight size={14} />
                </button>
            </div>
        );
    };

    const renderDays = () => {
        const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
        return (
            <div className="grid grid-cols-7 mb-2 px-2">
                {days.map((day) => (
                    <div key={day} className="text-center text-[9px] font-black uppercase tracking-widest text-black/20 py-2">
                        {day}
                    </div>
                ))}
            </div>
        );
    };

    const renderCells = () => {
        const monthStart = startOfMonth(viewDate);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart);
        const endDate = endOfWeek(monthEnd);

        const calendarDays = eachDayOfInterval({
            start: startDate,
            end: endDate,
        });

        return (
            <div className="grid grid-cols-7 gap-1 px-2 pb-2">
                {calendarDays.map((day, idx) => {
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    const isToday = isSameDay(day, new Date());
                    const isPast = disablePast && isBefore(day, startOfToday());

                    return (
                        <button
                            key={idx}
                            type="button"
                            disabled={isPast}
                            onClick={() => {
                                onChange(format(day, 'yyyy-MM-dd'));
                                setIsOpen(false);
                            }}
                            className={cn(
                                "h-7.5 w-7.5 flex items-center justify-center rounded-lg text-[10px] font-bold transition-all relative",
                                !isCurrentMonth && "text-black/10",
                                isCurrentMonth && "text-black hover:bg-neutral-50",
                                isPast && "text-black/5 cursor-not-allowed hover:bg-transparent",
                                isSelected && "bg-black text-white hover:bg-black font-black shadow-md scale-105 z-10",
                                isToday && !isSelected && "text-emerald-600 after:content-[''] after:absolute after:bottom-1 after:w-1 after:h-1 after:bg-emerald-500 after:rounded-full"
                            )}
                        >
                            {format(day, 'd')}
                        </button>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="relative w-full" ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-full bg-neutral-50 border border-neutral-100 rounded-xl p-4 text-[12px] font-bold text-left transition-all outline-none flex items-center justify-between group",
                    isOpen ? "border-black/20 ring-4 ring-black/[0.02] bg-white" : "hover:border-black/5 hover:bg-neutral-100/50"
                )}
            >
                <span className={cn(selectedDate ? "text-black" : "text-black/20")}>
                    {selectedDate ? format(selectedDate, 'PPP') : placeholder}
                </span>
                <CalendarIcon size={16} className={cn("transition-colors", isOpen ? "text-black" : "text-black/10 group-hover:text-black/30")} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 z-[300] bg-white border border-black/5 rounded-[1.5rem] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] animate-in fade-in zoom-in-95 duration-200 origin-top">
                    <div className="w-[240px]">
                        {renderHeader()}
                        <div className="p-1">
                            {renderDays()}
                            {renderCells()}
                        </div>
                        <div className="p-3 border-t border-black/5 flex justify-between items-center bg-neutral-50/50 text-[9px] font-black uppercase tracking-widest">
                            <button
                                type="button"
                                onClick={() => {
                                    onChange('');
                                    setIsOpen(false);
                                }}
                                className="text-black/20 hover:text-black transition-colors"
                                disabled={!required}
                            >
                                Clear
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    onChange(format(new Date(), 'yyyy-MM-dd'));
                                    setIsOpen(false);
                                }}
                                className="text-black"
                            >
                                Today
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
