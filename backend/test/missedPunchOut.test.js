import { test } from 'node:test';
import assert from 'node:assert/strict';
import { missedPunchOutEnd } from '../src/utils/missedPunchOut.js';
import calculateAttendance, { resolveDayStatusFromHours } from '../src/utils/attendanceCalculator.js';

const DAY = '2026-11-03';
const at = (hhmm) => new Date(`${DAY}T${hhmm}:00.000+05:30`);

test('even punch count is not a missed punch-out', () => {
    assert.equal(missedPunchOutEnd([at('09:30'), at('18:30')], DAY), null);
    assert.equal(missedPunchOutEnd([], DAY), null);
});

test('shift A (in by 09:45) closes at 18:00, shift B at 19:00', () => {
    assert.equal(missedPunchOutEnd([at('09:30')], DAY).getTime(), at('18:00').getTime());
    assert.equal(missedPunchOutEnd([at('10:05')], DAY).getTime(), at('19:00').getTime());
    assert.equal(missedPunchOutEnd([at('10:05'), at('13:00'), at('14:00')], DAY).getTime(), at('19:00').getTime());
});

test('last IN after shift end credits nothing', () => {
    assert.equal(missedPunchOutEnd([at('10:00'), at('18:00'), at('19:30')], DAY), null);
});

test('single forgotten OUT is no longer ABSENT', () => {
    const punches = [at('10:00')];
    const logs = punches.map((timestamp) => ({ timestamp }));
    const before = calculateAttendance(logs, null, DAY);
    assert.equal(resolveDayStatusFromHours(Number(before.totalWorkHours)), 'ABSENT');

    const after = calculateAttendance(logs, missedPunchOutEnd(punches, DAY), DAY);
    const hours = Number(after.totalWorkHours);
    assert.ok(hours >= 7.5, `expected a full day, got ${hours}h`);
    assert.equal(resolveDayStatusFromHours(hours), 'PRESENT');
});

test('lunch out, never back: morning plus open afternoon to shift end', () => {
    const punches = [at('10:00'), at('13:00'), at('14:00')];
    const logs = punches.map((timestamp) => ({ timestamp }));
    const after = calculateAttendance(logs, missedPunchOutEnd(punches, DAY), DAY);
    assert.equal(Number(after.totalWorkHours), 8); // 3h + 5h
});
