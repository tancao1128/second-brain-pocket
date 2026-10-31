import { TEXT, isStale, strip, todayRows, deadlineRows, projectRows, habitRows } from './view.mjs?v=5';

// The Mac writes a secret Gist and this page reads it. The Gist id is not in this public code: Tan opens a private
// link once (…/#g=<id>), the page keeps the id in this phone's storage and removes it from the address bar.
const FILE = 'pocket.json';
const $ = (id) => document.getElementById(id);
let snap = null;
let tab = 'today';
let lang = 'vi';
let gist = '';
try {
  lang = localStorage.getItem('pocket.lang') === 'en' ? 'en' : 'vi';
  const linked = /^#g=([0-9a-f]{20,40})$/.exec(location.hash);
  if (linked) { localStorage.setItem('pocket.gist', linked[1]); history.replaceState(null, '', location.pathname); }
  gist = localStorage.getItem('pocket.gist') || '';
} catch { /* storage blocked */ }
const T = () => TEXT[lang];

function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }

function row(left, right, extra = '') {
  const r = el('div', `row ${extra}`.trim());
  const a = el('div'); a.append(el('div', '', left.main)); if (left.sub) a.append(el('small', '', left.sub));
  r.append(a, right instanceof Node ? right : el('small', '', right));
  return r;
}

function section(title, rows, t) {
  const box = el('div');
  box.append(el('h2', '', title));
  if (!rows.length) box.append(el('p', 'muted', t.noData)); else rows.forEach((r) => box.append(r));
  return box;
}

function render() {
  const t = T();
  document.documentElement.lang = lang;
  $('ro').textContent = t.readOnly; $('lang').textContent = t.lang; $('reload').textContent = t.reload; $('source').textContent = t.source;
  $('stamp').textContent = snap ? `${t.snapshotAt} ${new Date(snap.generated_at).toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-GB', { dateStyle: 'short', timeStyle: 'short' })}` : '';
  $('stale').hidden = !(snap && isStale(snap)); $('stale').textContent = t.old;
  const s = $('strip'), tabs = $('tabs'), panel = $('panel');
  s.replaceChildren(); tabs.replaceChildren(); panel.replaceChildren();
  if (!snap) return;
  strip(snap, t).forEach(([label, n]) => { const c = el('div', 'cell'); c.append(el('b', '', String(n)), el('span', '', label)); s.append(c); });
  [['today', t.today], ['deadlines', t.deadlines], ['projects', t.projects], ['habits', t.habits]].forEach(([id, label]) => {
    const b = el('button', '', label); b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(id === tab));
    b.addEventListener('click', () => { tab = id; render(); }); tabs.append(b);
  });
  if (tab === 'today') {
    const { events, tasks } = todayRows(snap, t);
    panel.append(section(t.events, events.map((e) => row({ main: e.label }, e.when)), t),
      section(t.dueToday, tasks.map((x) => row({ main: x.label }, x.when)), t));
  } else if (tab === 'deadlines') {
    panel.append(section(t.deadlines, deadlineRows(snap, t).map((x) => row({ main: x.label, sub: x.date }, x.when, x.overdue ? 'late' : '')), t));
  } else if (tab === 'projects') {
    panel.append(section(t.projects, projectRows(snap).map((p) => row({ main: p.code }, p.status)), t));
  } else {
    panel.append(section(t.habits, habitRows(snap, t).map((h) => {
      const dots = el('div', 'dots'); h.dots.forEach((on) => dots.append(el('i', on ? 'on' : '')));
      return row({ main: h.label, sub: `${h.count} · ${h.streak}` }, dots);
    }), t));
  }
}

async function load() {
  $('err').hidden = true;
  if (!gist) { $('err').textContent = T().needLink; $('err').hidden = false; render(); return; }
  try {
    const res = await fetch(`https://api.github.com/gists/${gist}`, { cache: 'no-store', headers: { Accept: 'application/vnd.github+json' } });
    if (!res.ok) throw new Error(String(res.status));
    const file = (await res.json()).files[FILE];
    const text = file.truncated ? await (await fetch(file.raw_url, { cache: 'no-store' })).text() : file.content;
    snap = JSON.parse(text);
  } catch (e) {
    $('err').textContent = T().fetchFail; $('err').hidden = false;
  }
  render();
}

$('reload').addEventListener('click', load);
$('source').addEventListener('click', () => {
  const given = prompt(T().askLink, '') || '';
  const id = (/([0-9a-f]{20,40})\/?\s*$/.exec(given.trim()) || [])[1];
  if (!id) return;
  gist = id;
  try { localStorage.setItem('pocket.gist', id); } catch { /* storage blocked: keep it for this visit */ }
  load();
});
$('lang').addEventListener('click', () => { lang = lang === 'vi' ? 'en' : 'vi'; try { localStorage.setItem('pocket.lang', lang); } catch { /* ignore */ } render(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
render();
load();
