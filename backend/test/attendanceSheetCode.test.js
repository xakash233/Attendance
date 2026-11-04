import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attendanceDayToSheetCode, buildAttendanceMatrixRows } from '../src/utils/attendanceSheetExport.js';

const workday = { dayCategory: 'WORKDAY', isHoliday: false, isFuture: false, isBeforeEffectiveStart: false };

test('punched in minutes ago (ON-SITE, under 1h) shows WFO, not blank', () => {
    assert.equal(attendanceDayToSheetCode({ ...workday, status: 'ON-SITE', workedHours: 0.1 }), 'WFO');
    assert.equal(attendanceDayToSheetCode({ ...workday, status: 'ON-SITE', workedHours: 0 }), 'WFO');
});

test('short day under 1h still shows WFO', () => {
    assert.equal(attendanceDayToSheetCode({ ...workday, status: 'SHORT DAY', workedHours: 0.23 }), 'WFO');
});

test('punching in on a weekend shows WFO instead of HOLIDAY/WFH', () => {
    for (const dayCategory of ['SAT_LEAVE', 'SAT_WFH', 'SUNDAY']) {
        assert.equal(attendanceDayToSheetCode({ ...workday, dayCategory, status: 'OVERTIME SATURDAY', workedHours: 3, hasOfficePunch: true }), 'WFO');
    }
    // without a punch, weekends keep their usual codes
    assert.equal(attendanceDayToSheetCode({ ...workday, dayCategory: 'SAT_LEAVE', status: 'LEAVE' }), 'HOLIDAY');
    assert.equal(attendanceDayToSheetCode({ ...workday, dayCategory: 'SAT_WFH', status: 'WFH' }), 'WFH');
    // a company holiday stays HOLIDAY
    assert.equal(attendanceDayToSheetCode({ ...workday, dayCategory: 'SAT_WFH', isHoliday: true, hasOfficePunch: true }), 'HOLIDAY');
});

test('sheet header shows name and code so same names stay apart', () => {
    const users = [{ id: 'a', name: 'Monisha', employeeCode: '2' }, { id: 'b', name: 'Monisha', employeeCode: '15' }];
    const [header] = buildAttendanceMatrixRows([], users, new Map());
    assert.deepEqual(header, ['Date', 'Day', 'Monisha (2)', 'Monisha (15)']);
});

test('existing codes are unchanged', () => {
    assert.equal(attendanceDayToSheetCode({ ...workday, status: 'ON SITE', workedHours: 0 }), 'OS');
    assert.equal(attendanceDayToSheetCode({ ...workday, status: 'ABSENT', workedHours: 0 }), 'LOP');
    assert.equal(attendanceDayToSheetCode({ ...workday, status: 'PRESENT', workedHours: 8 }), 'WFO');
    assert.equal(attendanceDayToSheetCode({ ...workday, status: 'SCHEDULED', workedHours: 0 }), '');
    assert.equal(attendanceDayToSheetCode({ ...workday, status: 'ON-SITE', workedHours: 0, isFuture: true }), '');
});
