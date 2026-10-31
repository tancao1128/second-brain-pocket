import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isStale, deadlineRows, todayRows, habitRows, projectRows, TEXT } from '../view.mjs';

const dir = new URL('..', import.meta.url);
const read = (f) => readFileSync(new URL(f, dir), 'utf8');
const SNAP = { generated_at: '2026-11-02T08:00:00+00:00', today: '2026-11-02', counts: { due_today: 1, overdue: 1, due_7: 2, habits_today: 1 },
  tasks: [{ area: 'Admin', status: 'Next', type: 'Deadline', deadline: '2026-10-30', days_left: -3, overdue: true },
          { area: 'Research', status: 'Next', type: 'Deadline', deadline: '2026-11-02', days_left: 0, overdue: false },
          { area: 'Admin', status: 'Done', type: 'Task', deadline: null, days_left: null, overdue: false }],
  projects: [{ code: 'PAP-XX-01', status: 'Active' }], events: [{ start: '10:00', end: '11:00', type: 'Meeting' }],
  habits: [{ n: 1, count7: 3, streak: 2, dots: [true, false, true, false, true, true, true] }] };

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

test('the page builds the DOM without innerHTML and stores only the language and the Gist id', () => {
  const js = read('pocket.js');
  assert.doesNotMatch(js, /sessionStorage|indexedDB|innerHTML|insertAdjacentHTML|document\.cookie/);
  assert.deepEqual([...js.matchAll(/localStorage\.(?:get|set)Item\('([^']+)'/g)].map((m) => m[1]), ['pocket.lang', 'pocket.gist', 'pocket.gist', 'pocket.lang']);
});

test('the page holds no token, path or personal name', () => {
  for (const f of ['index.html', 'pocket.js', 'view.mjs', 'manifest.webmanifest']) {
    assert.doesNotMatch(read(f), /\/Users\/|ghp_|github_pat_|tancao|@gmail|sunykorea|[0-9a-f]{32}/i, f);
  }
  assert.match(read('index.html'), /connect-src https:\/\/api\.github\.com https:\/\/gist\.githubusercontent\.com;/);
});
