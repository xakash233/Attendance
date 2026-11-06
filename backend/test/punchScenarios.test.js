import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

// Run away from backend/.env so the Prisma client imported below has no database URL:
// these tests use a fake transaction and must never reach a real DB.
process.chdir(fileURLToPath(new URL('.', import.meta.url)));
delete process.env.DATABASE_URL;

const { default: calculateAttendance } = await import('../src/utils/attendanceCalculator.js');
const { buildLiveStatusFromUserDay } = await import('../src/utils/liveAttendanceStatus.js');
const { isCurrentlyOut } = await import('../src/utils/outBreakWindow.js');
const { default: biometricService } = await import('../src/services/biometric/biometricService.js');

const PAST_DAY = '2026-11-03'; // a Tuesday
const at = (hhmmss, day = PAST_DAY) => new Date(`${day}T${hhmmss}.000+05:30`);
const addMs = (date, ms) => new Date(date.getTime() + ms);
/** `count` punches with realistic, uneven retry gaps of 2-15 seconds. */
const RETRY_GAPS_MS = [2000, 5000, 8000, 12000, 15000, 10000];
const burst = (start, count) => {
    const punches = [start];
    while (punches.length < count) {
        punches.push(addMs(punches.at(-1), RETRY_GAPS_MS[punches.length % RETRY_GAPS_MS.length]));
    }
    return punches;
};

const liveStatus = (punches, currentTimeStr, dateStr = PAST_DAY) => buildLiveStatusFromUserDay(
    {
        id: 'u1',
        name: 'Test',
        employeeCode: 'TEST-1',
        biometricAttendances: punches.map((timestamp) => ({ timestamp })),
        attendances: [],
        wfhRequests: []
    },
    { dateStr, currentTimeStr }
);

/** Run the real daily aggregation against an in-memory fake transaction. */
async function aggregateDay(rawPunches) {
    const sorted = [...rawPunches].sort((a, b) => a - b);
    let saved = null;
    const tx = {
        user: { findUnique: async () => ({ id: 'u1', shift: 'B', employeeCode: 'TEST-1', wfhRequests: [] }) },
        biometricAttendance: { findMany: async () => sorted.map((timestamp) => ({ timestamp })) },
        attendance: { upsert: async ({ create }) => { saved = create; return create; } },
        leaveRequest: { findFirst: async () => null },
        holiday: { findFirst: async () => null }
    };
    await biometricService.updateDailyAttendance(tx, 'u1', sorted[0]);
    return saved;
}

const NORMAL_DAY = [at('09:30:00'), at('13:00:00'), at('14:00:00'), at('18:30:00')];

test('normal day: IN, lunch OUT, IN, OUT gives 8h and ends OUT', async () => {
    const calc = calculateAttendance(NORMAL_DAY, null, PAST_DAY);
    assert.equal(calc.totalWorkHours, '8.00');
    assert.equal(calc.isOngoing, false);

    const live = liveStatus(NORMAL_DAY, '19:00');
    assert.equal(live.currentStatus, 'OUT');
    assert.equal(live.punchesCount, 4);

    const saved = await aggregateDay(NORMAL_DAY);
    assert.equal(saved.status, 'PRESENT');
    assert.equal(saved.workingHours, 8);
    assert.equal(saved.checkIn.getTime(), at('09:30:00').getTime());
    assert.equal(saved.checkOut.getTime(), at('18:30:00').getTime());
});

test('normal day in progress: after lunch return the status is IN', () => {
    const live = liveStatus(NORMAL_DAY.slice(0, 3), '15:00');
    assert.equal(live.currentStatus, 'IN');
    assert.equal(isCurrentlyOut(live), false);

    const atLunch = liveStatus(NORMAL_DAY.slice(0, 2), '13:30');
    assert.equal(atLunch.currentStatus, 'OUT');
    assert.equal(isCurrentlyOut(atLunch), true);
});

for (const count of [100, 150, 200]) {
    test(`${count} punches in a row at check-in still mean one IN`, () => {
        const punches = burst(at('09:30:00'), count);
        const live = liveStatus(punches, '11:00');
        assert.equal(live.currentStatus, 'IN');
        assert.equal(live.punchesCount, 1);
        assert.deepEqual(live.punches, [at('09:30:00').toISOString()]);
    });
}

test('bursts of 100-200 at every punch still give the right day', async () => {
    const punches = [
        ...burst(at('09:30:00'), 200),
        ...burst(at('13:00:00'), 100),
        ...burst(at('14:00:00'), 150),
        ...burst(at('18:30:00'), 200)
    ];
    assert.equal(punches.length, 650);

    const live = liveStatus(punches, '19:00');
    assert.equal(live.currentStatus, 'OUT');
    assert.equal(live.punchesCount, 4);

    const calc = calculateAttendance(punches, null, PAST_DAY);
    assert.equal(calc.totalWorkHours, '8.00');

    const saved = await aggregateDay(punches);
    assert.equal(saved.status, 'PRESENT');
    assert.equal(saved.workingHours, 8);
    assert.equal(saved.checkOut.getTime(), at('18:30:00').getTime());
});

test('retries 5-15 seconds apart count as one punch', async () => {
    const punches = [
        // check-in: 4 tries, gaps 5s / 10s / 15s
        at('09:30:00'), at('09:30:05'), at('09:30:15'), at('09:30:30'),
        // lunch out: 2 tries 10s apart
        at('13:00:00'), at('13:00:10'),
        // back in: 2 tries 12s apart
        at('14:00:00'), at('14:00:12'),
        // check-out: 3 tries 5s / 12s apart
        at('18:30:00'), at('18:30:05'), at('18:30:17')
    ];

    // Before the fix the 10s rule kept all 11, so check-in alone read IN,OUT,IN,OUT.
    const morningOnly = liveStatus(punches.slice(0, 4), '10:00');
    assert.equal(morningOnly.currentStatus, 'IN');
    assert.equal(morningOnly.punchesCount, 1);

    const live = liveStatus(punches, '19:00');
    assert.equal(live.currentStatus, 'OUT');
    assert.equal(live.punchesCount, 4);

    const saved = await aggregateDay(punches);
    assert.equal(saved.status, 'PRESENT');
    assert.equal(saved.workingHours, 8);
});

test('day that already has duplicate raw rows in the DB', async () => {
    // Each punch stored 3x with the identical timestamp (bridge + WiFi + re-upload)
    // plus a double sensor read 1s later.
    const punches = NORMAL_DAY.flatMap((p) => [p, p, p, addMs(p, 1000)]);
    assert.equal(punches.length, 16);

    const live = liveStatus(punches, '19:00');
    assert.equal(live.currentStatus, 'OUT');
    assert.equal(live.punchesCount, 4);

    const saved = await aggregateDay(punches);
    assert.equal(saved.status, 'PRESENT');
    assert.equal(saved.workingHours, 8);
    assert.equal(saved.checkIn.getTime(), at('09:30:00').getTime());
    assert.equal(saved.checkOut.getTime(), at('18:30:00').getTime());
});

test('today, checked IN through a retry burst: no checkOut is stamped', async () => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const start = new Date(Date.now() - 30 * 60 * 1000);
    const punches = burst(start, 120);
    const saved = await aggregateDay(punches);
    assert.equal(saved.checkIn.getTime(), start.getTime());
    // Skip the assertion if the burst straddles IST midnight.
    if (start.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) === today) {
        assert.equal(saved.checkOut, null);
    }
});
