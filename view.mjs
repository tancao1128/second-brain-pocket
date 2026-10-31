// Pure functions: what each tab shows. No titles exist in the snapshot, so rows are labels, numbers and dates.
export const TEXT = {
  vi: { appName: 'Second Brain Pocket', readOnly: 'chỉ đọc', today: 'Hôm nay', deadlines: 'Hạn chót', projects: 'Dự án', habits: 'Thói quen',
    overdue: 'Quá hạn', due7: 'Trong 7 ngày', habitsDone: 'Thói quen', dueToday: 'Đến hạn hôm nay', reload: 'Tải lại',
    noData: 'Không có gì.', 
    snapshotAt: 'Ảnh chụp lúc', old: 'Dữ liệu đã cũ', today0: 'hôm nay', inDays: (n) => `còn ${n} ngày`, lateDays: (n) => `trễ ${n} ngày`,
    streak: 'chuỗi', habit: 'Thói quen', 
    fetchFail: 'Không tải được ảnh chụp.', events: 'Lịch hôm nay', Meeting: 'Họp', Class: 'Lớp', Deadline: 'Hạn chót',
    Task: 'Việc', Next: 'Chưa làm', Done: 'Xong', lang: 'EN' },
  en: { appName: 'Second Brain Pocket', readOnly: 'read-only', today: 'Today', deadlines: 'Deadlines', projects: 'Projects', habits: 'Habits',
    overdue: 'Overdue', due7: 'Due in 7 days', habitsDone: 'Habits', dueToday: 'Due today', reload: 'Reload',
    noData: 'Nothing.', 
    snapshotAt: 'Snapshot at', old: 'Data is old', today0: 'today', inDays: (n) => `in ${n} days`, lateDays: (n) => `${n} days late`,
    streak: 'streak', habit: 'Habit', 
    fetchFail: 'Could not load the snapshot.', events: 'Calendar today', Meeting: 'Meeting', Class: 'Class',
    Deadline: 'Deadline', Task: 'Task', Next: 'To do', Done: 'Done', lang: 'VI' },
};

export const STALE_HOURS = 24;

export function isStale(snap, now = new Date()) {
  const t = Date.parse(snap.generated_at);
  return !Number.isFinite(t) || now - t > STALE_HOURS * 3600e3;
}

export function strip(snap, t) {
  const c = snap.counts;
  return [[t.dueToday, c.due_today], [t.overdue, c.overdue], [t.due7, c.due_7], [t.habitsDone, `${c.habits_today}/${snap.habits.length}`]];
}

export function dueText(row, t) {
  if (row.days_left === null) return '';
  if (row.days_left === 0) return t.today0;
  return row.days_left > 0 ? t.inDays(row.days_left) : t.lateDays(-row.days_left);
}

export function todayRows(snap, t) {
  const events = snap.events.map((e) => ({ kind: 'event', label: t[e.type], when: `${e.start}–${e.end}` }));
  const tasks = snap.tasks.filter((x) => x.status !== 'Done' && x.days_left === 0)
    .map((x) => ({ kind: 'task', label: `${x.area} · ${t[x.type]}`, when: t.today0 }));
  return { events, tasks };
}

export function deadlineRows(snap, t) {
  return snap.tasks.filter((x) => x.status !== 'Done' && x.deadline)
    .sort((a, b) => a.days_left - b.days_left)
    .map((x) => ({ label: `${x.area} · ${t[x.type]}`, date: x.deadline, when: dueText(x, t), overdue: x.overdue }));
}

export function projectRows(snap) {
  return snap.projects.map((p) => ({ code: p.code, status: p.status }));
}

export function habitRows(snap, t) {
  return snap.habits.map((h) => ({ label: `${t.habit} ${h.n}`, dots: h.dots, count: `${h.count7}/7`, streak: `${t.streak} ${h.streak}` }));
}
