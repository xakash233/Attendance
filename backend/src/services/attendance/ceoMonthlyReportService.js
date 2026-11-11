import ExcelJS from 'exceljs';
import prisma from '../../config/prisma.js';
import sendEmail from '../../utils/email.js';
import {
    countCompanyWorkingDaysInRange,
    getCompanyDayCategory,
    getEffectiveAttendanceStart,
    isCompanyWorkingDay
} from '../../utils/payrollCalendar.js';
import { buildAccountantSummaries, isExcludedFromAccountantSheet } from '../../utils/accountantAttendance.js';
import calculateAttendance, { MIN_FULL_DAY_HOURS } from '../../utils/attendanceCalculator.js';
import { applyUserHourAdjustment } from '../../utils/userHourAdjustments.js';
import { collapsePunchBursts } from '../../utils/punchDedup.js';
import { resolveHybridWorkDay } from '../../utils/hybridWorkSchedule.js';
import { isIgnoredEmployee } from '../../utils/ignoredEmployees.js';

const CEO_RECIPIENT_EMAIL = process.env.CEO_REPORT_EMAIL || 'santosh@tectratechnologies.com';
const HRMS_PORTAL_URL = 'https://hrms.tectratechnologies.com';

/**
 * Formats decimal hours into a clear, unambiguous "Xh Ymin" string.
 * e.g., 7.5 -> "7h 30min", 157.5 -> "157h 30min", 0 -> "0h 00min"
 */
