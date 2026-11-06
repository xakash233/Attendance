import test from 'node:test';
import assert from 'node:assert/strict';
import { getWeekRangeIST } from '../src/services/attendance/lateArrivalAlertService.js';

test('getWeekRangeIST computes correct Monday to Saturday bounds across different weekdays', () => {
    // Friday
    const fri = getWeekRangeIST('2026-11-06T10:15:00+05:30');
    assert.equal(fri.mondayStr, '2026-11-02');
    assert.equal(fri.saturdayStr, '2026-11-07');
    assert.equal(fri.weekKey, '2026-11-02');
    assert.equal(fri.startOfWeek.toISOString(), '2026-11-01T18:30:00.000Z');
    assert.equal(fri.endOfWeek.toISOString(), '2026-11-07T18:29:59.999Z');

    // Monday
    const mon = getWeekRangeIST('2026-11-02T09:00:00+05:30');
    assert.equal(mon.mondayStr, '2026-11-02');
    assert.equal(mon.saturdayStr, '2026-11-07');

    // Saturday
    const sat = getWeekRangeIST('2026-11-07T21:00:00+05:30');
    assert.equal(sat.mondayStr, '2026-11-02');
    assert.equal(sat.saturdayStr, '2026-11-07');

    // Sunday (falls into previous week ending yesterday)
    const sun = getWeekRangeIST('2026-11-08T15:00:00+05:30');
    assert.equal(sun.mondayStr, '2026-11-02');
    assert.equal(sun.saturdayStr, '2026-11-07');
});

test('10:10 AM threshold: only punches strictly after 10:10:00 AM count as late', () => {
    const isPunchLate = (timeStr) => {
        const [h, m, s] = timeStr.split(':').map(Number);
        const sec = h * 3600 + m * 60 + (s || 0);
        const THRESHOLD = 10 * 3600 + 10 * 60; // 36600 seconds
        return sec > THRESHOLD;
    };

    assert.equal(isPunchLate('09:45:00'), false);
    assert.equal(isPunchLate('10:05:30'), false);
    assert.equal(isPunchLate('10:10:00'), false);
    assert.equal(isPunchLate('10:10:01'), true);
    assert.equal(isPunchLate('10:11:00'), true);
    assert.equal(isPunchLate('10:25:00'), true);
});
