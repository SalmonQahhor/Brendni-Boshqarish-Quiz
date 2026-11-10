(() => {
'use strict';
const Q = window.QUESTIONS;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const BLOCK = 30, EXAM_N = 25, EXAM_SEC = EXAM_N * 60, KEY = 'salmon_brend_quiz_v1';
const LET = ['A', 'B', 'C', 'D'];

/* ---------- storage ---------- */
let DB = { history: [], qs: {} };
try { const raw = localStorage.getItem(KEY); if (raw) DB = Object.assign(DB, JSON.parse(raw)); } catch (e) {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) {} };
const rec = (id, ok) => {
  const s = DB.qs[id] || (DB.qs[id] = { c: 0, w: 0, last: null });
  ok ? s.c++ : s.w++; s.last = ok ? 1 : 0; save();
};

/* ---------- helpers ---------- */
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const fmt = s => { s = Math.max(0, Math.round(s)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
const blockRange = b => [b * BLOCK, Math.min(Q.length, (b + 1) * BLOCK)];
const nBlocks = Math.ceil(Q.length / BLOCK);

/* ---------- views ---------- */
function show(name) {
  $$('.view').forEach(v => v.classList.toggle('on', v.id === 'v-' + name));
  $$('nav button').forEach(b => b.classList.toggle('on', b.dataset.go === name));
  window.scrollTo({ top: 0 });
  if (name === 'home') renderHome();
  if (name === 'stats') renderStats();
}
$$('nav button').forEach(b => b.onclick = () => { if (S && $('#v-quiz').classList.contains('on')) return confirmExit(() => show(b.dataset.go)); show(b.dataset.go); });
$('#logo').onclick = () => $('#v-quiz').classList.contains('on') ? confirmExit(() => show('home')) : show('home');

function ask(title, text, yesLabel, cb) {
  $('#mT').textContent = title; $('#mP').textContent = text; $('#mYes').textContent = yesLabel || 'Ha';
  $('#modal').classList.add('on');
  $('#mYes').onclick = () => { $('#modal').classList.remove('on'); cb(); };
  $('#mNo').onclick = () => $('#modal').classList.remove('on');
}

/* ---------- charts (inline SVG) ---------- */
function donut(parts, center, sub) {
  const R = 70, C = 2 * Math.PI * R, tot = parts.reduce((a, p) => a + p.v, 0) || 1;
  let off = 0, segs = '';
  parts.forEach(p => {
    if (!p.v) return;
    const len = p.v / tot * C;
    segs += `<circle cx="100" cy="100" r="${R}" fill="none" stroke="${p.c}" stroke-width="22" stroke-dasharray="0 ${C}" stroke-dashoffset="${-off}" transform="rotate(-90 100 100)" stroke-linecap="butt"><animate attributeName="stroke-dasharray" from="0 ${C}" to="${len} ${C - len}" dur=".9s" fill="freeze" calcMode="spline" keySplines=".4 0 .2 1" keyTimes="0;1"/></circle>`;
    off += len;
  });
  return `<svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="${R}" fill="none" stroke="#e5efe9" stroke-width="22"/>${segs}<text x="100" y="104" text-anchor="middle" class="big" style="font-size:34px;font-weight:800;fill:#064e3b">${center}</text><text x="100" y="126" text-anchor="middle" style="font-size:11px;fill:#4f7366">${sub}</text></svg>`;
}
function ring(pct) {
  const R = 78, C = 2 * Math.PI * R, col = pct >= 86 ? '#10b981' : pct >= 56 ? '#f59e0b' : '#ef4444';
  return `<svg viewBox="0 0 200 200"><defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6ee7b7"/><stop offset="1" stop-color="${col}"/></linearGradient></defs>
  <circle cx="100" cy="100" r="${R}" fill="none" stroke="#e1f3ea" stroke-width="16"/>
  <circle cx="100" cy="100" r="${R}" fill="none" stroke="url(#rg)" stroke-width="16" stroke-linecap="round" transform="rotate(-90 100 100)" stroke-dasharray="0 ${C}"><animate attributeName="stroke-dasharray" from="0 ${C}" to="${C * pct / 100} ${C}" dur="1.1s" fill="freeze" calcMode="spline" keySplines=".4 0 .2 1" keyTimes="0;1"/></circle>
  <text x="100" y="112" text-anchor="middle" class="big">${pct}%</text></svg>`;
}
function bars(items, opt = {}) { // items: {label, v (0-100), c, title}
  const W = 560, H = opt.h || 200, pl = 30, pb = 26, pt = 10, n = items.length || 1;
  const bw = Math.min(46, (W - pl - 10) / n * .62), gap = (W - pl - 10) / n;
  let g = '';
  [0, 50, 100].forEach(t => { const y = pt + (H - pt - pb) * (1 - t / 100); g += `<line x1="${pl}" x2="${W}" y1="${y}" y2="${y}" stroke="#d9eee3" stroke-dasharray="3 4"/><text x="${pl - 6}" y="${y + 3}" text-anchor="end" font-size="9" fill="#7aa294">${t}</text>`; });
  items.forEach((it, i) => {
    const h = (H - pt - pb) * Math.max(0, it.v) / 100, x = pl + gap * i + (gap - bw) / 2, y = H - pb - h;
    g += `<rect x="${x}" y="${y}" width="${bw}" height="${Math.max(h, 2)}" rx="6" fill="${it.c || '#10b981'}"><title>${esc(it.title || it.label)}</title><animate attributeName="height" from="0" to="${Math.max(h, 2)}" dur=".7s" fill="freeze"/><animate attributeName="y" from="${H - pb}" to="${y}" dur=".7s" fill="freeze"/></rect>`;
    if (!opt.hideLabels) g += `<text x="${x + bw / 2}" y="${H - 8}" text-anchor="middle" font-size="9.5" fill="#4f7366">${esc(it.label)}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img">${g}</svg>`;
}
function line(vals) {
  const W = 560, H = 200, pl = 30, pb = 22, pt = 12;
  if (!vals.length) return '';
  const step = vals.length > 1 ? (W - pl - 14) / (vals.length - 1) : 0;
  const P = vals.map((v, i) => [pl + (vals.length > 1 ? step * i : (W - pl) / 2), pt + (H - pt - pb) * (1 - v / 100)]);
  let g = '';
  [0, 50, 100].forEach(t => { const y = pt + (H - pt - pb) * (1 - t / 100); g += `<line x1="${pl}" x2="${W}" y1="${y}" y2="${y}" stroke="#d9eee3" stroke-dasharray="3 4"/><text x="${pl - 6}" y="${y + 3}" text-anchor="end" font-size="9" fill="#7aa294">${t}</text>`; });
  const path = P.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = path + ` L${P[P.length - 1][0]} ${H - pb} L${P[0][0]} ${H - pb} Z`;
  g += `<defs><linearGradient id="la" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#10b981" stop-opacity=".35"/><stop offset="1" stop-color="#10b981" stop-opacity="0"/></linearGradient></defs><path d="${area}" fill="url(#la)"/><path d="${path}" fill="none" stroke="#059669" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"><animate attributeName="stroke-dashoffset" from="1" to="0" dur="1s" fill="freeze"/></path>`;
  P.forEach((p, i) => g += `<circle cx="${p[0]}" cy="${p[1]}" r="4.5" fill="#fff" stroke="#059669" stroke-width="2.5"><title>${vals[i]}%</title></circle>`);
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img">${g}</svg>`;
}

/* ---------- HOME ---------- */
function mistakeIds() { return Object.keys(DB.qs).filter(i => DB.qs[i].last === 0).map(Number).sort((a, b) => a - b); }
function renderHome() {
  const seen = Object.keys(DB.qs).length, mk = mistakeIds().length;
  const att = DB.history.length;
  const avg = att ? Math.round(DB.history.reduce((a, h) => a + h.pct, 0) / att) : 0;
  $('#homeChips').innerHTML = `
    <div class="chip">📚 Savollar <b>${Q.length}</b></div>
    <div class="chip">✅ Ko'rilgan <b>${seen}</b></div>
    <div class="chip">🏁 Urinishlar <b>${att}</b></div>
    <div class="chip">📈 O'rtacha <b>${avg}%</b></div>`;
  $('#mistakeTag').textContent = mk + ' ta';
  $('#mistakeMode').classList.toggle('dis', mk === 0);
  $('#blocks').innerHTML = Array.from({ length: nBlocks }, (_, b) => {
    const [s, e] = blockRange(b); let c = 0, tot = 0;
    for (let i = s; i < e; i++) { tot++; if (DB.qs[i] && DB.qs[i].last === 1) c++; }
    return `<button class="blk" data-b="${b}"><b>${s + 1}–${e}</b><small>${e - s} ta savol · ${c} ta to'g'ri</small><div class="bar"><i style="width:${Math.round(c / tot * 100)}%"></i></div></button>`;
  }).join('');
  $$('.blk').forEach(el => el.onclick = () => start('block', +el.dataset.b));
}
$$('.mode').forEach(el => el.onclick = () => start(el.dataset.mode));

/* ---------- QUIZ ENGINE ---------- */
let S = null, timer = null;
function start(mode, b) {
  let ids, title;
  if (mode === 'all') { ids = Q.map((_, i) => i); title = 'Hammasini ishlash'; }
  else if (mode === 'block') { const [s, e] = blockRange(b); ids = Array.from({ length: e - s }, (_, i) => s + i); title = `Blok ${b + 1}: ${s + 1}–${e}`; }
  else if (mode === 'exam') { ids = shuffle(Q.map((_, i) => i)).slice(0, EXAM_N); title = 'Imtihon rejimi'; }
  else { ids = shuffle(mistakeIds()); title = 'Xatolar ustida ishlash'; }
  if (!ids.length) return;
  S = {
    mode, title, exam: mode === 'exam', ids,
    opts: ids.map(id => shuffle(Q[id].o.map((t, k) => ({ t, ok: k === 0 })))),
    ans: ids.map(() => null), times: ids.map(() => 0),
    i: 0, t0: Date.now(), qStart: Date.now(), done: false
  };
  $('#qTitle').textContent = title;
  $('#qNav').hidden = !S.exam;
  $('#qPrev').style.visibility = S.exam ? 'visible' : 'hidden';
  show('quiz');
  clearInterval(timer);
  timer = setInterval(tick, 500); tick();
  renderQ();
}
function tick() {
  if (!S || S.done) return;
  const el = (Date.now() - S.t0) / 1000;
  const t = $('#qTime');
  if (S.exam) {
    const left = EXAM_SEC - el; t.textContent = '⏱ ' + fmt(left); t.classList.toggle('warn', left < 120);
    if (left <= 0) finish();
  } else { t.textContent = '⏱ ' + fmt(el); t.classList.remove('warn'); }
}
function stampTime() { if (!S) return; const n = Date.now(); S.times[S.i] += (n - S.qStart) / 1000; S.qStart = n; }
function counts() {
  let c = 0, w = 0;
  S.ans.forEach((a, i) => { if (a === null) return; S.opts[i][a].ok ? c++ : w++; });
  return { c, w };
}
function renderQ() {
  const i = S.i, id = S.ids[i], a = S.ans[i], locked = !S.exam && a !== null;
  $('#qNum').textContent = `Savol № ${id + 1}`;
  $('#qText').textContent = Q[id].q;
  $('#qCount').textContent = `${i + 1} / ${S.ids.length}`;
  $('#qProg').style.width = ((i + (a !== null ? 1 : 0)) / S.ids.length * 100) + '%';
  $('#qOpts').innerHTML = S.opts[i].map((o, k) => {
    let cls = 'opt';
    if (locked) { cls += ' lock'; if (o.ok) cls += ' right'; else if (k === a) cls += ' wrong'; }
    else if (a === k) cls += ' sel';
    return `<button class="${cls}" data-k="${k}"><span class="k">${LET[k]}</span><span>${esc(o.t)}</span></button>`;
  }).join('');
  $$('#qOpts .opt').forEach(el => el.onclick = () => choose(+el.dataset.k));
  const last = i === S.ids.length - 1;
  $('#qNext').textContent = last ? 'Yakunlash ✓' : 'Keyingi →';
  $('#qNext').disabled = !S.exam && a === null;
  $('#qPrev').disabled = i === 0;
  const { c, w } = counts();
  $('#qOk').textContent = S.exam ? `● ${S.ans.filter(x => x !== null).length}/${S.ids.length}` : '✓ ' + c;
  $('#qNo').style.display = S.exam ? 'none' : '';
  $('#qNo').textContent = '✗ ' + w;
  if (S.exam) $('#qNav').innerHTML = S.ids.map((_, k) => `<button class="${k === i ? 'cur' : S.ans[k] !== null ? 'done' : ''}" data-n="${k}">${k + 1}</button>`).join('');
  $$('#qNav button').forEach(el => el.onclick = () => go(+el.dataset.n));
}
function choose(k) {
  const i = S.i;
  if (!S.exam && S.ans[i] !== null) return;
  S.ans[i] = k;
  if (!S.exam) { stampTime(); rec(S.ids[i], S.opts[i][k].ok); }
  renderQ();
}
function go(n) { stampTime(); S.i = n; renderQ(); }
$('#qNext').onclick = () => { if (!S) return; S.i === S.ids.length - 1 ? tryFinish() : go(S.i + 1); };
$('#qPrev').onclick = () => { if (S && S.i > 0) go(S.i - 1); };
$('#qFinish').onclick = tryFinish;
$('#qExit').onclick = () => confirmExit(() => show('home'));
function confirmExit(cb) {
  ask('Testdan chiqasizmi?', 'Joriy urinish natijasi saqlanmaydi.', 'Chiqish', () => { clearInterval(timer); S = null; cb(); });
}
function tryFinish() {
  const un = S.ans.filter(a => a === null).length;
  if (un && S.exam) return ask('Yakunlaysizmi?', `${un} ta savolga javob berilmagan. Ular xato deb hisoblanadi.`, 'Yakunlash', finish);
  if (!S.exam && S.ans.every(a => a === null)) return;
  if (un && !S.exam) return ask('Yakunlaysizmi?', `${un} ta savol ishlanmagan. Natija faqat ishlanganlar bo'yicha hisoblanadi.`, 'Yakunlash', finish);
  finish();
}
document.addEventListener('keydown', e => {
  if (!S || S.done || !$('#v-quiz').classList.contains('on') || $('#modal').classList.contains('on')) return;
  const k = { '1': 0, '2': 1, '3': 2, '4': 3, a: 0, b: 1, c: 2, d: 3 }[e.key.toLowerCase()];
  if (k !== undefined) return choose(k);
  if (e.key === 'Enter' || e.key === 'ArrowRight') { if (!$('#qNext').disabled) $('#qNext').click(); }
  else if (e.key === 'ArrowLeft' && S.exam) $('#qPrev').click();
});

/* ---------- FINISH / RESULT ---------- */
function finish() {
  if (!S || S.done) return;
  stampTime(); S.done = true; clearInterval(timer);
  const sec = (Date.now() - S.t0) / 1000;
  const wrong = [], skipped = [];
  let c = 0;
  S.ids.forEach((id, i) => {
    const a = S.ans[i];
    if (S.exam && a !== null) rec(id, S.opts[i][a].ok);
    if (a === null) { skipped.push(i); return; }
    S.opts[i][a].ok ? c++ : wrong.push(i);
  });
  const answered = S.exam ? S.ids.length : S.ids.length - skipped.length;
  const total = S.exam ? S.ids.length : answered;
  const pct = total ? Math.round(c / total * 100) : 0;
  DB.history.push({ t: Date.now(), mode: S.mode, title: S.title, total, correct: c, pct, sec: Math.round(sec) });
  DB.history = DB.history.slice(-100); save();
  renderResult({ c, wrong, skipped, pct, total, sec, S });
}
function verdict(p) {
  return p >= 90 ? ['🏆 Ajoyib natija!', 'Mavzuni juda yaxshi o\'zlashtirgansiz.'] :
    p >= 75 ? ['🔥 Juda yaxshi', 'Bir necha xato qoldi — tahlilni ko\'rib chiqing.'] :
    p >= 56 ? ['👍 Yaxshi, lekin yaxshilash mumkin', 'Xatolar ustida ishlash rejimidan foydalaning.'] :
    ['📖 Yana mashq qiling', 'Xatolar tahlilini o\'qib, qayta urinib ko\'ring.'];
}
function renderResult(r) {
  const { c, wrong, skipped, pct, total, sec, S: s } = r, v = verdict(pct);
  const items = s.ids.map((id, i) => ({
    label: String(i + 1), v: Math.min(100, s.times[i] / Math.max(...s.times, 1) * 100),
    c: s.ans[i] === null ? '#fbbf24' : s.opts[i][s.ans[i]].ok ? '#10b981' : '#f87171',
    title: `№${id + 1}: ${Math.round(s.times[i])} soniya`
  }));
  const maxT = Math.round(Math.max(...s.times));
  const errs = [...wrong, ...skipped].sort((a, b) => a - b).map(i => {
    const id = s.ids[i], a = s.ans[i], good = s.opts[i].find(o => o.ok).t;
    return `<div class="err ${a === null ? 'sk' : ''}"><div class="qq"><small>№${id + 1}</small>${esc(Q[id].q)}</div>
      ${a === null ? '<div class="ans s"><b>Javob</b><span>Berilmagan</span></div>' : `<div class="ans y"><b>Sizniki</b><span>${esc(s.opts[i][a].t)}</span></div>`}
      <div class="ans g"><b>To'g'ri</b><span>${esc(good)}</span></div></div>`;
  }).join('');
  $('#v-result').innerHTML = `
    <div class="hero" style="padding-bottom:6px"><h1>${esc(s.title)} <em>— natija</em></h1></div>
    <div class="rgrid">
      <div class="card panel ring">${ring(pct)}<div class="verdict">${v[0]}</div><p class="sub" style="margin:6px auto 0">${v[1]}</p></div>
      <div class="card panel"><h2>Javoblar taqsimoti</h2>
        <div class="ring">${donut([{ v: c, c: '#10b981' }, { v: wrong.length, c: '#f87171' }, { v: skipped.length, c: '#fbbf24' }], `${c}/${total}`, "to'g'ri")}</div>
        <div class="legend"><span><i style="background:#10b981"></i>To'g'ri ${c}</span><span><i style="background:#f87171"></i>Xato ${wrong.length}</span><span><i style="background:#fbbf24"></i>Qoldirilgan ${skipped.length}</span></div>
      </div>
    </div>
    <div class="kpis">
      <div class="kpi g"><small>To'g'ri</small><b>${c}</b></div>
      <div class="kpi r"><small>Xato</small><b>${wrong.length}</b></div>
      <div class="kpi"><small>Umumiy vaqt</small><b>${fmt(sec)}</b></div>
      <div class="kpi"><small>O'rtacha / savol</small><b>${Math.round(sec / Math.max(1, s.ids.length - (s.exam ? 0 : skipped.length)))}s</b></div>
    </div>
    <div class="card panel" style="margin-top:16px"><h2>Har bir savolga sarflangan vaqt</h2>
      ${bars(items, { hideLabels: s.ids.length > 40, h: 190 })}
      <div class="legend"><span><i style="background:#10b981"></i>To'g'ri</span><span><i style="background:#f87171"></i>Xato</span><span><i style="background:#fbbf24"></i>Qoldirilgan</span><span>Eng uzoq: ${maxT}s</span></div>
    </div>
    <div class="sec"><h2>Xatolar tahlili ${errs ? `<span style="color:#b91c1c;font-family:var(--mono)">(${wrong.length + skipped.length})</span>` : ''}</h2>
      ${errs || '<div class="card empty">🎉 Xato yo\'q — barcha javoblar to\'g\'ri!</div>'}
    </div>
    <div class="row">
      <button class="btn pri" id="rAgain">↻ Qayta ishlash</button>
      ${wrong.length + skipped.length && s.mode !== 'mistakes' ? '<button class="btn red" id="rMis">🔁 Faqat xatolarni ishlash</button>' : ''}
      <button class="btn sec" id="rHome">← Bosh sahifa</button>
      <button class="btn sec" id="rStats">📊 Statistika</button>
    </div>`;
  const again = () => s.mode === 'block' ? start('block', Math.floor(s.ids[0] / BLOCK)) : start(s.mode);
  $('#rAgain').onclick = again;
  $('#rHome').onclick = () => show('home');
  $('#rStats').onclick = () => show('stats');
  if ($('#rMis')) $('#rMis').onclick = () => {
    const bad = [...wrong, ...skipped].map(i => s.ids[i]);
    S = { mode: 'mistakes', title: 'Xatolarni qayta ishlash', exam: false, ids: shuffle(bad), done: false, i: 0, t0: Date.now(), qStart: Date.now() };
    S.opts = S.ids.map(id => shuffle(Q[id].o.map((t, k) => ({ t, ok: k === 0 })))); S.ans = S.ids.map(() => null); S.times = S.ids.map(() => 0);
    $('#qTitle').textContent = S.title; $('#qNav').hidden = true; $('#qPrev').style.visibility = 'hidden';
    show('quiz'); clearInterval(timer); timer = setInterval(tick, 500); renderQ();
  };
  show('result');
}

/* ---------- STATS ---------- */
function renderStats() {
  const H = DB.history, att = H.length;
  const el = $('#v-stats');
  if (!att && !Object.keys(DB.qs).length) {
    el.innerHTML = `<div class="hero"><h1>Statistika</h1></div><div class="card empty" style="padding:50px">📊 Hozircha ma'lumot yo'q. Birinchi testni ishlang — natijalar shu yerda ko'rinadi.</div>`;
    return;
  }
  const avg = att ? Math.round(H.reduce((a, h) => a + h.pct, 0) / att) : 0;
  const best = att ? Math.max(...H.map(h => h.pct)) : 0;
  const totalC = Object.values(DB.qs).reduce((a, s) => a + s.c, 0), totalW = Object.values(DB.qs).reduce((a, s) => a + s.w, 0);
  const mastered = Object.values(DB.qs).filter(s => s.last === 1).length;
  const blk = Array.from({ length: nBlocks }, (_, b) => {
    const [s, e] = blockRange(b); let c = 0, w = 0;
    for (let i = s; i < e; i++) if (DB.qs[i]) { c += DB.qs[i].c; w += DB.qs[i].w; }
    return { label: `${s + 1}-${e}`, v: c + w ? Math.round(c / (c + w) * 100) : 0, c: c + w ? '#10b981' : '#d9eee3', title: c + w ? `${s + 1}–${e}: ${c} to'g'ri, ${w} xato` : `${s + 1}–${e}: ma'lumot yo'q` };
  });
  const hard = Object.entries(DB.qs).filter(([, s]) => s.w > 0).sort((a, b) => b[1].w - a[1].w || a[0] - b[0]).slice(0, 8);
  const heat = Q.map((_, i) => { const s = DB.qs[i]; return `<i class="${s ? (s.last === 1 ? 'g' : 'b') : ''}" title="№${i + 1}${s ? (s.last === 1 ? ' — to\'g\'ri' : ' — xato') : ' — ishlanmagan'}">${i + 1}</i>`; }).join('');
  el.innerHTML = `
    <div class="hero" style="padding-bottom:6px"><h1>Sizning <em>statistikangiz</em></h1></div>
    <div class="kpis">
      <div class="kpi"><small>Urinishlar</small><b>${att}</b></div>
      <div class="kpi g"><small>O'rtacha natija</small><b>${avg}%</b></div>
      <div class="kpi"><small>Eng yaxshi</small><b>${best}%</b></div>
      <div class="kpi"><small>Aniqlik (jami)</small><b>${totalC + totalW ? Math.round(totalC / (totalC + totalW) * 100) : 0}%</b></div>
      <div class="kpi g"><small>O'zlashtirilgan</small><b>${mastered}/${Q.length}</b></div>
    </div>
    <div class="rgrid">
      <div class="card panel"><h2>Natijalar dinamikasi</h2>${att ? line(H.slice(-15).map(h => h.pct)) : '<div class="empty">Ma\'lumot yo\'q</div>'}<div class="legend"><span>So'nggi ${Math.min(att, 15)} ta urinish, %</span></div></div>
      <div class="card panel"><h2>Bloklar bo'yicha aniqlik</h2>${bars(blk)}<div class="legend"><span>Har bir 30 talik blok, %</span></div></div>
    </div>
    <div class="rgrid">
      <div class="card panel"><h2>Umumiy javoblar</h2><div class="ring">${donut([{ v: totalC, c: '#10b981' }, { v: totalW, c: '#f87171' }], totalC + totalW, 'javob')}</div>
        <div class="legend"><span><i style="background:#10b981"></i>To'g'ri ${totalC}</span><span><i style="background:#f87171"></i>Xato ${totalW}</span></div></div>
      <div class="card panel"><h2>Eng ko'p xato qilingan savollar</h2>
        ${hard.length ? `<div class="hard">${hard.map(([id, s]) => `<div><b>${s.w}× xato</b><span><small style="font-family:var(--mono);color:var(--mut)">№${+id + 1}</small> ${esc(Q[id].q)}</span></div>`).join('')}</div>` : '<div class="empty">Hali xato yo\'q 🎉</div>'}</div>
    </div>
    <div class="card panel" style="margin-top:16px"><h2>Savollar xaritasi</h2><div class="heat">${heat}</div>
      <div class="legend"><span><i style="background:#10b981"></i>Oxirgi javob to'g'ri</span><span><i style="background:#f87171"></i>Oxirgi javob xato</span><span><i style="background:#e5efe9"></i>Ishlanmagan</span></div></div>
    <div class="row"><button class="btn red" id="reset">Statistikani tozalash</button></div>`;
  $('#reset').onclick = () => ask('Statistikani tozalaysizmi?', 'Barcha natijalar va xatolar o\'chiriladi.', 'Tozalash', () => { DB = { history: [], qs: {} }; save(); renderStats(); });
}

/* ---------- INTRO (terminal) ---------- */
const intro = $('#intro'), body = $('#termBody'), pb = $('#pb');
let skipped = false;
const closeIntro = () => { skipped = true; intro.classList.add('hide'); try { sessionStorage.setItem('salmon_intro', '1'); } catch (e) {} setTimeout(() => intro.remove(), 800); };
$('#skip').onclick = closeIntro; intro.addEventListener('dblclick', closeIntro);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const SCRIPT = [
  { cmd: 'whoami', out: ['<span class="c">guest</span>'] },
  { cmd: 'sudo access --request brend-quiz', out: ['[sudo] password for guest: <span class="c">••••••••</span>', '<span class="w">⚠ ruxsat so\'ralmoqda...</span>'], wait: 500 },
  { cmd: 'load questions.db', out: ['<span class="d">→ parsing Brending_160_ta_test_javoblari.docx</span>', `<span class="ok">[ OK ]</span> ${Q.length} ta savol yuklandi`, '<span class="ok">[ OK ]</span> to\'g\'ri javoblar (*) aniqlandi'] },
  { cmd: 'init modes --blocks=30 --exam=25 --stats', out: [`<span class="ok">[ OK ]</span> ${nBlocks} ta blok  ·  barchasi (${Q.length})  ·  imtihon (${EXAM_N})`, '<span class="ok">[ OK ]</span> statistika va xatolar tahlili tayyor'] },
  { cmd: 'ping salmon --permission', out: ['<span class="d">64 bytes from salmon: time=0.8ms</span>', '<span class="d">verifying signature ........</span>'], wait: 600 },
];
async function typeLine(cmd) {
  const row = document.createElement('div');
  row.innerHTML = '<span class="p">salmon@quiz</span><span class="d">:~$</span> <span class="c"></span><span class="cur"></span>';
  body.appendChild(row);
  const t = row.querySelector('.c');
  for (const ch of cmd) { if (skipped) return; t.textContent += ch; await sleep(22 + Math.random() * 38); }
  row.querySelector('.cur').remove();
}
async function runIntro() {
  try { if (sessionStorage.getItem('salmon_intro')) { intro.remove(); return; } } catch (e) {}
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { intro.remove(); return; }
  await sleep(350);
  for (let i = 0; i < SCRIPT.length; i++) {
    const s = SCRIPT[i];
    await typeLine(s.cmd); if (skipped) return;
    await sleep(180);
    for (const o of s.out) { if (skipped) return; const d = document.createElement('div'); d.innerHTML = o; body.appendChild(d); body.scrollTop = body.scrollHeight; await sleep(230); }
    if (s.wait) await sleep(s.wait);
    pb.style.width = ((i + 1) / SCRIPT.length * 100) + '%';
    body.scrollTop = body.scrollHeight;
  }
  if (skipped) return;
  const d = document.createElement('div');
  d.innerHTML = '<span class="big">✔ SALMON TOMONIDAN RUXSAT BERILDI</span><span class="ok" style="display:block;margin-top:6px">ACCESS GRANTED — xush kelibsiz!</span>';
  body.appendChild(d); body.scrollTop = body.scrollHeight;
  await sleep(1700);
  if (!skipped) closeIntro();
}

renderHome();
runIntro();
})();
