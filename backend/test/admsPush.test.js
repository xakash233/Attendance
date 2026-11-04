import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

// No database: run away from backend/.env and stub every service call below.
process.chdir(fileURLToPath(new URL('.', import.meta.url)));
delete process.env.DATABASE_URL;

const { handleCdataPost } = await import('../src/controllers/adms.js');
const { default: biometricService } = await import('../src/services/biometric/biometricService.js');
const { default: admsService, parseDeviceStamp } = await import('../src/services/biometric/admsService.js');

const fakeRes = () => {
    const res = { statusCode: 200, headers: {}, body: undefined, events: [] };
    res.status = (code) => { res.statusCode = code; return res; };
    res.set = (key, value) => { res.headers[key] = value; return res; };
    res.send = (body) => { res.body = body; res.events.push('send'); return res; };
    return res;
};

const attlogReq = (query = {}) => ({
    query: { SN: 'JJA1251201425', table: 'ATTLOG', ...query },
    headers: {},
    socket: { remoteAddress: '10.0.0.5' },
    body: '7\t2026-11-03 09:30:00\t0\t1\t0\t0\n'
});

let calls;
beforeEach(() => {
    calls = [];
    admsService.touchDevice = async () => null;
    admsService.markPush = async (sn, stamp) => { calls.push(['markPush', sn, stamp]); };
});

test('replies OK only after the punch is saved', async () => {
    const res = fakeRes();
    biometricService.processSync = async () => {
        calls.push(['processSync', res.events.length]);
        return { status: 'SUCCESS', successCount: 1, duplicateCount: 0, totalProcessed: 1 };
    };

    await handleCdataPost(attlogReq({ Stamp: '9999' }), res);

    assert.deepEqual(calls[0], ['processSync', 0], 'nothing was sent before saving');
    assert.equal(res.statusCode, 200);
    assert.equal(res.body, 'OK');
});

test('a failed save returns an error so the device retries', async () => {
    const res = fakeRes();
    biometricService.processSync = async () => { throw new Error('pool timeout'); };

    await handleCdataPost(attlogReq({ Stamp: '9999' }), res);

    assert.equal(res.statusCode, 500);
    assert.notEqual(res.body, 'OK');
    assert.equal(calls.some(([name]) => name === 'markPush'), false, 'stamp not advanced');
});

test("stores the device's own Stamp, not a punch time", async () => {
    biometricService.processSync = async () => ({ status: 'SUCCESS', successCount: 1, duplicateCount: 0 });

    await handleCdataPost(attlogReq({ Stamp: '812345678' }), fakeRes());
    assert.deepEqual(calls.at(-1), ['markPush', 'JJA1251201425', 812345678]);

    await handleCdataPost(attlogReq(), fakeRes());
    assert.deepEqual(calls.at(-1), ['markPush', 'JJA1251201425', null], 'no Stamp leaves it unchanged');
});

test('parseDeviceStamp accepts only plain non-negative 32-bit integers', () => {
    assert.equal(parseDeviceStamp('0'), 0);
    assert.equal(parseDeviceStamp(' 9999 '), 9999);
    assert.equal(parseDeviceStamp('2147483647'), 2147483647);
    assert.equal(parseDeviceStamp('2147483648'), null);
    assert.equal(parseDeviceStamp('-1'), null);
    assert.equal(parseDeviceStamp('12.5'), null);
    assert.equal(parseDeviceStamp(undefined), null);
});
