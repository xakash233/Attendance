"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, Clock3, Fingerprint, X } from 'lucide-react';

export type AccountantDayClassification = 'PRESENT' | 'ABSENT' | 'LEAVE' | 'OFF';

export type AccountantCalendarDay = {
    date: string;
    day: number;
    weekday: string;
    classification: AccountantDayClassification;
    isWfh?: boolean;
    isCompanyWorkingDay: boolean;
    dayCategory: string;
    saturdayOrdinal: number | null;
    statusLabel: string;
    workedHours: string;
    firstPunch: string;
    lastPunch: string;
    remarks: string;
};

type AccountantEmployeeCalendarProps = {
    employeeName: string;
    payrollPeriodStart?: string;
    payrollPeriodEnd?: string;
    companyWorkingDays: number;
    presentDays: number;
    leaveDays: number;
    absentDays: number;
    days: AccountantCalendarDay[];
    onClose: () => void;
};

const WEEKDAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type DisplayStatusKey = AccountantDayClassification | 'WFH';

const STATUS_META: Record<
    DisplayStatusKey,
    { label: string; chip: string; cell: string; dot: string; text: string }
> = {
    WFH: {
        label: 'WFH',
        chip: 'bg-cyan-50 text-cyan-800 border-cyan-200',
        cell: 'bg-cyan-50 border-cyan-200 text-cyan-900 hover:bg-cyan-100',
        dot: 'bg-cyan-500',
        text: 'text-cyan-700'
    },
    PRESENT: {
        label: 'Present',
        chip: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        cell: 'bg-emerald-50 border-emerald-200 text-emerald-900 hover:bg-emerald-100',
        dot: 'bg-emerald-500',
        text: 'text-emerald-700'
    },
    ABSENT: {
        label: 'Absent',
        chip: 'bg-rose-50 text-rose-800 border-rose-200',
        cell: 'bg-rose-50 border-rose-200 text-rose-900 hover:bg-rose-100',
        dot: 'bg-rose-500',
        text: 'text-rose-700'
    },
    LEAVE: {
        label: 'Leave',
        chip: 'bg-indigo-50 text-indigo-800 border-indigo-200',
        cell: 'bg-indigo-50 border-indigo-200 text-indigo-900 hover:bg-indigo-100',
        dot: 'bg-indigo-500',
        text: 'text-indigo-700'
    },
    OFF: {
        label: 'Off',
        chip: 'bg-slate-100 text-slate-500 border-slate-200',
        cell: 'bg-slate-50 border-slate-200 text-slate-400',
        dot: 'bg-slate-300',
        text: 'text-slate-500'
    }
};

const formatDisplayDate = (dateStr: string) => {
    const date = new Date(`${dateStr}T12:00:00`);
    return date.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
};

const formatLongDate = (dateStr: string) => {
    const date = new Date(`${dateStr}T12:00:00`);
    return date.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
};

const toDateKey = (date: Date) => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getDayCategoryLabel = (dayCategory: string, satOrdinal?: number | null) => {
    switch (dayCategory) {
        case 'SAT_WFH':
            if (satOrdinal === 1) return '1st Saturday — WFH (no punch needed)';
            if (satOrdinal === 3) return '3rd Saturday — WFH (no punch needed)';
            if (satOrdinal === 5) return '5th Saturday — WFH (no punch needed)';
            return 'WFH Saturday (no punch needed)';
        case 'SAT_LEAVE':
            if (satOrdinal === 2) return '2nd Saturday — scheduled leave';
            if (satOrdinal === 4) return '4th Saturday — scheduled leave';
            return 'Scheduled Saturday off';
        case 'SUNDAY':
            return 'Sunday';
        default:
            return 'Weekday';
    }
};

const getDisplayStatusKey = (day: AccountantCalendarDay): DisplayStatusKey => {
    if (day.isWfh && day.classification === 'PRESENT') return 'WFH';
    return day.classification;
};

const getAccountantStatusLabel = (day: AccountantCalendarDay) => {
    const displayKey = getDisplayStatusKey(day);
    if (displayKey === 'WFH') {
        if (day.dayCategory === 'SAT_WFH') {
            return getDayCategoryLabel(day.dayCategory, day.saturdayOrdinal);
        }
        return 'Work from home (approved)';
    }
    return STATUS_META[displayKey].label;
};

