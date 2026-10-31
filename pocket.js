import { open } from './crypto.mjs';
import { TEXT, isStale, strip, todayRows, deadlineRows, projectRows, habitRows } from './view.mjs';

const $ = (id) => document.getElementById(id);
const DEMO_PASSPHRASE = 'demo-fake-passphrase';
const AUTO_LOCK_MS = 5 * 60 * 1000;
// Held in memory only. Nothing about the passphrase, the key or the snapshot is written to any storage.
let secret = null;     // the passphrase while unlocked
let snap = null;       // the decrypted snapshot while unlocked
let source = null;     // { demo: true } or { repo, branch, file, token }
let tab = 'today';
let lang = 'vi';
let hiddenTimer = null;

const store = {
  get(k) { try { return localStorage.getItem(k) || ''; } catch { return ''; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage blocked: the page still works */ } },
};
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
  $('ro').textContent = t.readOnly;
  $('lang').textContent = t.lang; $('reload').textContent = t.reload; $('lock').textContent = t.lock;
  $('passLabel').textContent = t.passphrase; $('unlockBtn').textContent = t.unlock; $('demoBtn').textContent = t.demo;
  $('connTitle').textContent = t.settings; $('repoLabel').textContent = t.repo; $('branchLabel').textContent = t.branch;
  $('fileLabel').textContent = t.file; $('tokenLabel').textContent = t.token; $('saveConn').textContent = t.save;
  const open_ = Boolean(snap);
  $('gate').hidden = open_; $('app').hidden = !open_;
  $('lock').hidden = !open_; $('reload').hidden = !open_;
  $('stamp').textContent = open_ ? `${t.snapshotAt} ${snap.generated_at.replace('T', ' ').slice(0, 16)}` : '';
  $('stale').hidden = !(open_ && isStale(snap));
  $('stale').textContent = t.old;
  const s = $('strip'); s.replaceChildren();
  const tabs = $('tabs'); tabs.replaceChildren();
  const panel = $('panel'); panel.replaceChildren();
  if (!open_) return;
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

async function fetchBlob(src) {
  if (src.demo) return (await fetch('./demo/snapshot.enc.json', { cache: 'no-store' })).json();
  const url = `https://api.github.com/repos/${src.repo}/contents/${encodeURIComponent(src.file)}?ref=${encodeURIComponent(src.branch)}`;
  const res = await fetch(url, { cache: 'no-store', headers: { Accept: 'application/vnd.github.raw+json', Authorization: `Bearer ${src.token}` } });
  if (!res.ok) throw new Error('fetch');
  return res.json();
}

async function load(passphrase, src) {
  const err = $('err'); err.hidden = true;
  try {
    const blob = await fetchBlob(src);
    snap = JSON.parse(await open(blob, passphrase));
    secret = passphrase; source = src;
    clearTimeout(hiddenTimer);
  } catch (e) {
    err.textContent = e.message === 'wrong-passphrase' || e.message === 'bad-format' ? T().wrong : T().fetchFail;
    err.hidden = false; snap = null; secret = null;
  }
  $('pass').value = '';
  render();
}

function lock() {
  secret = null; snap = null; source = null; tab = 'today';
  $('pass').value = ''; $('err').hidden = true;
  render();
}

$('unlockForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const src = { demo: false, repo: store.get('pocket.repo'), branch: store.get('pocket.branch') || 'snapshot', file: store.get('pocket.file') || 'snapshot.enc.json', token: store.get('pocket.token') };
  load($('pass').value, src);
});
$('demoBtn').addEventListener('click', () => load(DEMO_PASSPHRASE, { demo: true }));
$('reload').addEventListener('click', () => { if (secret && source) load(secret, source); });
$('lock').addEventListener('click', lock);
$('lang').addEventListener('click', () => { lang = lang === 'vi' ? 'en' : 'vi'; store.set('pocket.lang', lang); document.documentElement.lang = lang; render(); });
$('saveConn').addEventListener('click', () => {
  store.set('pocket.repo', $('repo').value.trim()); store.set('pocket.branch', $('branch').value.trim());
  store.set('pocket.file', $('file').value.trim()); store.set('pocket.token', $('token').value.trim());
  $('token').value = '';
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) hiddenTimer = setTimeout(lock, AUTO_LOCK_MS); else clearTimeout(hiddenTimer);
});
addEventListener('pagehide', lock);

lang = store.get('pocket.lang') === 'en' ? 'en' : 'vi';
document.documentElement.lang = lang;
$('repo').value = store.get('pocket.repo'); $('branch').value = store.get('pocket.branch') || 'snapshot'; $('file').value = store.get('pocket.file') || 'snapshot.enc.json';
render();
