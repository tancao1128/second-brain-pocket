import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { seal, open, ITERATIONS } from '../crypto.mjs';
import { isStale, deadlineRows, todayRows, habitRows, projectRows, TEXT } from '../view.mjs';

const dir = new URL('..', import.meta.url);
const read = (f) => readFileSync(new URL(f, dir), 'utf8');
const SNAP = { generated_at: '2026-11-02T08:00:00+00:00', today: '2026-11-02', counts: { due_today: 1, overdue: 1, due_7: 2, habits_today: 1 },
  tasks: [{ area: 'Admin', status: 'Next', type: 'Deadline', deadline: '2026-10-30', days_left: -3, overdue: true },
          { area: 'Research', status: 'Next', type: 'Deadline', deadline: '2026-11-02', days_left: 0, overdue: false },
          { area: 'Admin', status: 'Done', type: 'Task', deadline: null, days_left: null, overdue: false }],
  projects: [{ code: 'PAP-XX-01', status: 'Active' }], events: [{ start: '10:00', end: '11:00', type: 'Meeting' }],
  habits: [{ n: 1, count7: 3, streak: 2, dots: [true, false, true, false, true, true, true] }] };

test('round trip and wrong passphrase', async () => {
  const blob = await seal('{"a":1}', 'a long enough passphrase');
  assert.equal(blob.iter, ITERATIONS);
  assert.equal(await open(blob, 'a long enough passphrase'), '{"a":1}');
  await assert.rejects(open(blob, 'a long enough passphrasX'), /wrong-passphrase/);
});

test('any change to the file is detected', async () => {
  const blob = await seal('{"a":1}', 'a long enough passphrase');
  const ct = Uint8Array.from(atob(blob.ct), (c) => c.charCodeAt(0)); ct[0] ^= 1;
  await assert.rejects(open({ ...blob, ct: btoa(String.fromCharCode(...ct)) }, 'a long enough passphrase'), /wrong-passphrase/);
  await assert.rejects(open({ ...blob, iter: 1000 }, 'a long enough passphrase'), /bad-format/);
});

test('each seal uses a fresh salt and iv', async () => {
  const a = await seal('x', 'a long enough passphrase'); const b = await seal('x', 'a long enough passphrase');
  assert.notEqual(a.salt, b.salt); assert.notEqual(a.iv, b.iv); assert.notEqual(a.ct, b.ct);
});

test('stale warning after 24 hours', () => {
  assert.equal(isStale(SNAP, new Date('2026-11-02T20:00:00Z')), false);
  assert.equal(isStale(SNAP, new Date('2026-11-04T09:00:00Z')), true);
  assert.equal(isStale({ generated_at: 'x' }), true);
});

test('views show labels, not titles', () => {
  const t = TEXT.en;
  const d = deadlineRows(SNAP, t);
  assert.deepEqual(d.map((r) => r.when), ['3 days late', 'today']);
  assert.equal(d[0].overdue, true);
  assert.equal(todayRows(SNAP, t).tasks.length, 1);
  assert.deepEqual(projectRows(SNAP), [{ code: 'PAP-XX-01', status: 'Active' }]);
  assert.equal(habitRows(SNAP, t)[0].label, 'Habit 1');
});

test('the page keeps nothing secret in storage and builds the DOM without innerHTML', () => {
  const js = read('pocket.js');
  assert.doesNotMatch(js, /sessionStorage|indexedDB|innerHTML|insertAdjacentHTML|document\.cookie/);
  const keys = [...js.matchAll(/store\.(?:get|set)\('([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual([...new Set(keys)].sort(), ['pocket.branch', 'pocket.file', 'pocket.lang', 'pocket.repo', 'pocket.token']);
  assert.doesNotMatch(js, /store\.set\([^)]*(pass|secret|snap)/i);
  assert.match(js, /addEventListener\('pagehide', lock\)/);
});

test('the page holds no token, path or personal name', () => {
  for (const f of ['index.html', 'pocket.js', 'view.mjs', 'crypto.mjs', 'seal.mjs', 'manifest.webmanifest']) {
    assert.doesNotMatch(read(f), /\/Users\/|ghp_|github_pat_|tancao|@gmail|sunykorea/i, f);
  }
  assert.match(read('index.html'), /connect-src 'self' https:\/\/api\.github\.com/);
});
