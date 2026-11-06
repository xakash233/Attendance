import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collapsePunchBursts, PUNCH_DEDUP_WINDOW_MS } from '../src/utils/punchDedup.js';

const at = (hhmmss) => new Date(`2026-11-04T${hhmmss}.000+05:30`);
const addMs = (date, ms) => new Date(date.getTime() + ms);

test('window is 10 seconds and lives in one constant', () => {
    assert.equal(PUNCH_DEDUP_WINDOW_MS, 10000);
});

test('200 punches 1s apart collapse to the first one', () => {
    const start = at('09:30:00');
    const burst = Array.from({ length: 200 }, (_, i) => addMs(start, i * 1000));
    assert.deepEqual(collapsePunchBursts(burst), [start]);
});

test('a burst keeps chaining past the window when each gap is inside it', () => {
    const start = at('09:00:00');
    const burst = Array.from({ length: 150 }, (_, i) => addMs(start, i * 8000));
    assert.equal(collapsePunchBursts(burst).length, 1);
});

test('unsorted input with exact duplicates is sorted and collapsed', () => {
    const rows = [at('18:30:00'), at('09:30:00'), at('09:30:00'), at('18:30:05'), at('09:30:01')];
    assert.deepEqual(collapsePunchBursts(rows), [at('09:30:00'), at('18:30:00')]);
});

test('punches more than the window apart stay separate', () => {
    const rows = [at('09:30:00'), at('09:30:15')];
    assert.equal(collapsePunchBursts(rows).length, 2);
});

test('works on objects via an accessor and skips invalid times', () => {
    const rows = [
        { time: at('09:30:00'), id: 'a' },
        { time: at('09:30:05'), id: 'b' },
        { time: 'not-a-date', id: 'bad' },
        { time: at('13:00:00'), id: 'c' }
    ];
    assert.deepEqual(collapsePunchBursts(rows, (r) => r.time).map((r) => r.id), ['a', 'c']);
});
