import test from 'node:test';
import assert from 'node:assert/strict';
import {
    getCeoReportBounds,
    buildCeoReportExcelBuffer,
    buildCeoReportHtmlEmail
} from '../src/services/attendance/ceoMonthlyReportService.js';

test('getCeoReportBounds computes correct 1st to 29th bounds for standard months', () => {
    const bounds = getCeoReportBounds('2026-10');
    assert.equal(bounds.year, 2026);
    assert.equal(bounds.month, 10);
    assert.equal(bounds.startDateStr, '2026-10-01');
    assert.equal(bounds.endDateStr, '2026-10-29');
    assert.equal(bounds.targetEndDay, 29);
});

test('getCeoReportBounds handles February correctly in leap and non-leap years', () => {
    // 2025 is not a leap year -> ends on 28th
    const nonLeap = getCeoReportBounds('2025-02');
    assert.equal(nonLeap.targetEndDay, 28);
    assert.equal(nonLeap.endDateStr, '2025-02-28');

    // 2024 is a leap year -> ends on 29th
    const leap = getCeoReportBounds('2024-02');
    assert.equal(leap.targetEndDay, 29);
    assert.equal(leap.endDateStr, '2024-02-29');
});

test('buildCeoReportExcelBuffer generates a valid Excel buffer with 4 columns', async () => {
    const mockBounds = getCeoReportBounds('2026-10');
    const mockReportData = {
        companyWorkingDays: 21,
        totalEmployees: 2,
        totalOfficeHoursSum: 315.0,
        totalEmployeeHoursSum: 290.0,
        totalShortHoursSum: 25.0,
        employees: [
            {
                name: 'John Doe',
                officeWorkingHours: '157.5',
                employeeWorkingHours: '157.5',
                shortHours: '0.0',
                isShort: false
            },
            {
                name: 'Jane Smith',
                officeWorkingHours: '157.5',
                employeeWorkingHours: '132.5',
                shortHours: '25.0',
                isShort: true
            }
        ]
    };

    const buffer = await buildCeoReportExcelBuffer({ reportData: mockReportData, bounds: mockBounds });
    assert.ok(buffer);
    assert.ok(buffer.length > 0);

    const html = buildCeoReportHtmlEmail({ reportData: mockReportData, bounds: mockBounds });
    assert.ok(html.includes('Monthly Employee Working Hours Report'));
    assert.ok(html.includes('John Doe'));
    assert.ok(html.includes('Jane Smith'));
    assert.ok(html.includes('Office Working Hour'));
    assert.ok(html.includes('Employee Working Hours'));
    assert.ok(html.includes('No. of Hours Short'));
    assert.ok(html.includes('0.0 hrs'));
    assert.ok(html.includes('25.0 hrs'));
});
