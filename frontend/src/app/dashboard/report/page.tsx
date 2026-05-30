"use client";

import React, { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import { 
    Download, 
    Calendar, 
    Loader2, 
    ArrowLeft,
    Activity,
    ChevronRight,
    Search,
    Filter,
    X,
    ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import AccountantEmployeeCalendar, {
    type AccountantCalendarDay,
    type AccountantDayClassification
} from '@/components/attendance/AccountantEmployeeCalendar';

const ACCOUNTANT_EXCLUDED_EMPLOYEE_NAMES = new Set([
    'YUVARAJ',
    'SWETHA',
    'E.GOKULAVASAN',
    'A V NISHANTH',
    'NIRANJAN PURUSHOTHAMAN'
]);

const MIN_FULL_DAY_HOURS = 7.5;
const STANDARD_DAY_HOURS = 8;

const getCurrentIstCalendarMonth = () =>
    new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }).slice(0, 7);

const formatPunchTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata'
    });

const formatDuration = (decimalHours: any) => {
    const val = parseFloat(decimalHours);
    if (isNaN(val) || val === 0) return '00:00';
    const totalMinutes = Math.round(val * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

const formatStatus = (row: any) => {
    const worked = parseFloat(row.TotalWorkedHours || '0');
    const rawStatus = String(row.Status || '').toUpperCase().replace(/_/g, ' ');

    if (row.DayCategory === 'SAT_LEAVE') return 'Leave';
    if (row.DayCategory === 'SAT_WFH') return 'WFH';
    if (rawStatus.includes('WFH') || String(row.Remarks || '').toUpperCase().includes('WFH')) return 'WFH';
    if (row.DayCategory === 'SUNDAY' || row.Status === 'WEEKEND' || row.Status === 'OVERTIME_SUNDAY') return 'Weekend';
    if (row.Status === 'HOLIDAY') return `Holiday (${row.Remarks})`;

    if (worked >= MIN_FULL_DAY_HOURS) {
        if (rawStatus.includes('ON SITE') || rawStatus.includes('ON-SITE')) return 'On-Site';
        if (worked > STANDARD_DAY_HOURS + 0.5) return 'Compensated';
        return 'Present';
    }

    if (worked > 0 && worked < MIN_FULL_DAY_HOURS) {
        return 'Short Day';
    }

    if (rawStatus.includes('LOP')) return 'LOP';
    if (rawStatus.includes('LEAVE')) return 'Leave';
    if (worked === 0) return 'Absent';
    return 'Present';
};

const getPunchDisplay = (row: any, field: 'FirstPunch' | 'LastPunch') => {
    const statusText = formatStatus(row).toUpperCase();
    if (statusText === 'WEEKEND') return 'Weekend';
    if (statusText.startsWith('HOLIDAY')) return 'Holiday';

    const value = row[field];
    if (!value || value === '---') {
        if (statusText === 'WFH') return 'WFH';
        return 'Absent';
    }
    if (String(value).toUpperCase() === 'LEAVE') return 'Leave';
    if (String(value).toUpperCase() === 'WFH') return 'WFH';
    return value;
};

export default function ReportPage() {
    const { user, loading: authLoading } = useAuth();
    const [reportData, setReportData] = useState<any[]>([]);
    const [meta, setMeta] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [exportLoading, setExportLoading] = useState(false);
    const [complianceMonth, setComplianceMonth] = useState<string>(() => getCurrentIstCalendarMonth());
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
    const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [employees, setEmployees] = useState<any[]>([]);
    const [selectedAccountantEmployee, setSelectedAccountantEmployee] = useState<{
        employeeId: string;
        name: string;
        joiningDate?: string | null;
        firstBiometricDate?: string | null;
        effectiveAttendanceStart?: string | null;
        companyWorkingDays: number;
        presentDays: number;
        leaveDays: number;
        absentDays: number;
        lopDays: number;
    } | null>(null);
    const [expandedLogRow, setExpandedLogRow] = useState<string | null>(null);
    const monthRef = React.useRef<HTMLInputElement>(null);
    const canUseAdvancedFilters = ['SUPER_ADMIN', 'HR', 'ADMIN', 'ACCOUNTANT'].includes(user?.role || '');
    const isAccountant = user?.role === 'ACCOUNTANT';
    const canViewLopSummary = ['ACCOUNTANT', 'SUPER_ADMIN'].includes(user?.role || '');
    const employeeRoleById = React.useMemo(() => {
        const roleMap = new Map<string, string>();
        employees.forEach((employee: any) => {
            if (employee?.id) {
                roleMap.set(employee.id, String(employee.role || '').toUpperCase());
            }
        });
        return roleMap;
    }, [employees]);
    const biometricEnrolledUserIds = React.useMemo(() => {
        const ids = meta?.biometricEnrolledUserIds;
        return new Set(Array.isArray(ids) ? ids : []);
    }, [meta]);
    const shouldIncludeForAccountantSheet = React.useCallback(
        (employeeId: string | undefined, employeeName: string | undefined, row?: any) => {
            const normalizedName = String(employeeName || '').trim().toUpperCase();
            if (!normalizedName) return false;
            if (ACCOUNTANT_EXCLUDED_EMPLOYEE_NAMES.has(normalizedName)) return false;

            const role = employeeId ? employeeRoleById.get(employeeId) : undefined;
            if (role && role !== 'EMPLOYEE') return false;
            if (!role && ['TECTRA DEVV', 'ACCOUNTANT USER'].includes(normalizedName)) return false;

            const enrolledFromRow = row?.HasBiometricEnrollment;
            const isBiometricEnrolled = enrolledFromRow === true
                || (employeeId ? biometricEnrolledUserIds.has(employeeId) : false);
            if (!isBiometricEnrolled) return false;

            return true;
        },
        [biometricEnrolledUserIds, employeeRoleById]
    );
    const employeeOptions = React.useMemo(() => {
        const filteredEmployees = isAccountant
            ? employees.filter((employee: any) =>
                shouldIncludeForAccountantSheet(employee.id, employee.name, {
                    HasBiometricEnrollment: biometricEnrolledUserIds.has(employee.id)
                })
            )
            : employees;

        const fromEmployees = filteredEmployees.map((employee: any) => ({
            id: employee.id,
            name: employee.name,
            department: employee.department?.name || 'Unassigned'
        }));
        if (fromEmployees.length > 0) return fromEmployees;

        const seen = new Map<string, { id: string; name: string; department: string }>();
        reportData.forEach((row: any) => {
            const key = row.id || row.EmployeeID;
            if (!key || seen.has(key)) return;
            if (isAccountant && !shouldIncludeForAccountantSheet(key, row.Name || row.EmployeeID, row)) return;
            seen.set(key, {
                id: row.id || row.EmployeeID,
                name: row.Name || row.EmployeeID,
                department: row.Department || 'Unassigned'
            });
        });
        return Array.from(seen.values());
    }, [biometricEnrolledUserIds, employees, isAccountant, reportData, shouldIncludeForAccountantSheet]);
    const departmentOptions = React.useMemo(() => {
        const fromEmployees = Array.from(
            new Set(employeeOptions.map((employee) => employee.department).filter(Boolean))
        );
        return fromEmployees.sort((a, b) => a.localeCompare(b));
    }, [employeeOptions]);

    useEffect(() => {
        const fetchUsers = async () => {
            if (['SUPER_ADMIN', 'HR', 'ADMIN', 'ACCOUNTANT'].includes(user?.role || '')) {
                try {
                    const res = await api.get('/users');
                    setEmployees(res.data);
                } catch (err) {
                    console.error('Failed to fetch users', err);
                }
            }
        };
        if (user) fetchUsers();
    }, [user]);

    const fetchReport = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (complianceMonth) params.month = complianceMonth;
            if (selectedEmployeeId && selectedEmployeeId !== 'all') params.userId = selectedEmployeeId;
            if (selectedDepartment && selectedDepartment !== 'all' && (!selectedEmployeeId || selectedEmployeeId === 'all')) {
                params.departmentId = selectedDepartment;
            }
            
            const res = await api.get('/attendance/compliance-report', { params });
            const todayIstStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

            // Ensure we do not show pending 'future' days that have not been completed yet.
            // Also enforce Top-Down sorting: Latest day at the top per employee.
            const filteredAndSorted = res.data.report
                .filter((r: any) => {
                    const dateStr = typeof r.Date === 'string' ? r.Date.split('T')[0] : '';
                    return dateStr <= todayIstStr;
                })
                .sort((a: any, b: any) => {
                    const nameA = a.Name || '';
                    const nameB = b.Name || '';
                    if (nameA !== nameB) {
                        return nameA.localeCompare(nameB);
                    }
                    const dA = new Date(a.Date).getTime() || 0;
                    const dB = new Date(b.Date).getTime() || 0;
                    // Sort Date Descending (Newer at the top)
                    return dB - dA;
                });

            setReportData(filteredAndSorted);
            setMeta(res.data.meta);
            setCurrentPage(1);
        } catch (err) {
            console.error('Failed to fetch report', err);
            toast.error('Failed to load report data');
        } finally {
            setLoading(false);
        }
    }, [complianceMonth, selectedEmployeeId, selectedDepartment]);

    useEffect(() => {
        if (!authLoading && user) {
            fetchReport();
        }
    }, [user, authLoading, fetchReport]);

    useEffect(() => {
        setExpandedLogRow(null);
    }, [currentPage, selectedEmployeeId, complianceMonth]);

    const handleExportExcel = useCallback(async () => {
        setExportLoading(true);
        try {
            const params = new URLSearchParams();
            if (complianceMonth) params.append('month', complianceMonth);
            if (selectedEmployeeId && selectedEmployeeId !== 'all') params.append('userId', selectedEmployeeId);
            if (selectedDepartment && selectedDepartment !== 'all' && (!selectedEmployeeId || selectedEmployeeId === 'all')) {
                params.append('departmentId', selectedDepartment);
            }
            
            const res = await api.get(`/attendance/export-compliance?${params.toString()}`, { 
                responseType: 'blob' 
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            let filename = `Attendance_Report_${complianceMonth || 'Last30Days'}`;
            if (selectedEmployeeId) {
                const empName = reportData.find(r => r.EmployeeID === selectedEmployeeId || r.id === selectedEmployeeId)?.Name;
                if (empName) {
                    const safeName = empName.replace(/[^a-z0-9]/gi, '_');
                    filename = `${safeName}_Attendance_Report_${complianceMonth || 'Last30Days'}`;
                }
            }
            link.setAttribute('download', `${filename}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('Report downloaded successfully');
        } catch (err) {
            console.error('Export failed', err);
            toast.error('Failed to export report');
        } finally {
            setExportLoading(false);
        }
    }, [complianceMonth, selectedEmployeeId, selectedDepartment, reportData]);

    // Group by employee for summaries
    const groupSummaries = (data = reportData) => {
        const summaries: any = {};
        data.forEach(r => {
            if (!summaries[r.id]) {
                summaries[r.id] = { id: r.id, name: r.Name, worked: 0, target: 0, records: [] };
            }
            const worked = parseFloat(r.TotalWorkedHours || "0");
            
            // Critical parsing: Avoid local timezone shifts for dates stored as YYYY-MM-DD
            const dateStr = typeof r.Date === 'string' ? r.Date.split('T')[0] : '';
            const dateObj = dateStr ? new Date(`${dateStr}T00:00:00.000Z`) : new Date(0);
            const dayOfWeek = dateObj.getUTCDay(); // Dates are usually stored at 00:00 UTC

            const isWeekend = dayOfWeek === 0;
            const isHoliday = r.Status === 'HOLIDAY';
            const isLeave = typeof r.Status === 'string' && r.Status.includes('LEAVE');
            const isHalfDayLeave = String(r.Remarks || '').includes('HALF DAY LEAVE');

            // 1. Numerator: always use actual worked hours (compliance report provides actual, not credited)
            summaries[r.id].worked += worked;

            // Robust Date Sync (IST to UTC) - Consistent with the backend
            const todayIstStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
            const isToday = dateStr === todayIstStr;

            // 2. Denominator: Only add 8h target if it's a standard working day (Mon-Sat)
            // AND not a holiday, AND not a leave, AND not today.
            if (!isWeekend && !isHoliday && !isToday) {
                if (isHalfDayLeave) summaries[r.id].target += 4;
                else if (!isLeave) summaries[r.id].target += 8;
            }

            summaries[r.id].records.push(r);
        });
        return Object.values(summaries).sort((a: any, b: any) => a.name.localeCompare(b.name));
    };

    const weekMap = React.useMemo(() => {
        const map: any = {};
        reportData.forEach(r => {
            const date = new Date(r.Date);
            const weekNum = Math.floor((date.getDate() - 1) / 7) + 1;
            const key = `${r.id}-${weekNum}`;
            if (!map[key]) map[key] = { worked: 0, target: 0 };
            
            map[key].worked += parseFloat(r.TotalWorkedHours || "0");
            
            const dateStr = typeof r.Date === 'string' ? r.Date.split('T')[0] : '';
            const dateObj = dateStr ? new Date(`${dateStr}T00:00:00.000Z`) : new Date(0);
            const dayOfWeek = dateObj.getUTCDay();
            const isWeekend = dayOfWeek === 0;
            const isHoliday = r.Status === 'HOLIDAY';
            const isLeave = typeof r.Status === 'string' && r.Status.includes('LEAVE');
            const isHalfDayLeave = String(r.Remarks || '').includes('HALF DAY LEAVE');
            const todayIstStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
            const isToday = dateStr === todayIstStr;

            if (!isWeekend && !isHoliday && !isToday) {
                if (isHalfDayLeave) map[key].target += 4;
                else if (!isLeave) map[key].target += 8;
            }
        });
        return map;
    }, [reportData]);

    const weeklyPages = React.useMemo(() => {
        const pages: Array<{ key: string; label: string; rows: any[] }> = [];
        const indexByKey = new Map<string, number>();

        reportData.forEach((row) => {
            const date = new Date(row.Date);
            const weekNumber = Math.floor((date.getDate() - 1) / 7) + 1;
            const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            const key = `${row.id}-${date.getFullYear()}-${date.getMonth()}-${weekNumber}`;
            const label = `${row.Name} • Week ${weekNumber} (${monthLabel})`;

            if (!indexByKey.has(key)) {
                indexByKey.set(key, pages.length);
                pages.push({ key, label, rows: [] });
            }

            const pageIndex = indexByKey.get(key)!;
            pages[pageIndex].rows.push(row);
        });

        return pages;
    }, [reportData]);

    const totalPages = Math.max(1, weeklyPages.length);
    const paginatedReportData = weeklyPages[currentPage - 1]?.rows || [];
    const activeWeekLabel = weeklyPages[currentPage - 1]?.label || '';

    const classifyAttendanceRow = React.useCallback((row: any, options?: { accountantMode?: boolean }) => {
        const accountantMode = options?.accountantMode === true;
        const normalizedStatus = formatStatus(row).toUpperCase();
        const rawStatus = String(row.Status || '').toUpperCase().replace(/_/g, ' ');
        const workedHours = parseFloat(row.TotalWorkedHours || '0');
        const isValidPunchValue = (value: any) => {
            if (!value) return false;
            const normalizedValue = String(value).trim().toUpperCase();
            return !['---', 'ABSENT', 'N/A', 'LEAVE', 'WEEKEND', 'HOLIDAY'].includes(normalizedValue);
        };
        const hasPunch = isValidPunchValue(row.FirstPunch) || isValidPunchValue(row.LastPunch);
        const hasWorkedTime = workedHours > 0.1;

        if (row.IsBeforeEffectiveStart || row.IsCompanyWorkingDay === false) return 'UNKNOWN';

        if (accountantMode) {
            const remarks = String(row.Remarks || '').toUpperCase();
            const leaveApplied =
                remarks.includes('APPROVED LEAVE')
                || remarks.includes('CANCELLED LEAVE')
                || remarks.includes('AWAITING APPROVAL')
                || remarks.includes('HALF DAY LEAVE')
                || (rawStatus.includes('PENDING') && rawStatus.includes('LEAVE'));

            const remarksUpper = String(row.Remarks || '').toUpperCase();
            const isApprovedWfh =
                row.DayCategory === 'SAT_WFH' ||
                normalizedStatus === 'WFH' ||
                rawStatus.includes('WFH') ||
                remarksUpper.includes('WFH') ||
                (
                    workedHours >= MIN_FULL_DAY_HOURS
                    && !hasPunch
                    && remarksUpper.includes('MANUAL')
                );

            if (leaveApplied && !hasPunch) return 'LEAVE';
            if (isApprovedWfh || hasPunch) return 'PRESENT';
            return 'ABSENT';
        }

        const isLeave =
            row.DayCategory === 'SAT_LEAVE' ||
            normalizedStatus === 'LEAVE' ||
            rawStatus.includes('LEAVE');
        const isExplicitAbsent =
            rawStatus === 'ABSENT' ||
            normalizedStatus === 'ABSENT';

        const isShortDay =
            normalizedStatus === 'SHORT DAY' ||
            rawStatus.includes('SHORT') ||
            (workedHours > 0 && workedHours < MIN_FULL_DAY_HOURS);

        const isWfhDay =
            row.DayCategory === 'SAT_WFH' ||
            normalizedStatus === 'WFH' ||
            rawStatus.includes('WFH');
        const isWfhWorking = isWfhDay && (hasWorkedTime || hasPunch);

        const isPresent =
            isWfhWorking ||
            workedHours >= MIN_FULL_DAY_HOURS ||
            ['PRESENT', 'COMPENSATED', 'ON-SITE'].includes(normalizedStatus) ||
            ['PRESENT', 'LATE', 'ON SITE', 'ON-SITE', 'PRESENT WFH', 'HALF DAY', 'OVERTIME'].includes(rawStatus);

        if (isLeave) return 'LEAVE';
        if (isShortDay || (hasPunch && workedHours > 0)) return 'PRESENT';
        if (isPresent) return 'PRESENT';
        if (isExplicitAbsent && workedHours <= 0 && !hasPunch) return 'ABSENT';
        return 'UNKNOWN';
    }, []);

    const accountantSummaryRows = React.useMemo(() => {
        if (!canViewLopSummary || selectedEmployeeId !== 'all') return [];

        const serverSummaries = meta?.accountantSummaries;
        if (Array.isArray(serverSummaries) && serverSummaries.length > 0) {
            return serverSummaries
                .filter((summary: any) =>
                    shouldIncludeForAccountantSheet(summary.userId, summary.name, {
                        HasBiometricEnrollment: true
                    })
                )
                .map((summary: any) => ({
                    employeeId: summary.userId || summary.name,
                    name: summary.name,
                    joiningDate: summary.joiningDate ?? null,
                    firstBiometricDate: summary.firstBiometricDate ?? null,
                    effectiveAttendanceStart: summary.effectiveAttendanceStart ?? null,
                    companyWorkingDays: summary.companyWorkingDays ?? meta?.companyWorkingDays ?? 0,
                    presentDays: summary.presentDays ?? 0,
                    leaveDays: summary.leaveDays ?? 0,
                    absentDays: summary.absentDays ?? 0,
                    lopDays: summary.lopDays ?? 0
                }));
        }

        const groupedByEmployee = new Map<string, { name: string; rows: any[] }>();
        const companyWorkingDays = meta?.companyWorkingDays ?? 0;

        reportData.forEach((row: any) => {
            const employeeId = row.id || row.EmployeeID;
            if (!employeeId) return;
            const employeeName = row.Name || row.EmployeeID || 'Unknown';
            if (!shouldIncludeForAccountantSheet(employeeId, employeeName, row)) return;

            const dateKey = typeof row.Date === 'string' ? row.Date.split('T')[0] : '';
            if (!dateKey) return;

            const employeeKey = String(employeeName).trim().toUpperCase();
            if (!groupedByEmployee.has(employeeKey)) {
                groupedByEmployee.set(employeeKey, {
                    name: employeeName,
                    rows: []
                });
            }
            groupedByEmployee.get(employeeKey)!.rows.push(row);
        });

        return Array.from(groupedByEmployee.entries())
            .map(([employeeKey, employeeData]) => {
                let presentDays = 0;
                let absentDays = 0;
                let leaveDays = 0;
                let lopDays = 0;
                const perDayClassification = new Map<string, 'PRESENT' | 'ABSENT' | 'LEAVE' | 'UNKNOWN'>();
                const perDayLop = new Map<string, number>();

                employeeData.rows.forEach((row: any) => {
                    const dateKey = typeof row.Date === 'string' ? row.Date.split('T')[0] : '';
                    if (!dateKey || row.IsCompanyWorkingDay === false) return;

                    const rowClassification = classifyAttendanceRow(row, { accountantMode: true }) as 'PRESENT' | 'ABSENT' | 'LEAVE' | 'UNKNOWN';
                    if (rowClassification === 'UNKNOWN') return;
                    const existingClassification = perDayClassification.get(dateKey);
                    const lopPortion = Number(row.LopPortion || 0);
                    if (lopPortion > 0) {
                        const priorLop = perDayLop.get(dateKey) || 0;
                        perDayLop.set(dateKey, Math.max(priorLop, lopPortion));
                    }

                    // Priority per day: PRESENT > LEAVE > ABSENT > UNKNOWN
                    if (!existingClassification || existingClassification === 'UNKNOWN') {
                        perDayClassification.set(dateKey, rowClassification);
                    } else if (existingClassification === 'ABSENT' && ['PRESENT', 'LEAVE'].includes(rowClassification)) {
                        perDayClassification.set(dateKey, rowClassification);
                    } else if (existingClassification === 'LEAVE' && rowClassification === 'PRESENT') {
                        perDayClassification.set(dateKey, 'PRESENT');
                    }
                });

                perDayClassification.forEach((classification) => {
                    if (classification === 'PRESENT') presentDays += 1;
                    else if (classification === 'LEAVE') leaveDays += 1;
                    else absentDays += 1;
                });
                perDayLop.forEach((lopPortion) => {
                    lopDays += Number(lopPortion || 0);
                });

                return {
                    employeeId: employeeKey,
                    name: employeeData.name,
                    companyWorkingDays,
                    presentDays,
                    leaveDays,
                    absentDays,
                    lopDays: Number(lopDays.toFixed(2))
                };
            })
            .sort((firstEmployee, secondEmployee) => firstEmployee.name.localeCompare(secondEmployee.name));
    }, [canViewLopSummary, classifyAttendanceRow, meta, reportData, selectedEmployeeId, shouldIncludeForAccountantSheet]);

    const accountantTodayCounts = React.useMemo(() => {
        if (!canViewLopSummary || selectedEmployeeId !== 'all') {
            return { totalEmployees: 0, presentToday: 0, absentToday: 0, leaveToday: 0 };
        }

        const todayIstStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        const todayRows = reportData.filter((row: any) => {
            const dateKey = typeof row.Date === 'string' ? row.Date.split('T')[0] : '';
            const employeeId = row.id || row.EmployeeID;
            const employeeName = row.Name || row.EmployeeID || 'Unknown';
            return dateKey === todayIstStr
                && row.IsCompanyWorkingDay !== false
                && shouldIncludeForAccountantSheet(employeeId, employeeName, row);
        });

        let presentToday = 0;
        let absentToday = 0;
        let leaveToday = 0;
        const employeeTodayState = new Map<string, 'PRESENT' | 'ABSENT' | 'LEAVE' | 'UNKNOWN'>();

        todayRows.forEach((row: any) => {
            const employeeId = row.id || row.EmployeeID;
            if (!employeeId) return;
            const rowClassification = classifyAttendanceRow(row, { accountantMode: true }) as 'PRESENT' | 'ABSENT' | 'LEAVE' | 'UNKNOWN';
            const currentClassification = employeeTodayState.get(employeeId);

            if (!currentClassification || currentClassification === 'UNKNOWN') {
                employeeTodayState.set(employeeId, rowClassification);
            } else if (currentClassification === 'ABSENT' && ['PRESENT', 'LEAVE'].includes(rowClassification)) {
                employeeTodayState.set(employeeId, rowClassification);
            } else if (currentClassification === 'LEAVE' && rowClassification === 'PRESENT') {
                employeeTodayState.set(employeeId, 'PRESENT');
            }
        });

        employeeTodayState.forEach((classification) => {
            if (classification === 'PRESENT') presentToday += 1;
            else if (classification === 'LEAVE') leaveToday += 1;
            else if (classification === 'ABSENT') absentToday += 1;
        });

        return {
            totalEmployees: employeeTodayState.size,
            presentToday,
            absentToday,
            leaveToday
        };
    }, [canViewLopSummary, classifyAttendanceRow, reportData, selectedEmployeeId, shouldIncludeForAccountantSheet]);

    const resolveAccountantEmployeeRows = React.useCallback((employeeId: string, employeeName: string) => {
        const normalizedName = String(employeeName || '').trim().toUpperCase();
        return reportData.filter((row: any) => {
            const rowId = row.id || row.EmployeeID;
            const rowName = String(row.Name || row.EmployeeID || '').trim().toUpperCase();
            return rowId === employeeId || rowName === normalizedName || rowName === String(employeeId).trim().toUpperCase();
        });
    }, [reportData]);

    const selectedAccountantCalendarDays = React.useMemo((): AccountantCalendarDay[] => {
        if (!selectedAccountantEmployee) return [];

        const employeeRows = resolveAccountantEmployeeRows(
            selectedAccountantEmployee.employeeId,
            selectedAccountantEmployee.name
        );
        const perDay = new Map<string, { row: any; classification: AccountantDayClassification }>();

        employeeRows.forEach((row: any) => {
            const dateKey = typeof row.Date === 'string' ? row.Date.split('T')[0] : '';
            if (!dateKey) return;

            let classification: AccountantDayClassification;
            if (row.IsBeforeEffectiveStart) {
                classification = 'OFF';
            } else if (row.IsCompanyWorkingDay === false) {
                classification = 'OFF';
            } else {
                const accountantClass = classifyAttendanceRow(row, { accountantMode: true });
                classification = accountantClass === 'PRESENT' || accountantClass === 'ABSENT' || accountantClass === 'LEAVE'
                    ? accountantClass
                    : 'OFF';
            }

            const existing = perDay.get(dateKey);
            if (!existing) {
                perDay.set(dateKey, { row, classification });
                return;
            }
            if (existing.classification === 'ABSENT' && ['PRESENT', 'LEAVE'].includes(classification)) {
                perDay.set(dateKey, { row, classification });
            } else if (existing.classification === 'LEAVE' && classification === 'PRESENT') {
                perDay.set(dateKey, { row, classification });
            }
        });

        return Array.from(perDay.entries())
            .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
            .map(([date, entry]) => {
                const dateObj = new Date(`${date}T12:00:00`);
                const punchIn = getPunchDisplay(entry.row, 'FirstPunch');
                const punchOut = getPunchDisplay(entry.row, 'LastPunch');
                const remarksUpper = String(entry.row.Remarks || '').toUpperCase();
                const statusUpper = String(entry.row.Status || '').toUpperCase();
                const isWfh =
                    entry.row.DayCategory === 'SAT_WFH' ||
                    remarksUpper.includes('WFH') ||
                    statusUpper.includes('WFH') ||
                    (
                        entry.classification === 'PRESENT'
                        && remarksUpper.includes('MANUAL')
                        && parseFloat(entry.row.TotalWorkedHours || '0') >= MIN_FULL_DAY_HOURS
                    );

                return {
                    date,
                    day: dateObj.getDate(),
                    weekday: dateObj.toLocaleDateString('en-GB', { weekday: 'short' }),
                    classification: entry.classification,
                    isWfh,
                    isBeforeEffectiveStart: entry.row.IsBeforeEffectiveStart === true,
                    isCompanyWorkingDay: entry.row.IsCompanyWorkingDay !== false,
                    dayCategory: entry.row.DayCategory || '—',
                    saturdayOrdinal: entry.row.SaturdayOrdinal ?? null,
                    statusLabel: formatStatus(entry.row),
                    workedHours: parseFloat(entry.row.TotalWorkedHours || '0').toFixed(2),
                    firstPunch: punchIn,
                    lastPunch: punchOut,
                    remarks: entry.row.Remarks || 'N/A'
                };
            });
    }, [classifyAttendanceRow, resolveAccountantEmployeeRows, selectedAccountantEmployee]);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const renderPagination = () => (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-4 border-t border-[#E6E8EC] bg-white">
            <p className="text-[12px] font-medium text-slate-500">
                Page {currentPage} of {totalPages} - {weeklyPages[currentPage - 1]?.label || 'No Week'}
            </p>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setCurrentPage((previousPage) => Math.max(1, previousPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-[12px] font-semibold rounded-md border border-[#D0D5DD] disabled:opacity-40"
                >
                    Prev
                </button>
                <button
                    onClick={() => setCurrentPage((previousPage) => Math.min(totalPages, previousPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 text-[12px] font-semibold rounded-md border border-[#D0D5DD] disabled:opacity-40"
                >
                    Next
                </button>
            </div>
        </div>
    );

    if (authLoading || (loading && reportData.length === 0)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-10 h-10 text-[#101828] animate-spin" />
                <p className="text-[#667085] font-medium text-[14px]">Generating your report...</p>
            </div>
        );
    }

    return (
        <div className="max-w-full space-y-8 animate-fade-in pb-20 px-2 lg:px-4">
            {/* Minimal Filter Bar */}
            <div className="bg-white p-4 rounded-md border border-[#E6E8EC] grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-12 gap-3 items-end shadow-sm">
                <div className="w-full xl:col-span-3">
                    <label className="text-[11px] font-bold text-slate-500 block mb-1.5">Employee</label>
                    <div className={`flex items-center gap-2 px-3 py-2.5 border border-[#D0D5DD] rounded-xl ${canUseAdvancedFilters ? 'bg-white' : 'bg-slate-50'}`}>
                        <Search size={16} className="text-slate-500" />
                        <select 
                            value={selectedEmployeeId || 'all'}
                            onChange={(e) => setSelectedEmployeeId(e.target.value)}
                            className="w-full bg-transparent text-[14px] font-semibold text-[#101828] outline-none cursor-pointer disabled:cursor-not-allowed"
                            disabled={!canUseAdvancedFilters}
                        >
                            <option value="all">All Members</option>
                            {employeeOptions
                                .filter((employee) => selectedDepartment === 'all' || employee.department === selectedDepartment)
                                .map((employee) => (
                                    <option key={employee.id} value={employee.id}>{employee.name}</option>
                                ))}
                        </select>
                    </div>
                </div>

                <div className="w-full xl:col-span-3">
                    <label className="text-[11px] font-bold text-slate-500 block mb-1.5">Timeframe</label>
                    <div 
                        onClick={() => monthRef.current?.showPicker()}
                        className="flex items-center gap-2 px-3 py-2.5 border border-[#D0D5DD] rounded-xl cursor-pointer group"
                    >
                        <Calendar size={16} className="text-slate-500" />
                        <div className="relative w-full">
                            <input 
                                ref={monthRef}
                                type="month" 
                                value={complianceMonth}
                                onChange={(e) => setComplianceMonth(e.target.value)}
                                className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
                            />
                            <span className="text-[14px] font-semibold text-[#101828] pointer-events-none">
                                {complianceMonth ? new Date(`${complianceMonth}-01`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : 'Select Month'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="w-full xl:col-span-3">
                    <label className="text-[11px] font-bold text-slate-500 block mb-1.5">Department</label>
                    <div className={`flex items-center gap-2 px-3 py-2.5 border border-[#D0D5DD] rounded-xl ${canUseAdvancedFilters ? 'bg-white' : 'bg-slate-50'}`}>
                        <Filter size={16} className="text-slate-500" />
                        <select
                            value={selectedDepartment}
                            onChange={(e) => {
                                setSelectedDepartment(e.target.value);
                                setSelectedEmployeeId('all');
                            }}
                            className="w-full bg-transparent text-[14px] font-semibold text-[#101828] outline-none cursor-pointer disabled:cursor-not-allowed"
                            disabled={!canUseAdvancedFilters}
                        >
                            <option value="all">All Departments</option>
                            {departmentOptions.map((departmentName) => (
                                <option key={departmentName} value={departmentName}>{departmentName}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="w-full sm:col-span-2 xl:col-span-3 flex flex-col sm:flex-row sm:justify-end gap-3">
                    <button
                        onClick={() => fetchReport()}
                        className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 border border-[#101828] text-[#101828] rounded-xl text-[12px] font-semibold transition-all active:scale-95"
                    >
                        <Filter size={14} />
                        Filters
                    </button>
                    <button 
                        onClick={handleExportExcel}
                        disabled={exportLoading || reportData.length === 0}
                        className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-[#101828] text-white rounded-xl text-[12px] font-semibold transition-all disabled:opacity-50 active:scale-95"
                    >
                        {exportLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                        Export Excel
                    </button>
                </div>
            </div>

            <main className="space-y-12">
                {selectedEmployeeId && selectedEmployeeId !== 'all' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        {/* LEFT SIDE: Detailed Logs */}
                        <div className="lg:col-span-8 space-y-4">
                            <div className="flex items-center justify-between gap-3 px-2">
                                <h2 className="text-[16px] font-semibold text-[#101828] uppercase tracking-widest flex items-center gap-2">
                                    <button 
                                        onClick={() => setSelectedEmployeeId('all')}
                                        className="p-1.5 hover:bg-slate-100 rounded-lg transition-all text-slate-400 hover:text-[#101828]"
                                        title="Back to All Members"
                                    >
                                        <ArrowLeft size={18} />
                                    </button>
                                    Daily Attendance Log
                                </h2>
                            </div>
                            {activeWeekLabel && (
                                <div className="px-2">
                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-100">
                                        <span className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider">{activeWeekLabel}</span>
                                    </div>
                                </div>
                            )}
                            <div className="bg-white border border-[#E6E8EC] rounded-lg overflow-hidden shadow-sm">
                                <div className="overflow-x-auto no-scrollbar">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50/50 border-b border-[#E6E8EC]">
                                                <th className="px-6 py-4 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Date Detail</th>
                                                <th className="px-6 py-4 text-[10px] font-semibold text-slate-400 uppercase tracking-widest text-center">In/Out</th>
                                                <th className="px-6 py-4 text-[10px] font-semibold text-slate-400 uppercase tracking-widest text-right">Hours</th>
                                                <th className="px-6 py-4 text-[10px] font-semibold text-slate-400 uppercase tracking-widest text-right">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#E6E8EC]">
                                            {paginatedReportData.map((row, idx) => {
                                                const date = new Date(row.Date);
                                                const displayDate = date.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });
                                                const statusText = formatStatus(row);
                                                const rowKey = `${row.id}-${row.Date}`;
                                                const punches = Array.isArray(row.Punches) ? row.Punches : [];
                                                const isExpanded = expandedLogRow === rowKey;
                                                const canExpand = punches.length > 0;
                                                return (
                                                    <React.Fragment key={`${rowKey}-${idx}`}>
                                                        <tr
                                                            className={`transition-colors ${canExpand ? 'cursor-pointer hover:bg-slate-50/80' : 'hover:bg-slate-50/50'}`}
                                                            onClick={() => {
                                                                if (!canExpand) return;
                                                                setExpandedLogRow(isExpanded ? null : rowKey);
                                                            }}
                                                        >
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-2">
                                                                {canExpand && (
                                                                    <ChevronDown
                                                                        size={14}
                                                                        className={`text-slate-400 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                                                    />
                                                                )}
                                                                <div className="flex flex-col">
                                                                    <span className="text-[13px] font-bold text-[#101828]">{displayDate}</span>
                                                                    <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">{row.Date.split('T')[0]}</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-[13px] font-semibold text-[#101828] tabular-nums">{getPunchDisplay(row, 'FirstPunch')}</span>
                                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">to {getPunchDisplay(row, 'LastPunch')}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <span className="text-[13px] font-semibold text-[#101828] tabular-nums">{formatDuration(row.TotalWorkedHours)}</span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-widest ${
                                                                statusText.toUpperCase().includes('SHORT') ? 'bg-rose-50 text-rose-500 border border-rose-100' :
                                                                (statusText.toUpperCase().includes('PRESENT') || statusText.toUpperCase() === 'COMPENSATED' || statusText.toUpperCase() === 'ON-SITE') ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                                                statusText.toUpperCase() === 'LEAVE' ? 'bg-indigo-50 text-indigo-500 border border-indigo-100' :
                                                                statusText.toUpperCase() === 'WEEKEND' ? 'bg-slate-50 text-slate-400 border border-slate-100' :
                                                                'bg-amber-50 text-amber-600 border border-amber-100'
                                                            }`}>
                                                                {statusText}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                    {isExpanded && punches.length > 0 && (
                                                        <tr className="bg-slate-50/50">
                                                            <td colSpan={4} className="px-8 py-4 border-t border-slate-100">
                                                                <div className="flex items-center gap-3 flex-wrap">
                                                                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Punch Details:</span>
                                                                    {punches.map((p: { time: string; label: string; type: string }, pi: number) => (
                                                                        <div key={pi} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl shadow-xs">
                                                                            <div className={`w-1.5 h-1.5 rounded-full ${p.type === 'IN' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                                            <span className="text-[11px] font-semibold text-[#101828]">{formatPunchTime(p.time)}</span>
                                                                            <span className="text-[10px] text-slate-300 font-bold uppercase">{p.label}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                {renderPagination()}
                            </div>
                        </div>

                        {/* RIGHT SIDE: Statistics */}
                        <div className="lg:col-span-4 space-y-6 sticky top-[100px]">
                            {/* Weekly Performance */}
                            <div className="bg-white border border-[#E6E8EC] rounded-xl p-8 shadow-sm">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-[13px] font-semibold text-slate-400 uppercase tracking-[0.2em]">Weekly Snapshot</h3>
                                    <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-semibold rounded-lg uppercase tracking-tight">This Week</span>
                                </div>
                                {(() => {
                                    // Robust Date Sync (IST to UTC)
                                    const istNow = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
                                    const todayDate = new Date(istNow);
                                    todayDate.setHours(0,0,0,0);
                                    
                                    const day = todayDate.getDay(); // 0 Sun
                                    const diffToMon = day === 0 ? 6 : day - 1;
                                    const mondayStr = new Date(todayDate.getTime() - (diffToMon * 86400000)).toISOString().split('T')[0];
                                    const monday = new Date(`${mondayStr}T00:00:00.000Z`);
                                    const todayMark = new Date(`${todayDate.toISOString().split('T')[0]}T00:00:00.000Z`);

                                    const thisWeekRecords = reportData.filter(r => {
                                        const dateStr = typeof r.Date === 'string' ? r.Date.split('T')[0] : '';
                                        const dateObj = dateStr ? new Date(`${dateStr}T00:00:00.000Z`) : new Date(0);
                                        return dateObj >= monday && dateObj <= todayMark;
                                    });

                                    // Worked: include everything up to today
                                    const totalWorked = (groupSummaries(thisWeekRecords)[0] as any)?.worked || 0;
                                    
                                    // Target: Passed days only (Mon..Yesterday) to match user "32h" expectation on Friday
                                    const passedWeekRecords = thisWeekRecords.filter(r => {
                                        const dateStr = typeof r.Date === 'string' ? r.Date.split('T')[0] : '';
                                        const dateObj = dateStr ? new Date(`${dateStr}T00:00:00.000Z`) : new Date(0);
                                        return dateObj < todayMark;
                                    });
                                    const weeklyGoal = (groupSummaries(passedWeekRecords)[0] as any)?.target || 0;
                                    
                                    const completion = weeklyGoal > 0 ? Math.min(100, Math.round((totalWorked / weeklyGoal) * 100)) : 0;
                                    
                                    return (
                                        <div className="space-y-8">
                                            <div className="flex flex-col gap-4">
                                                <div className="flex justify-between items-end">
                                                    <div>
                                                        <h4 className="text-2xl font-semibold text-[#101828] tabular-nums">
                                                            {formatDuration(totalWorked)}
                                                            <span className="text-[14px] text-slate-400 font-bold ml-2">/ {weeklyGoal.toFixed(1)} Hrs</span>
                                                        </h4>
                                                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-1">Worked this week (Adj. Target)</p>
                                                    </div>
                                                    <span className={`px-3 py-1 rounded-lg text-[11px] font-semibold uppercase tracking-wider ${completion >= 90 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                                        {completion}% Done
                                                    </span>
                                                </div>
                                                
                                                <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                                                    <motion.div 
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${completion}%` }}
                                                        className={`h-full transition-all duration-1000 ${completion >= 90 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                                    />
                                                </div>
                                            </div>

                                            <div className={`p-5 rounded-md border flex items-center gap-4 ${completion >= 100 ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${completion >= 100 ? 'bg-emerald-500 text-white' : 'bg-white text-indigo-500 border border-indigo-100 shadow-sm'}`}>
                                                    {completion >= 100 ? <Activity size={20} /> : <Calendar size={20} />}
                                                </div>
                                                <div>
                                                    <p className={`text-[13px] font-semibold uppercase tracking-tight ${completion >= 100 ? 'text-emerald-700' : 'text-[#101828]'}`}>
                                                        {completion >= 100 ? 'Weekly Goal Met' : `${Math.max(0, weeklyGoal - totalWorked).toFixed(1)} Hours to Goal`}
                                                    </p>
                                                    <p className="text-[10px] font-bold text-slate-500 mt-0.5">Adjusted for Govt. Holidays & Personal Leaves</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Monthly Performance */}
                            <div className="bg-[#101828] rounded-xl p-8 shadow-xl text-white">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-[13px] font-semibold text-slate-400 uppercase tracking-[0.2em]">Monthly Overview</h3>
                                    <span className="px-2.5 py-1 bg-white/10 text-white text-[10px] font-semibold rounded-lg uppercase tracking-tight">{complianceMonth || 'Period Total'}</span>
                                </div>
                                {(() => {
                                    const summary = (groupSummaries(reportData)[0] || { worked: 0, target: 0 }) as any;
                                    const diff = summary.worked - summary.target;
                                    const isPositive = diff >= 0;

                                    return (
                                        <div className="space-y-10">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Calculated Work</p>
                                                    <h4 className="text-base font-semibold">{formatDuration(summary.worked)}</h4>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Required Shift</p>
                                                    <h4 className="text-base font-semibold text-slate-400">{summary.target}:00 <span className="text-[10px] block">Excl. Leaves/Holidays</span></h4>
                                                </div>
                                            </div>

                                            <div className="p-6 rounded-lg bg-white/5 border border-white/10">
                                                <div className="flex items-center justify-between mb-4">
                                                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Efficiency Status</p>
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-widest ${isPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                                        {isPositive ? 'Completed' : 'Deficit'}
                                                    </span>
                                                </div>
                                                <div className="flex items-end gap-2">
                                                    <h3 className={`text-2xl font-semibold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                        {isPositive ? '+' : '-'}{formatDuration(Math.abs(diff))}
                                                    </h3>
                                                    <p className="text-[11px] font-bold text-slate-500 mb-1.5 uppercase">Hours {isPositive ? 'Overtime' : 'Shortage'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                ) : canViewLopSummary ? (
                    <section>
                        <div className="flex flex-col gap-1 mb-4">
                            <h2 className="text-[18px] font-bold text-[#101828]">
                                {isAccountant ? 'Accountant Attendance Sheet' : 'Attendance LOP Summary'}
                            </h2>
                            <p className="text-[12px] font-medium text-slate-500">
                                Payroll period: 1st → last day of month
                                {meta?.payrollPeriodStart && meta?.payrollPeriodEnd
                                    ? ` (${meta.payrollPeriodStart} to ${meta.payrollPeriodEnd})`
                                    : ''}
                                {meta?.companyWorkingDays ? ` • ${meta.companyWorkingDays} company working days` : ''}
                            </p>
                            <p className="text-[11px] text-slate-400">
                                1st/3rd/5th Saturday = WFH (counts present without biometric punch) • 2nd/4th Saturday = scheduled leave • Sunday off
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                            <div className="bg-white border border-[#E6E8EC] rounded-md px-5 py-4 shadow-sm">
                                <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Total Employees (Today)</p>
                                <p className="text-[26px] font-bold text-[#101828] mt-1">{accountantTodayCounts.totalEmployees}</p>
                            </div>
                            <div className="bg-white border border-emerald-100 rounded-md px-5 py-4 shadow-sm">
                                <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-700">Present Today</p>
                                <p className="text-[26px] font-bold text-emerald-700 mt-1">{accountantTodayCounts.presentToday}</p>
                            </div>
                            <div className="bg-white border border-rose-100 rounded-md px-5 py-4 shadow-sm">
                                <p className="text-[11px] font-semibold uppercase tracking-widest text-rose-700">Absent Today</p>
                                <p className="text-[26px] font-bold text-rose-700 mt-1">{accountantTodayCounts.absentToday}</p>
                            </div>
                            <div className="bg-white border border-indigo-100 rounded-md px-5 py-4 shadow-sm">
                                <p className="text-[11px] font-semibold uppercase tracking-widest text-indigo-700">Leave Today</p>
                                <p className="text-[26px] font-bold text-indigo-700 mt-1">{accountantTodayCounts.leaveToday}</p>
                            </div>
                        </div>

                        <div className="bg-white border border-[#E6E8EC] rounded-md overflow-hidden shadow-sm overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[860px]">
                                <thead>
                                    <tr className="bg-slate-50/80 border-b border-[#E6E8EC]">
                                        <th className="px-6 py-4 text-[12px] font-bold text-[#667085]">Employee Name</th>
                                        <th className="px-6 py-4 text-[12px] font-bold text-[#667085] text-center">Total Working Days (Company)</th>
                                        <th className="px-6 py-4 text-[12px] font-bold text-[#667085] text-center">Total Present Days</th>
                                        <th className="px-6 py-4 text-[12px] font-bold text-[#667085] text-center">Total Leave Days</th>
                                        <th className="px-6 py-4 text-[12px] font-bold text-[#667085] text-center">Total Absent Days</th>
                                        <th className="px-6 py-4 text-[12px] font-bold text-[#667085] text-center">LOP Days</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E6E8EC]">
                                    {accountantSummaryRows.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium">
                                                No employee records found for the selected period
                                            </td>
                                        </tr>
                                    ) : (
                                        accountantSummaryRows.map((summaryRow) => (
                                            <tr
                                                key={summaryRow.employeeId}
                                                onClick={() => setSelectedAccountantEmployee(summaryRow)}
                                                className="hover:bg-indigo-50/50 transition-colors cursor-pointer group"
                                            >
                                                <td className="px-6 py-4 text-[14px] font-semibold text-[#101828] group-hover:text-indigo-700 flex items-center gap-1">
                                                    {summaryRow.name}
                                                    <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-500 shrink-0" />
                                                </td>
                                                <td className="px-6 py-4 text-[14px] text-[#101828] text-center font-semibold">{summaryRow.companyWorkingDays}</td>
                                                <td className="px-6 py-4 text-[14px] text-emerald-700 text-center font-semibold">{summaryRow.presentDays}</td>
                                                <td className="px-6 py-4 text-[14px] text-indigo-700 text-center font-semibold">{summaryRow.leaveDays}</td>
                                                <td className="px-6 py-4 text-[14px] text-rose-700 text-center font-semibold">{summaryRow.absentDays}</td>
                                                <td className="px-6 py-4 text-[14px] text-amber-700 text-center font-semibold">{summaryRow.lopDays ?? 0}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-3">
                            Click an employee name to open the payroll calendar with absent dates and day details.
                        </p>
                    </section>
                ) : (
                    <>
                        {/* Detailed Logs Section - Standard View */}
                        <section>
                            <div className="flex items-center gap-3 mb-4">
                                <h2 className="text-[18px] font-bold text-[#101828]">Weekly Attendance Report (Mon–Sat, 8 Hrs/Day)</h2>
                            </div>
                            {activeWeekLabel && (
                                <div className="mb-3">
                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-100">
                                        <span className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider">{activeWeekLabel}</span>
                                    </div>
                                </div>
                            )}
                            
                            <div className="bg-white border border-[#E6E8EC] rounded-md overflow-hidden shadow-sm overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[1000px]">
                                    <thead>
                                        <tr className="bg-slate-50/80 border-b border-[#E6E8EC]">
                                            <th className="px-6 py-4 text-[12px] font-bold text-[#667085]">Employee Name</th>
                                            <th className="px-6 py-4 text-[12px] font-bold text-[#667085]">Day</th>
                                            <th className="px-6 py-4 text-[12px] font-bold text-[#667085]">IN Time</th>
                                            <th className="px-6 py-4 text-[12px] font-bold text-[#667085]">OUT Time</th>
                                            <th className="px-6 py-4 text-[12px] font-bold text-[#667085]">Total Hours</th>
                                            <th className="px-6 py-4 text-[12px] font-bold text-[#667085]">Required Hours</th>
                                            <th className="px-6 py-4 text-[12px] font-bold text-[#667085] text-center">LOP</th>
                                            <th className="px-6 py-4 text-[12px] font-bold text-[#667085]">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#E6E8EC]">
                                        {reportData.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} className="px-6 py-12 text-center text-slate-400 font-medium">No records found for the selected period</td>
                                            </tr>
                                        ) : (
                                            paginatedReportData.map((row, idx) => {
                                                const date = new Date(row.Date);
                                                const displayDate = date.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short' });
                                                const statusText = formatStatus(row);
                                                
                                                return (
                                                    <React.Fragment key={`${row.id}-${row.Date}-${idx}`}>
                                                        <tr className="hover:bg-slate-50/40 transition-colors">
                                                            <td className="px-6 py-4">
                                                                <button 
                                                                    onClick={() => setSelectedEmployeeId(row.id)}
                                                                    className="text-[14px] font-semibold text-[#101828] hover:text-indigo-600 hover:underline transition-all"
                                                                >
                                                                    {row.Name}
                                                                </button>
                                                            </td>
                                                            <td className="px-6 py-4 text-[14px] text-[#667085]">{displayDate}</td>
                                                            <td className="px-6 py-4 text-[14px] text-[#101828] font-medium">{getPunchDisplay(row, 'FirstPunch')}</td>
                                                            <td className="px-6 py-4 text-[14px] text-[#101828] font-medium">{getPunchDisplay(row, 'LastPunch')}</td>
                                                            <td className="px-6 py-4 text-[14px] font-bold text-[#101828]">{formatDuration(row.TotalWorkedHours)}</td>
                                                            <td className="px-6 py-4 text-[14px] text-[#667085]">
                                                                {(date.getDay() === 0 || row.Status === 'HOLIDAY') ? '00:00' : formatDuration(MIN_FULL_DAY_HOURS)}
                                                            </td>
                                                            <td className="px-6 py-4 text-[13px] text-center font-semibold text-amber-700">
                                                                {Number(row.LopPortion || 0) > 0 ? Number(row.LopPortion).toFixed(1) : '-'}
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className={`px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider ${
                                                                    statusText.toUpperCase().includes('SHORT') ? 'bg-rose-50 text-rose-600' :
                                                                    (statusText.toUpperCase().includes('PRESENT') || statusText.toUpperCase() === 'COMPENSATED' || statusText.toUpperCase() === 'ON-SITE' || statusText.toUpperCase() === 'PRESENT WFH') ? 'bg-emerald-50 text-emerald-600' :
                                                                    statusText.toUpperCase() === 'LEAVE' ? 'bg-indigo-50 text-indigo-600' :
                                                                    'bg-slate-100 text-slate-500'
                                                                }`}>
                                                                    {statusText}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    </React.Fragment>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            {renderPagination()}
                        </section>
        
                    </>
                )}
            </main>

            {selectedAccountantEmployee && (
                <AccountantEmployeeCalendar
                    employeeName={selectedAccountantEmployee.name}
                    payrollPeriodStart={meta?.payrollPeriodStart}
                    payrollPeriodEnd={meta?.payrollPeriodEnd}
                    joiningDate={selectedAccountantEmployee.joiningDate}
                    firstBiometricDate={selectedAccountantEmployee.firstBiometricDate}
                    effectiveAttendanceStart={selectedAccountantEmployee.effectiveAttendanceStart}
                    companyWorkingDays={selectedAccountantEmployee.companyWorkingDays}
                    presentDays={selectedAccountantEmployee.presentDays}
                    leaveDays={selectedAccountantEmployee.leaveDays}
                    absentDays={selectedAccountantEmployee.absentDays}
                    days={selectedAccountantCalendarDays}
                    onClose={() => setSelectedAccountantEmployee(null)}
                />
            )}
        </div>
    );
}