export function formatHoursAndMinutes(decimalHours) {
    const val = parseFloat(decimalHours || 0);
    if (isNaN(val) || val <= 0) return '0h 00min';
    const totalMinutes = Math.round(val * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${String(minutes).padStart(2, '0')}min`;
}

/**
 * Computes start and end date bounds for the 29th monthly report.
 * Supports:
 * - Specific month/year string (e.g. "2026-10" or year=2026, month=10) -> 1st to 29th of that month.
 * - Default: Current month in IST from 1st to 29th (or last day of February).
 */
export function getCeoReportBounds(monthParam = null, yearParam = null) {
    const istNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    let year = istNow.getFullYear();
    let monthIndex = istNow.getMonth(); // 0-based: 0 = Jan, 9 = Oct, 10 = Nov

    if (monthParam !== null && monthParam !== undefined) {
        if (typeof monthParam === 'string' && monthParam.includes('-')) {
            const parts = monthParam.split('-');
            year = parseInt(parts[0], 10);
            monthIndex = parseInt(parts[1], 10) - 1;
        } else {
            monthIndex = parseInt(monthParam, 10) - 1;
            if (yearParam) year = parseInt(yearParam, 10);
        }
    }

    // Start of the month (01)
    const monthNum = String(monthIndex + 1).padStart(2, '0');
    const startStr = `${year}-${monthNum}-01`;
    const start = new Date(`${startStr}T00:00:00.000Z`);

    // In February: 28 in normal years, 29 in leap years.
    // In other months: 29th.
    let targetEndDay = 29;
    if (monthIndex === 1) { // February
        const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
        targetEndDay = isLeap ? 29 : 28;
    }

    const endDayStr = String(targetEndDay).padStart(2, '0');
    const endStr = `${year}-${monthNum}-${endDayStr}`;
    const end = new Date(`${endStr}T23:59:59.999Z`);

    const monthLabel = start.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

    return {
        year,
        month: monthIndex + 1,
        monthLabel,
        targetEndDay,
        startDateStr: startStr,
        endDateStr: endStr,
        start,
        end
    };
}

/**
 * Builds the strictly 4-column report data for eligible employees.
 */
export async function buildCeoReportData({ start, end }) {
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    // 1. Fetch active employees
    const users = await prisma.user.findMany({
        where: { isAccessEnabled: true },
        select: {
            id: true,
            name: true,
            email: true,
            employeeCode: true,
            joiningDate: true,
            role: true,
            department: { select: { name: true } }
        },
        orderBy: { name: 'asc' }
    });

    // Exclude CEO (Santosh) and executive exempt accounts or blacklisted employees
    const eligibleUsers = users.filter((u) => {
        if (isIgnoredEmployee(u)) return false;
        const email = String(u.email || '').toLowerCase().trim();
        const name = String(u.name || '').toUpperCase().trim();
        if (email === 'santosh@tectratechnologies.com') return false;
        if (name.includes('SANTOSH')) return false;
        if (isExcludedFromAccountantSheet(u.name)) return false;
        return true;
    });

    const scopedUserIds = eligibleUsers.map((u) => u.id);

    // 2. Fetch biometric enrollment dates
    const biometricFirstGroups = scopedUserIds.length
        ? await prisma.biometricAttendance.groupBy({
            by: ['userId'],
            where: { userId: { in: scopedUserIds } },
            _min: { timestamp: true }
        })
        : [];

    const firstBiometricDateByUserId = new Map(
        biometricFirstGroups.map((group) => [
            group.userId,
            group._min.timestamp.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
        ])
    );

    const biometricEnrolledUserIds = eligibleUsers
        .filter((user) => {
            const firstBiometricDate = firstBiometricDateByUserId.get(user.id);
            if (!firstBiometricDate) return false;
            const joiningDateStr = user.joiningDate
                ? user.joiningDate.toISOString().split('T')[0]
                : null;
            if (!joiningDateStr) return true;
            return firstBiometricDate >= joiningDateStr;
        })
        .map((user) => user.id);

    const rangeStartIst = new Date(`${start.toISOString().split('T')[0]}T00:00:00.000+05:30`);
    const rangeEndIst = new Date(`${end.toISOString().split('T')[0]}T23:59:59.999+05:30`);

    // 3. Batch fetch all attendance, leaves, holidays, wfh, and punches
    const [allAttendance, allLeaves, allHolidays, allWfh, rangeBiometric] = await Promise.all([
        prisma.attendance.findMany({
            where: {
                date: { gte: start, lte: end },
                userId: { in: scopedUserIds }
            }
        }),
        prisma.leaveRequest.findMany({
            where: {
                OR: [
                    { startDate: { gte: start, lte: end } },
                    { endDate: { gte: start, lte: end } },
                    { AND: [{ startDate: { lte: start } }, { endDate: { gte: end } }] }
                ],
                userId: { in: scopedUserIds }
            },
            include: { leaveType: true }
        }),
        prisma.holiday.findMany({
            where: { date: { gte: start, lte: end } }
        }),
        prisma.wfhRequest.findMany({
            where: {
                userId: { in: scopedUserIds },
                wfhDate: { gte: start, lte: end }
            }
        }),
        prisma.biometricAttendance.findMany({
            where: {
                userId: { in: scopedUserIds },
                timestamp: { gte: rangeStartIst, lte: rangeEndIst }
            },
            orderBy: { timestamp: 'asc' }
        })
    ]);

    const holidayDateSet = new Set(
        allHolidays.map((holiday) => holiday.date.toISOString().split('T')[0])
    );
    const companyWorkingDaysTotal = countCompanyWorkingDaysInRange(start, end, holidayDateSet);

    // Group punches by user and day
    const biometricByUserDate = new Map();
    for (const punch of rangeBiometric) {
        const punchDateStr = punch.timestamp.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        const key = `${punch.userId}_${punchDateStr}`;
        if (!biometricByUserDate.has(key)) {
            biometricByUserDate.set(key, []);
        }
        biometricByUserDate.get(key).push(punch.timestamp);
    }
    for (const [key, timestamps] of biometricByUserDate) {
        biometricByUserDate.set(key, collapsePunchBursts(timestamps));
    }

    const reportRows = [];
    const periodStartStr = start.toISOString().split('T')[0];

    // 4. Construct daily rows for each user
    for (const user of eligibleUsers) {
        const joiningDateStr = user.joiningDate
            ? user.joiningDate.toISOString().split('T')[0]
            : null;
        const firstBiometricDateStr = firstBiometricDateByUserId.get(user.id) ?? null;
        const effectiveAttendanceStart = getEffectiveAttendanceStart(
            periodStartStr,
            joiningDateStr,
            firstBiometricDateStr
        );

        let iter = new Date(start);
        while (iter <= end) {
            const dateStr = iter.toISOString().split('T')[0];
            const dayCategory = getCompanyDayCategory(dateStr);
            const holiday = allHolidays.find((h) => h.date.toISOString().split('T')[0] === dateStr);
            const isHoliday = Boolean(holiday);
            const isBeforeEffectiveStart = dateStr < effectiveAttendanceStart;
            const isCompanyWorkday = isCompanyWorkingDay(dateStr, { isHoliday }) && !isBeforeEffectiveStart;

            const wfh = allWfh.find((request) => {
                const requestStatus = String(request.status || '').toUpperCase();
                const isApproved = !requestStatus.includes('PENDING') && !requestStatus.includes('REJECTED');
                return request.userId === user.id
                    && request.wfhDate.toISOString().split('T')[0] === dateStr
                    && isApproved;
            });

            const att = allAttendance.find((a) => a.userId === user.id && a.date.toISOString().split('T')[0] === dateStr);
            const leave = allLeaves.find((l) => {
                const ls = new Date(l.startDate); ls.setUTCHours(0, 0, 0, 0);
                const le = new Date(l.endDate); le.setUTCHours(0, 0, 0, 0);
                const d = new Date(iter); d.setUTCHours(0, 0, 0, 0);
                return l.userId === user.id && d >= ls && d <= le;
            });

            const todayRef = new Date();
            todayRef.setUTCHours(0, 0, 0, 0);
            const isFuture = new Date(iter) > todayRef;

            let status = isFuture ? 'SCHEDULED' : 'ABSENT';
            let hours = att ? (att.workingHours || 0) : 0;
            let remarks = 'N/A';

            if (isBeforeEffectiveStart) {
                status = isFuture ? 'SCHEDULED' : 'NOT_JOINED';
                hours = 0;
            } else if (isHoliday) {
                status = 'HOLIDAY';
                remarks = holiday.name;
                hours = Math.max(hours, 8.0);
            } else if (dayCategory === 'SUNDAY') {
                status = 'WEEKEND';
            } else if (dayCategory === 'SAT_LEAVE') {
                status = 'LEAVE';
                remarks = '2nd/4th Saturday (Scheduled Leave)';
            } else if (dayCategory === 'SAT_WFH' || wfh) {
                status = 'WFH';
                remarks = wfh ? 'WFH (Approved)' : '1st/3rd/5th Saturday (WFH)';
                hours = Math.max(hours, MIN_FULL_DAY_HOURS);
            }

            if (att && dayCategory !== 'SAT_LEAVE' && dayCategory !== 'SUNDAY' && !isHoliday && !wfh && dayCategory !== 'SAT_WFH') {
                status = att.status.replace(/_/g, ' ');
            }

            if (leave && !leave.status.includes('REJECTED')) {
                const lType = (leave.leaveType?.name || 'LEAVE').toUpperCase();
                if (leave.durationType === 'FIRST_HALF' || leave.durationType === 'SECOND_HALF') {
                    status = `HALF DAY ${lType}`;
                    hours = Math.max(hours, 4.0);
                    remarks = 'HALF DAY LEAVE';
                } else {
                    status = lType;
                    hours = Math.max(hours, 8.0);
                    remarks = 'APPROVED LEAVE';
                }
            }

            const dayPunchTimestamps = isBeforeEffectiveStart ? [] : (biometricByUserDate.get(`${user.id}_${dateStr}`) || []);
            let firstPunch = null;
            let lastPunch = null;
            let actualWorkedToday = att ? (att.workingHours || 0) : 0;

            if (dayPunchTimestamps.length > 0) {
                firstPunch = dayPunchTimestamps[0];
                lastPunch = dayPunchTimestamps[dayPunchTimestamps.length - 1];
                const dayLogs = dayPunchTimestamps.map((ts) => ({ timestamp: ts, employeeCode: user.employeeCode }));
                const dayCalcResult = calculateAttendance(dayLogs, '23:59', dateStr);
                actualWorkedToday = applyUserHourAdjustment(user.id, dayCalcResult.totalWorkHours, dateStr);
                hours = actualWorkedToday;
            }

            const hybridDay = resolveHybridWorkDay({
                employeeCode: user.employeeCode,
                dateStr,
                dayCategory,
                isHoliday,
                isBeforeEffectiveStart,
                isFuture,
                hasBiometricPunch: dayPunchTimestamps.length > 0,
                hasOfficeAttendance: actualWorkedToday > 0.1,
                leave
            });
            if (hybridDay.autoWfh) {
                status = 'WFH';
                hours = Math.max(hours, 8.0);
                actualWorkedToday = Math.max(actualWorkedToday, 8.0);
            }

            reportRows.push({
                id: user.id,
                Name: user.name,
                EmployeeCode: user.employeeCode,
                Department: user.department?.name || 'N/A',
                Date: dateStr,
                IsCompanyWorkingDay: isCompanyWorkday,
                IsBeforeEffectiveStart: isBeforeEffectiveStart,
                DayCategory: dayCategory,
                Status: status,
                Remarks: remarks,
                FirstPunch: firstPunch ? new Date(firstPunch).toISOString() : '',
                LastPunch: lastPunch ? new Date(lastPunch).toISOString() : '',
                TotalWorkedHours: actualWorkedToday.toFixed(2),
                JoiningDate: joiningDateStr,
                FirstBiometricDate: firstBiometricDateStr,
                EffectiveAttendanceStart: effectiveAttendanceStart
            });

            iter.setUTCDate(iter.getUTCDate() + 1);
        }
    }

    // 5. Build accountant summaries
    const summaries = buildAccountantSummaries(reportRows, {
        companyWorkingDays: companyWorkingDaysTotal,
        enrolledUserIds: biometricEnrolledUserIds
    });

    let totalOfficeHoursSum = 0;
    let totalEmployeeHoursSum = 0;
    let totalShortHoursSum = 0;

    const fourColumnRows = summaries.map((s) => {
        const officeHours = s.companyWorkingHours;
        const employeeHours = s.employeeWorkedHours;
        const shortHours = Math.max(0, Number((officeHours - employeeHours).toFixed(1)));

        totalOfficeHoursSum += officeHours;
        totalEmployeeHoursSum += employeeHours;
        totalShortHoursSum += shortHours;

        return {
            name: s.name,
            officeWorkingHours: formatHoursAndMinutes(officeHours),
            employeeWorkingHours: formatHoursAndMinutes(employeeHours),
            shortHours: formatHoursAndMinutes(shortHours),
            officeHoursDecimal: Number(officeHours.toFixed(1)),
            employeeHoursDecimal: Number(employeeHours.toFixed(1)),
            shortHoursDecimal: Number(shortHours.toFixed(1)),
            isShort: shortHours > 0
        };
    });

    return {
        companyWorkingDays: companyWorkingDaysTotal,
        totalEmployees: fourColumnRows.length,
        totalOfficeHoursSum: Number(totalOfficeHoursSum.toFixed(1)),
        totalEmployeeHoursSum: Number(totalEmployeeHoursSum.toFixed(1)),
        totalShortHoursSum: Number(totalShortHoursSum.toFixed(1)),
        totalOfficeHoursDisplay: formatHoursAndMinutes(totalOfficeHoursSum),
        totalEmployeeHoursDisplay: formatHoursAndMinutes(totalEmployeeHoursSum),
        totalShortHoursDisplay: formatHoursAndMinutes(totalShortHoursSum),
        employees: fourColumnRows
    };
}

/**
 * Builds the official Excel spreadsheet (.xlsx) with 4 columns.
 */
export async function buildCeoReportExcelBuffer({ reportData, bounds }) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Tectra Technologies HRMS';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Working Hours Report', {
        views: [{ showGridLines: true }]
    });

    // Title banner
    sheet.mergeCells('A1:D1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'TECTRA TECHNOLOGIES - EMPLOYEE WORKING HOURS REPORT';
    titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 32;

    // Subtitle banner
    sheet.mergeCells('A2:D2');
    const subtitleCell = sheet.getCell('A2');
    subtitleCell.value = `Period: ${bounds.startDateStr} to ${bounds.endDateStr} (${bounds.monthLabel}) | Total Working Days: ${reportData.companyWorkingDays} (Target: 7h 30min / day)`;
    subtitleCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF334155' } };
    subtitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(2).height = 22;

    // Empty separator row
    sheet.getRow(3).height = 10;

    // 4 Column Headers
    const headerRow = sheet.getRow(4);
    headerRow.values = [
        'Employee Name',
        'Office Working Hours',
        'Employee Working Hours',
        'Short Hours'
    ];
    headerRow.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 26;

    sheet.columns = [
        { key: 'name', width: 32 },
        { key: 'officeWorkingHours', width: 24 },
        { key: 'employeeWorkingHours', width: 26 },
        { key: 'shortHours', width: 20 }
    ];

    // Data rows
    let currentLine = 5;
    for (const emp of reportData.employees) {
        const row = sheet.getRow(currentLine);
        row.values = [
            emp.name,
            emp.officeWorkingHours,
            emp.employeeWorkingHours,
            emp.shortHours
        ];

        row.font = { name: 'Calibri', size: 10 };
        row.height = 20;

        // Alignment
        row.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
        row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };

        // Soft highlight for rows with short hours vs completed
        if (emp.isShort) {
            row.getCell(4).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFDC2626' } };
            row.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF2F2' } };
        } else {
            row.getCell(4).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF16A34A' } };
            row.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
        }

        currentLine++;
    }

    // Totals row
    const totalRow = sheet.getRow(currentLine);
    totalRow.values = [
        'TOTAL',
        reportData.totalOfficeHoursDisplay,
        reportData.totalEmployeeHoursDisplay,
        reportData.totalShortHoursDisplay
    ];
    totalRow.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    totalRow.height = 24;
    totalRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
    totalRow.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    totalRow.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
    totalRow.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };

    return workbook.xlsx.writeBuffer();
}

/**
 * Builds the responsive HTML email template with 4 columns.
 */
export function buildCeoReportHtmlEmail({ reportData, bounds }) {
    const tableRows = reportData.employees.map((emp, index) => {
        const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fafc';
        const shortBadge = emp.isShort
            ? `<span style="display: inline-block; background-color: #fef2f2; color: #dc2626; font-weight: 700; padding: 2px 8px; border-radius: 6px; font-size: 12px; border: 1px solid #fecaca;">${emp.shortHours}</span>`
            : `<span style="display: inline-block; background-color: #dcfce7; color: #16a34a; font-weight: 700; padding: 2px 8px; border-radius: 6px; font-size: 12px; border: 1px solid #bbf7d0;">0h 00min</span>`;

        return `
            <tr style="background-color: ${rowBg}; border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px 14px; font-size: 13px; color: #0f172a; font-weight: 600;">${emp.name}</td>
                <td style="padding: 10px 14px; font-size: 13px; color: #475569; text-align: right; font-weight: 500;">${emp.officeWorkingHours}</td>
                <td style="padding: 10px 14px; font-size: 13px; color: #0f172a; text-align: right; font-weight: 700;">${emp.employeeWorkingHours}</td>
                <td style="padding: 10px 14px; font-size: 13px; text-align: right;">${shortBadge}</td>
            </tr>
        `;
    }).join('');

    return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 680px; margin: 20px auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); color: #0f172a;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 24px 28px; color: #ffffff;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                <span style="font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #94a3b8;">Tectra Technologies • Executive Briefing</span>
                <span style="background: #3b82f6; color: #ffffff; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; letter-spacing: 0.05em; text-transform: uppercase;">29th Monthly Report</span>
            </div>
            <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; line-height: 1.3;">Monthly Employee Working Hours Report</h1>
            <p style="margin: 6px 0 0 0; font-size: 13px; color: #cbd5e1;">Period: <strong>${bounds.startDateStr} to ${bounds.endDateStr}</strong> (${bounds.monthLabel})</p>
        </div>

        <!-- Body Content -->
        <div style="padding: 24px 28px;">
            <p style="margin: 0 0 18px 0; font-size: 14px; line-height: 1.6; color: #334155;">
                Dear Sir, here is the working hours summary for all active employees for the period ending on the 29th of <strong>${bounds.monthLabel}</strong> (daily target: <strong>7h 30min</strong>).
            </p>

            <!-- Metrics Summary Cards -->
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 22px;">
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; text-align: center;">
                    <div style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;">Active Employees</div>
                    <div style="font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 4px;">${reportData.totalEmployees}</div>
                </div>
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; text-align: center;">
                    <div style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;">Total Office Hours</div>
                    <div style="font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 4px;">${reportData.totalOfficeHoursDisplay}</div>
                </div>
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; text-align: center;">
                    <div style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;">Total Shortage</div>
                    <div style="font-size: 20px; font-weight: 700; color: #dc2626; margin-top: 4px;">${reportData.totalShortHoursDisplay}</div>
                </div>
            </div>

            <!-- Table of 4 Columns -->
            <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-bottom: 22px;">
                <table style="width: 100%; border-collapse: collapse; text-align: left;">
                    <thead>
                        <tr style="background-color: #0f172a; color: #ffffff;">
                            <th style="padding: 10px 14px; font-size: 12px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;">Employee Name</th>
                            <th style="padding: 10px 14px; font-size: 12px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; text-align: right;">Office Working Hour</th>
                            <th style="padding: 10px 14px; font-size: 12px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; text-align: right;">Employee Working Hours</th>
                            <th style="padding: 10px 14px; font-size: 12px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; text-align: right;">No. of Hours Short</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                    <tfoot>
                        <tr style="background-color: #f1f5f9; font-weight: 700; border-top: 2px solid #cbd5e1;">
                            <td style="padding: 10px 14px; font-size: 13px; color: #0f172a;">TOTAL</td>
                            <td style="padding: 10px 14px; font-size: 13px; color: #0f172a; text-align: right;">${reportData.totalOfficeHoursDisplay}</td>
                            <td style="padding: 10px 14px; font-size: 13px; color: #0f172a; text-align: right;">${reportData.totalEmployeeHoursDisplay}</td>
                            <td style="padding: 10px 14px; font-size: 13px; color: #dc2626; text-align: right;">${reportData.totalShortHoursDisplay}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <p style="margin: 0 0 20px 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                📎 <strong>Attachment:</strong> The complete report spreadsheet has been attached as an Excel (.xlsx) file to this email for your convenience.
            </p>

            <!-- CTA -->
            <div style="margin: 0 0 20px 0; text-align: center;">
                <a href="${HRMS_PORTAL_URL}/dashboard/report" target="_blank" rel="noopener noreferrer"
                   style="display: inline-block; background: #0f172a; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 700; padding: 10px 24px; border-radius: 8px;">
                    Open HRMS Reports Dashboard
                </a>
            </div>
        </div>

        <!-- Footer -->
        <div style="padding: 18px 28px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between; align-items: center;">
            <span>Tectra Technologies • Automated Monthly Report</span>
            <span>Generated on ${new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </div>
    </div>
    `;
}

/**
 * Sends the monthly report to the CEO via email with the Excel attachment.
 */
export async function sendCeoMonthlyReport({
    monthParam = null,
    yearParam = null,
    recipientEmail = CEO_RECIPIENT_EMAIL,
    triggeredBy = 'SYSTEM'
} = {}) {
    const bounds = getCeoReportBounds(monthParam, yearParam);
    console.log(`[CeoReport] Generating CEO monthly report for period ${bounds.startDateStr} to ${bounds.endDateStr} (${bounds.monthLabel})...`);

    const reportData = await buildCeoReportData({ start: bounds.start, end: bounds.end });
    const excelBuffer = await buildCeoReportExcelBuffer({ reportData, bounds });
    const htmlEmail = buildCeoReportHtmlEmail({ reportData, bounds });

    const safeMonth = bounds.monthLabel.replace(/\s+/g, '_');
    const attachmentFilename = `Employee_Working_Hours_Report_${safeMonth}.xlsx`;
    const subject = `Monthly Employee Working Hours Report - ${bounds.monthLabel} (Ending 29th)`;

    const textMessage = `Tectra Technologies - Monthly Employee Working Hours Report\nPeriod: ${bounds.startDateStr} to ${bounds.endDateStr} (${bounds.monthLabel})\nTotal Employees: ${reportData.totalEmployees}\nTotal Office Hours: ${reportData.totalOfficeHoursDisplay}\nTotal Worked Hours: ${reportData.totalEmployeeHoursDisplay}\nTotal Shortage: ${reportData.totalShortHoursDisplay}\n\nPlease find the attached Excel file (${attachmentFilename}) for full employee details.`;

    console.log(`[CeoReport] Sending email to CEO at ${recipientEmail}...`);

    await sendEmail({
        email: recipientEmail,
        subject,
        message: textMessage,
        html: htmlEmail,
        attachments: [
            {
                filename: attachmentFilename,
                content: Buffer.from(excelBuffer),
                contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            }
        ]
    });

    // Record in AuditLog
    await prisma.auditLog.create({
        data: {
            action: 'CEO_MONTHLY_HOURS_REPORT',
            entity: 'AttendanceReport',
            details: {
                recipientEmail,
                periodStart: bounds.startDateStr,
                periodEnd: bounds.endDateStr,
                monthLabel: bounds.monthLabel,
                triggeredBy,
                employeeCount: reportData.totalEmployees,
                totalOfficeHours: reportData.totalOfficeHoursSum,
                totalEmployeeHours: reportData.totalEmployeeHoursSum,
                totalShortHours: reportData.totalShortHoursSum
            }
        }
    });

    console.log(`[CeoReport] Report successfully emailed to ${recipientEmail} and logged in auditLog.`);

    return {
        success: true,
        period: `${bounds.startDateStr} to ${bounds.endDateStr}`,
        monthLabel: bounds.monthLabel,
        recipient: recipientEmail,
        totalEmployees: reportData.totalEmployees,
        totalOfficeHoursSum: reportData.totalOfficeHoursSum,
        totalEmployeeHoursSum: reportData.totalEmployeeHoursSum,
        totalShortHoursSum: reportData.totalShortHoursSum,
        employees: reportData.employees
    };
}

let schedulerTimer = null;
let lastScheduledRunDateStr = null;

/**
 * Automated Background Scheduler:
 * Checks every 15 minutes.
 * When the current day in IST is the 29th (or 28th in non-leap Feb) AND the IST time is 08:00 PM (20:00 - 20:15 IST),
 * automatically generates and emails the report to santosh@tectratechnologies.com.
 */
export function startCeoMonthlyReportScheduler(checkIntervalMinutes = 15) {
    if (schedulerTimer) clearInterval(schedulerTimer);

    const checkAndRun = async () => {
        try {
            const now = new Date();
            const istDateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
            const [y, m, d] = istDateStr.split('-').map(Number);

            const istHours = parseInt(
                now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', timeZone: 'Asia/Kolkata' }),
                10
            );

            // Determine target day for this month (28 for Feb non-leap, 29 otherwise)
            let targetDay = 29;
            if (m === 2) {
                const isLeap = (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
                targetDay = isLeap ? 29 : 28;
            }

            // Trigger window: on target day, at 08:00 PM IST (20:00)
            if (d === targetDay && istHours === 20 && lastScheduledRunDateStr !== istDateStr) {
                // Check if already sent today via auditLog to prevent duplicate runs after process restart
                const alreadySent = await prisma.auditLog.findFirst({
                    where: {
                        action: 'CEO_MONTHLY_HOURS_REPORT',
                        createdAt: {
                            gte: new Date(`${istDateStr}T00:00:00.000+05:30`),
                            lte: new Date(`${istDateStr}T23:59:59.999+05:30`)
                        }
                    }
                });

                if (alreadySent) {
                    lastScheduledRunDateStr = istDateStr;
                    return;
                }

                console.log(`[CeoReport Scheduler] Scheduled trigger activated for ${istDateStr} at 08:00 PM IST.`);
                lastScheduledRunDateStr = istDateStr;
                await sendCeoMonthlyReport({ triggeredBy: 'SCHEDULED_CRON' });
            }
        } catch (error) {
            console.error('[CeoReport Scheduler] Error in periodic check:', error.message);
        }
    };

    checkAndRun();
    schedulerTimer = setInterval(checkAndRun, checkIntervalMinutes * 60 * 1000);
    console.log(`[CeoReport Scheduler] Initialized (checks every ${checkIntervalMinutes} min for 29th at 08:00 PM IST).`);
}

export default {
    getCeoReportBounds,
    buildCeoReportData,
    buildCeoReportExcelBuffer,
    buildCeoReportHtmlEmail,
    sendCeoMonthlyReport,
    startCeoMonthlyReportScheduler
};