const getDayTypeDescription = (day: AccountantCalendarDay) => {
    if (day.isWfh) {
        return day.remarks !== 'N/A' && day.remarks !== '—'
            ? day.remarks
            : getDayCategoryLabel(day.dayCategory, day.saturdayOrdinal);
    }
    if (day.classification === 'ABSENT') return 'No biometric punch';
    return getDayCategoryLabel(day.dayCategory, day.saturdayOrdinal);
};

function StatCard({
    label,
    value,
    tone
}: {
    label: string;
    value: number;
    tone: 'emerald' | 'indigo' | 'rose' | 'slate';
}) {
    const tones = {
        emerald: 'border-emerald-100 bg-emerald-50/60 text-emerald-800',
        indigo: 'border-indigo-100 bg-indigo-50/60 text-indigo-800',
        rose: 'border-rose-100 bg-rose-50/60 text-rose-800',
        slate: 'border-[#E6E8EC] bg-white text-[#101828]'
    };

    return (
        <div className={`rounded-xl border px-4 py-3 ${tones[tone]}`}>
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">{label}</p>
            <p className="text-2xl font-bold leading-tight mt-1">{value}</p>
        </div>
    );
}

export default function AccountantEmployeeCalendar({
    employeeName,
    payrollPeriodStart,
    payrollPeriodEnd,
    companyWorkingDays,
    presentDays,
    leaveDays,
    absentDays,
    days,
    onClose
}: AccountantEmployeeCalendarProps) {
    const [mounted, setMounted] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    useEffect(() => {
        setMounted(true);
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [onClose]);

    useEffect(() => {
        const firstAbsent = days.find((day) => day.classification === 'ABSENT');
        setSelectedDate(firstAbsent?.date ?? days[0]?.date ?? null);
    }, [days]);

    const absentDayList = useMemo(
        () => days.filter((day) => day.classification === 'ABSENT').sort((a, b) => a.date.localeCompare(b.date)),
        [days]
    );

    const selectedDay = useMemo(
        () => days.find((day) => day.date === selectedDate) ?? null,
        [days, selectedDate]
    );

    const calendarWeeks = useMemo(() => {
        if (!payrollPeriodStart || !payrollPeriodEnd || days.length === 0) return [];

        const dayByDate = new Map(days.map((day) => [day.date, day]));
        const start = new Date(`${payrollPeriodStart}T12:00:00.000Z`);
        const end = new Date(`${payrollPeriodEnd}T12:00:00.000Z`);
        const gridStart = new Date(start);
        gridStart.setUTCDate(gridStart.getUTCDate() - gridStart.getUTCDay());

        const gridEnd = new Date(end);
        gridEnd.setUTCDate(gridEnd.getUTCDate() + (6 - gridEnd.getUTCDay()));

        const weeks: Array<Array<AccountantCalendarDay | null>> = [];
        let cursor = new Date(gridStart);

        while (cursor <= gridEnd) {
            const week: Array<AccountantCalendarDay | null> = [];
            for (let i = 0; i < 7; i++) {
                const dateStr = toDateKey(cursor);
                const inRange = cursor >= start && cursor <= end;
                week.push(
                    inRange
                        ? dayByDate.get(dateStr) ?? {
                              date: dateStr,
                              day: cursor.getUTCDate(),
                              weekday: WEEKDAY_HEADERS[cursor.getUTCDay()],
                              classification: 'OFF',
                              isCompanyWorkingDay: false,
                              dayCategory: '—',
                              saturdayOrdinal: null,
                              statusLabel: '—',
                              workedHours: '0.00',
                              firstPunch: '—',
                              lastPunch: '—',
                              remarks: '—'
                          }
                        : null
                );
                cursor.setUTCDate(cursor.getUTCDate() + 1);
            }
            weeks.push(week);
        }

        return weeks;
    }, [days, payrollPeriodEnd, payrollPeriodStart]);

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence>
            <motion.div
                key="accountant-calendar-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] bg-[#101828]/40"
                onClick={onClose}
                role="presentation"
            >
                <motion.aside
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                    onClick={(event) => event.stopPropagation()}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="accountant-employee-calendar-title"
                    className="absolute right-0 top-0 flex h-full w-full max-w-[720px] flex-col bg-white shadow-[-12px_0_40px_rgba(16,24,40,0.12)]"
                >
                    <header className="shrink-0 border-b border-[#E6E8EC] bg-white px-5 py-4 sm:px-6">
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-600">
                                    Payroll attendance
                                </p>
                                <h2
                                    id="accountant-employee-calendar-title"
                                    className="text-xl font-bold text-[#101828] truncate"
                                >
                                    {employeeName}
                                </h2>
                                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                    {payrollPeriodStart && payrollPeriodEnd
                                        ? `${payrollPeriodStart} → ${payrollPeriodEnd}`
                                        : 'Selected period'}
                                    <span className="mx-1.5 text-slate-300">•</span>
                                    26th–25th cycle
                                    <span className="mx-1.5 text-slate-300">•</span>
                                    {companyWorkingDays} working days
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="shrink-0 rounded-xl border border-[#E6E8EC] p-2.5 text-slate-500 transition-colors hover:bg-slate-50 hover:text-[#101828]"
                                aria-label="Close"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            <StatCard label="Present" value={presentDays} tone="emerald" />
                            <StatCard label="Leave" value={leaveDays} tone="indigo" />
                            <StatCard label="Absent" value={absentDays} tone="rose" />
                            <StatCard label="Working days" value={companyWorkingDays} tone="slate" />
                        </div>
                    </header>

                    <div className="flex-1 overflow-y-auto overscroll-contain">
                        <section className="border-b border-[#E6E8EC] px-5 py-4 sm:px-6">
                            <div className="flex items-center justify-between gap-3 mb-3">
                                <h3 className="text-sm font-bold text-[#101828]">Absent days</h3>
                                <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 border border-rose-100">
                                    {absentDayList.length} total
                                </span>
                            </div>

                            {absentDayList.length === 0 ? (
                                <p className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-6 text-center text-sm text-emerald-800">
                                    No absent days in this payroll period.
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {absentDayList.map((day) => {
                                        const isActive = selectedDate === day.date;
                                        return (
                                            <button
                                                key={day.date}
                                                type="button"
                                                onClick={() => setSelectedDate(day.date)}
                                                className={`w-full rounded-xl border px-4 py-3 text-left transition-all ${
                                                    isActive
                                                        ? 'border-rose-300 bg-rose-50 shadow-sm ring-2 ring-rose-200/80'
                                                        : 'border-[#E6E8EC] bg-white hover:border-rose-200 hover:bg-rose-50/40'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="text-sm font-bold text-[#101828]">
                                                            {formatLongDate(day.date)}
                                                        </p>
                                                        <p className="text-xs text-rose-700 mt-0.5">
                                                            {getDayTypeDescription(day)}
                                                        </p>
                                                    </div>
                                                    <span className="rounded-md bg-rose-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-rose-800">
                                                        Absent
                                                    </span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </section>

                        <section className="border-b border-[#E6E8EC] px-5 py-4 sm:px-6">
                            <div className="flex items-center gap-2 mb-3">
                                <CalendarDays size={16} className="text-slate-500" />
                                <h3 className="text-sm font-bold text-[#101828]">Period calendar</h3>
                            </div>

                            <div className="rounded-xl border border-[#E6E8EC] bg-slate-50/40 p-3">
                                <div className="grid grid-cols-7 gap-1 mb-1">
                                    {WEEKDAY_HEADERS.map((label) => (
                                        <div
                                            key={label}
                                            className="text-center text-[10px] font-bold uppercase tracking-wide text-slate-400 py-1"
                                        >
                                            {label}
                                        </div>
                                    ))}
                                </div>
                                <div className="space-y-1">
                                    {calendarWeeks.map((week, weekIndex) => (
                                        <div key={`week-${weekIndex}`} className="grid grid-cols-7 gap-1">
                                            {week.map((day, dayIndex) => {
                                                if (!day) {
                                                    return (
                                                        <div
                                                            key={`empty-${weekIndex}-${dayIndex}`}
                                                            className="h-9 rounded-md"
                                                        />
                                                    );
                                                }

                                                const meta = STATUS_META[getDisplayStatusKey(day)];
                                                const isSelected = selectedDate === day.date;
                                                const inPeriod = day.isCompanyWorkingDay || day.classification !== 'OFF';

                                                return (
                                                    <button
                                                        key={day.date}
                                                        type="button"
                                                        onClick={() => setSelectedDate(day.date)}
                                                        title={`${formatDisplayDate(day.date)} — ${getAccountantStatusLabel(day)}`}
                                                        className={`h-9 rounded-md border text-[11px] font-bold transition-all ${meta.cell} ${
                                                            isSelected ? 'ring-2 ring-[#101828] ring-offset-1' : ''
                                                        } ${!inPeriod ? 'opacity-40' : ''}`}
                                                    >
                                                        {day.day}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                                <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-[#E6E8EC]">
                                    {(Object.keys(STATUS_META) as DisplayStatusKey[]).map((key) => (
                                        <div key={key} className="flex items-center gap-1.5">
                                            <span className={`h-2 w-2 rounded-full ${STATUS_META[key].dot}`} />
                                            <span className="text-[11px] font-medium text-slate-600">
                                                {STATUS_META[key].label}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>

                        <section className="px-5 py-4 sm:px-6 pb-8">
                            <h3 className="text-sm font-bold text-[#101828] mb-3">Day details</h3>
                            {selectedDay ? (
                                <div className="rounded-xl border border-[#E6E8EC] bg-white p-4 space-y-4">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span
                                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${STATUS_META[getDisplayStatusKey(selectedDay)].chip}`}
                                        >
                                            {getAccountantStatusLabel(selectedDay)}
                                        </span>
                                        <span className="text-xs text-slate-500">
                                            {formatLongDate(selectedDay.date)}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="rounded-lg bg-slate-50 px-3 py-2.5">
                                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 flex items-center gap-1">
                                                <CalendarDays size={12} /> Day type
                                            </p>
                                            <p className="text-sm font-semibold text-[#101828] mt-1">
                                                {getDayCategoryLabel(selectedDay.dayCategory, selectedDay.saturdayOrdinal)}
                                            </p>
                                        </div>
                                        <div className="rounded-lg bg-slate-50 px-3 py-2.5">
                                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 flex items-center gap-1">
                                                <Clock3 size={12} /> Worked hours
                                            </p>
                                            <p className="text-sm font-semibold text-[#101828] mt-1">
                                                {selectedDay.workedHours} hrs
                                            </p>
                                        </div>
                                        <div className="rounded-lg bg-slate-50 px-3 py-2.5">
                                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 flex items-center gap-1">
                                                <Fingerprint size={12} /> First punch
                                            </p>
                                            <p className="text-sm font-semibold text-[#101828] mt-1">
                                                {selectedDay.firstPunch}
                                            </p>
                                        </div>
                                        <div className="rounded-lg bg-slate-50 px-3 py-2.5">
                                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 flex items-center gap-1">
                                                <Fingerprint size={12} /> Last punch
                                            </p>
                                            <p className="text-sm font-semibold text-[#101828] mt-1">
                                                {selectedDay.lastPunch}
                                            </p>
                                        </div>
                                        <div className="sm:col-span-2 rounded-lg bg-slate-50 px-3 py-2.5">
                                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                                Report status
                                            </p>
                                            <p className="text-sm font-semibold text-[#101828] mt-1">
                                                {selectedDay.statusLabel}
                                            </p>
                                        </div>
                                        {selectedDay.remarks !== 'N/A' && selectedDay.remarks !== '—' && (
                                            <div className="sm:col-span-2 rounded-lg bg-slate-50 px-3 py-2.5">
                                                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                                    Remarks
                                                </p>
                                                <p className="text-sm font-semibold text-[#101828] mt-1">
                                                    {selectedDay.remarks}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <p className="rounded-xl border border-dashed border-[#E6E8EC] bg-slate-50/50 px-4 py-8 text-center text-sm text-slate-500">
                                    Select a date on the calendar or from the absent list to view details.
                                </p>
                            )}

                            <p className="text-[11px] text-slate-400 mt-4 leading-relaxed">
                                Weekdays need a biometric punch unless approved WFH. 1st/3rd/5th Saturdays count as WFH without a punch. Leave applies only when no punch was recorded.
                            </p>
                        </section>
                    </div>
                </motion.aside>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
}
