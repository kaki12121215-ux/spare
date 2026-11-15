/* Spare · versión 1.0 */
(() => {
'use strict';
const VERSION = '1.2';

/* ---------- utilidades de fecha ---------- */
const DAY = 86400000;
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const MESES_C = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const DIAS = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const sod = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const addMonths = (d, n) => { const x = new Date(d.getFullYear(), d.getMonth() + n, 1); const dim = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate(); x.setDate(Math.min(d.getDate(), dim)); return x; };
const daysBetween = (a, b) => Math.round((sod(b) - sod(a)) / DAY);
const dim = (y, m) => new Date(y, m + 1, 0).getDate();
const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const parseISO = s => { if (!s) return null; const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const fechaLarga = d => cap(DIAS[d.getDay()]) + ' ' + d.getDate() + ' de ' + MESES[d.getMonth()];
const fechaCorta = d => d.getDate() + ' ' + MESES_C[d.getMonth()] + ' ' + d.getFullYear();
const fechaMedia = (d, now) => d.getDate() + ' de ' + MESES[d.getMonth()] + (d.getFullYear() !== now.getFullYear() ? ' de ' + d.getFullYear() : '');
const pl = (n, s, p) => n === 1 ? s : p;
const miles = n => { const s = String(Math.abs(n)); return (n < 0 ? '-' : '') + s.replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };
const hh = (h, m = 0) => String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');

/* ---------- ajustes guardados ---------- */
const KEY = 'spare.v1';
const COLORS = { coral: '#FF6B5B', violeta: '#8B7CF6', ambar: '#F5A524', turquesa: null, rosa: '#F06BA8', verde: '#3CC37A' };
const DEFAULTS = {
  birth: null, life: 90, weekStart: 1, courseStart: '09-01', courseEnd: '06-30',
  courseShow: false, courseColor: 'ambar',
  countdowns: [], milestones: [], theme: 'auto', open: 'last', last: 'vida',
  units: { vida: 'Semanas', ano: 'Días', mes: 'Días', semana: 'Días', dia: 'Horas' }, cdUnits: {}, hintShown: false
};
let S = load();
function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s) return Object.assign({}, DEFAULTS, s, { units: Object.assign({}, DEFAULTS.units, s.units || {}) }); } catch (e) {}
  return JSON.parse(JSON.stringify(DEFAULTS));
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

/* ---------- tema ---------- */
const mq = matchMedia('(prefers-color-scheme: dark)');
let THEME = 'light';
function applyTheme() {
  THEME = S.theme === 'auto' ? (mq.matches ? 'dark' : 'light') : S.theme;
  document.documentElement.dataset.theme = THEME;
  const bg = THEME === 'dark' ? '#0B0D14' : '#F7F7F5';
  document.querySelectorAll('meta[name="theme-color"]').forEach(m => { m.removeAttribute('media'); m.setAttribute('content', bg); });
}
mq.addEventListener && mq.addEventListener('change', () => { applyTheme(); rebuild(); });
const PAL = {
  light: { ink: [17, 17, 17, 1], gone: [220, 220, 216, 1], left: [17, 17, 17, 1], acc: '#0FB8B0', glowA: .45 },
  dark: { ink: [242, 243, 247, 1], gone: [242, 243, 247, .13], left: [242, 243, 247, .92], acc: '#2EE6D6', glowA: .55 }
};
const P = () => PAL[THEME];
const hex2rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), 1];
const colorOf = name => COLORS[name] || P().acc;
const rgba = (c, a = 1) => 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + ((c[3] ?? 1) * a) + ')';
const mixc = (a, b, p) => 'rgba(' + [0, 1, 2].map(i => Math.round(a[i] + (b[i] - a[i]) * p)).join(',') + ',' + ((a[3] ?? 1) + ((b[3] ?? 1) - (a[3] ?? 1)) * p) + ')';

/* ---------- curvas ---------- */
const bez = (x1, y1, x2, y2) => t => { if (t <= 0) return 0; if (t >= 1) return 1; let a = 0, b = 1, m = 0; for (let i = 0; i < 26; i++) { m = (a + b) / 2; const u = 1 - m, x = 3 * u * u * m * x1 + 3 * u * m * m * x2 + m * m * m; if (x < t) a = m; else b = m; } const u = 1 - m; return 3 * u * u * m * y1 + 3 * u * m * m * y2 + m * m * m; };
const ENT = bez(.2, 0, 0, 1), SAL = bez(.4, 0, 1, 1), SOFT = bez(.45, 0, .2, 1), MUE = bez(.3, 1.2, .4, 1);
const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const seg = (t, a, b) => cl((t - a) / (b - a));
const lerp = (a, b, p) => a + (b - a) * p;
const llerp = (a, b, p) => Math.exp(lerp(Math.log(a), Math.log(b), p));
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- lienzo ---------- */
const cv = document.getElementById('sp-stage');
const X = cv.getContext('2d');
let W = 390, H = 844, DPR = 1, ST = 47, SB = 34;
const STANDALONE = !!(navigator.standalone || matchMedia('(display-mode: standalone)').matches);
let lastDims = '';
function measure() {
  DPR = Math.min(3, window.devicePixelRatio || 1);
  W = window.innerWidth;
  H = Math.max(window.innerHeight, document.documentElement.clientHeight);
  const cs = getComputedStyle(document.getElementById('sp-safe'));
  ST = parseFloat(cs.paddingTop) || 0; SB = parseFloat(cs.paddingBottom) || 0;
  // al abrir la app instalada, iOS a veces da los márgenes tarde: se fijan los del iPhone
  if (STANDALONE && ST < 20) ST = 47;
  if (STANDALONE && SB < 1 && H > 780) SB = 34;
  ST = Math.max(ST, 20);
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  const d = W + 'x' + H + 'x' + ST + 'x' + SB, changed = d !== lastDims; lastDims = d; return changed;
}

/* ---------- vistas ---------- */
const VIEWS = ['vida', 'ano', 'mes', 'semana', 'dia'];
const NAVN = { vida: 'Vida', ano: 'Año', mes: 'Mes', semana: 'Semana', dia: 'Día' };
const UNITS = { vida: ['Días', 'Semanas', 'Meses', 'Años'], ano: ['Días', 'Semanas', 'Meses', '%'], mes: ['Días', 'Semanas'], semana: ['Días', 'Horas'], dia: ['Horas', 'Cuartos'], cd: ['Días', 'Semanas'] };
const WD = ws => ws === 1 ? ['L', 'M', 'X', 'J', 'V', 'S', 'D'] : ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

function courseCd(now) {
  const [sm, sd] = S.courseStart.split('-').map(Number), [em, ed] = S.courseEnd.split('-').map(Number);
  let y = now.getFullYear();
  let start = new Date(y, sm - 1, sd);
  if (sod(now) < start) start = new Date(y - 1, sm - 1, sd);
  let end = new Date(start.getFullYear() + (em < sm || (em === sm && ed < sd) ? 1 : 0), em - 1, ed);
  return { id: 'curso', name: 'Curso', date: iso(end), start: iso(start), color: S.courseColor, show: S.courseShow, system: true };
}
function allCds(now) { return [courseCd(now)].concat(S.countdowns); }
function pagesList(now) { return VIEWS.concat(allCds(now).filter(c => c.show).map(c => 'cd:' + c.id)); }
function getCd(id, now) { return allCds(now).find(c => c.id === id); }

/* layout: reparte N puntos a todo el ancho */
function layout(N, cols, top, bottom, ratio, lead = 0, dims) {
  const gw = dims.W - 56, rows = Math.ceil((N + lead) / cols);
  const cell = Math.min(gw / cols, (bottom - top) / rows);
  const s = Math.max(.8, cell * ratio);
  const xp = cols > 1 ? (gw - s) / (cols - 1) : 0;
  const out = [];
  for (let i = 0; i < N; i++) { const k = i + lead; out.push({ x: 28 + s / 2 + (cols > 1 ? (k % cols) * xp : (gw - s) / 2), y: top + s / 2 + Math.floor(k / cols) * cell, r: s / 2 }); }
  return { pts: out, xp, cell, s };
}
function autoCols(N, top, bottom, dims) {
  // mismas columnas siempre, sin depender del alto de la pantalla en cada apertura
  let best = 1, bc = 0; const gw = dims.W - 56, hh = gw * 1.35;
  for (let c = 1; c <= 400; c++) { const cell = Math.min(gw / c, hh / Math.ceil(N / c)); if (cell >= bc - 0.01) { bc = cell; best = c; } }
  return best;
}

/* construye una página: textos y puntos */
function build(key, unit, now, dims) {
  dims = dims || { W, H, ST, SB };
  const top = dims.ST + 245, bottom = dims.H - dims.SB - 80;
  const pg = { key, unit, date: '', num: '', unitText: '', units: [], dots: [], today: -1, goal: -1, wd: null, acc: null, legend: null, dayLevel: false, wdY: top + 12 };
  const today = sod(now);
  const mins = now.getHours() * 60 + now.getMinutes();
  const set = (N, gone, cols, ratio, lead = 0, gtop = top) => {
    const L = layout(N, cols, gtop, bottom, ratio, lead, dims);
    pg.dots = L.pts.map((p, i) => Object.assign(p, { st: i < gone ? 'g' : (i === gone ? 't' : 'l') }));
    pg.today = gone < N ? gone : -1; pg.L = L;
  };
  const ws = S.weekStart;
  if (key === 'vida') {
    pg.units = UNITS.vida;
    const b = parseISO(S.birth) || new Date(1998, 0, 1);
    pg.date = 'Si llegas a los ' + S.life;
    if (unit === 'Días') {
      const end = new Date(b.getFullYear() + S.life, b.getMonth(), b.getDate());
      const tot = daysBetween(b, end), lived = cl(daysBetween(b, today), 0, tot);
      set(tot, lived, 183, .42); // una fila por cada medio año
      const left = Math.max(0, tot - lived - 1); pg.num = miles(left); pg.unitText = pl(left, 'día', 'días') + ' por delante';
      pg.dayLevel = true;
      pg.dateOf = i => { const s = addDays(b, i); return { s, e: addDays(s, 1), t: fechaLarga(s) + ' de ' + s.getFullYear(), age: Math.floor(daysBetween(b, s) / 365.25) }; };
    } else if (unit === 'Meses') {
      const tot = S.life * 12; let lived = (today.getFullYear() - b.getFullYear()) * 12 + today.getMonth() - b.getMonth() - (today.getDate() < b.getDate() ? 1 : 0);
      lived = cl(lived, 0, tot); set(tot, lived, 24, .6);
      const left = Math.max(0, tot - lived - 1); pg.num = miles(left); pg.unitText = pl(left, 'mes', 'meses') + ' por delante';
      pg.dateOf = i => { const s = addMonths(b, i); return { s, e: addMonths(b, i + 1), t: cap(MESES[s.getMonth()]) + ' de ' + s.getFullYear(), age: Math.floor(i / 12) }; };
    } else if (unit === 'Años') {
      const tot = S.life; let age = today.getFullYear() - b.getFullYear() - ((today.getMonth() < b.getMonth() || (today.getMonth() === b.getMonth() && today.getDate() < b.getDate())) ? 1 : 0);
      age = cl(age, 0, tot); set(tot, age, 10, .6);
      const left = Math.max(0, tot - age - 1); pg.num = miles(left); pg.unitText = pl(left, 'año', 'años') + ' por delante';
      pg.dateOf = i => { const s = new Date(b.getFullYear() + i, b.getMonth(), b.getDate()); return { s, e: new Date(b.getFullYear() + i + 1, b.getMonth(), b.getDate()), t: 'De ' + i + ' a ' + (i + 1) + ' años', age: i }; };
    } else {
      const tot = S.life * 52; const lived = cl(Math.floor(daysBetween(b, today) / 7), 0, tot);
      set(tot, lived, 52, .64);
      const left = Math.max(0, tot - lived - 1); pg.num = miles(left); pg.unitText = pl(left, 'semana', 'semanas') + ' por delante';
      pg.dateOf = i => { const s = addDays(b, i * 7); return { s, e: addDays(s, 7), t: 'Semana del ' + fechaMedia(s, now), age: Math.floor(i / 52) }; };
    }
  } else if (key === 'ano') {
    pg.units = UNITS.ano; pg.date = fechaLarga(now);
    const Y = now.getFullYear(), N = (new Date(Y + 1, 0, 1) - new Date(Y, 0, 1)) / DAY | 0, doy = daysBetween(new Date(Y, 0, 1), today) + 1, rem = N - doy;
    const jan1 = new Date(Y, 0, 1), off = (jan1.getDay() - ws + 7) % 7;
    if (unit === 'Semanas') {
      const NW = Math.floor((N - 1 + off) / 7) + 1, wi = Math.floor((doy - 1 + off) / 7);
      set(NW, wi, 8, .52);
      const w = Math.floor(rem / 7), d = rem % 7;
      if (w === 0) { pg.num = String(d); pg.unitText = pl(d, 'día queda', 'días quedan') + ' de ' + Y; }
      else { pg.num = String(w); pg.unitText = pl(w, 'semana', 'semanas') + (d ? ' y ' + d + ' ' + pl(d, 'día', 'días') : '') + ' quedan de ' + Y; }
      pg.dateOf = i => { const s = addDays(jan1, i * 7 - off); return { s, e: addDays(s, 7), t: 'Semana del ' + fechaMedia(s < jan1 ? jan1 : s, now) }; };
    } else if (unit === 'Meses') {
      const m = now.getMonth(); set(12, m, 4, .5);
      const left = 11 - m, d = dim(Y, m) - now.getDate();
      if (left === 0) { pg.num = String(d); pg.unitText = pl(d, 'día queda', 'días quedan') + ' de ' + Y; }
      else { pg.num = String(left); pg.unitText = pl(left, 'mes', 'meses') + (d ? ' y ' + d + ' ' + pl(d, 'día', 'días') : '') + ' quedan de ' + Y; }
      pg.dateOf = i => ({ s: new Date(Y, i, 1), e: new Date(Y, i + 1, 1), t: cap(MESES[i]) + ' de ' + Y });
    } else if (unit === '%') {
      const pct = ((doy - 1) + mins / 1440) / N * 100; const g = Math.min(99, Math.floor(pct));
      set(100, g, 10, .5);
      pg.num = pct.toFixed(1).replace('.', ','); pg.unitText = '% del año vivido';
      pg.dateOf = i => { const s = addDays(jan1, Math.ceil(i / 100 * N)); return { s, e: addDays(jan1, Math.ceil((i + 1) / 100 * N)), t: 'El ' + i + ' % del año', sub: 'Se llega el ' + fechaMedia(s, now) }; };
    } else {
      set(N, doy - 1, 19, .47); pg.dayLevel = true;
      pg.num = String(rem); pg.unitText = pl(rem, 'día queda', 'días quedan') + ' de ' + Y;
      pg.dateOf = i => { const s = addDays(jan1, i); return { s, e: addDays(s, 1), t: fechaLarga(s) }; };
    }
  } else if (key === 'mes') {
    pg.units = UNITS.mes; pg.date = fechaLarga(now);
    const Y = now.getFullYear(), M = now.getMonth(), D = dim(Y, M), d0 = new Date(Y, M, 1), lead = (d0.getDay() - ws + 7) % 7, rem = D - now.getDate();
    if (unit === 'Semanas') {
      const NW = Math.ceil((lead + D) / 7), wi = Math.floor((lead + now.getDate() - 1) / 7);
      set(NW, wi, NW, .6);
      const w = Math.floor(rem / 7), d = rem % 7;
      if (w === 0) { pg.num = String(d); pg.unitText = pl(d, 'día queda', 'días quedan') + ' de ' + MESES[M]; }
      else { pg.num = String(w); pg.unitText = pl(w, 'semana', 'semanas') + (d ? ' y ' + d + ' ' + pl(d, 'día', 'días') : '') + ' quedan de ' + MESES[M]; }
      pg.dateOf = i => { const s = addDays(d0, i * 7 - lead); return { s, e: addDays(s, 7), t: 'Semana del ' + fechaMedia(s < d0 ? d0 : s, now) }; };
    } else {
      set(D, now.getDate() - 1, 7, .64, lead, top + 30); pg.wd = WD(ws); pg.dayLevel = true;
      pg.num = String(rem); pg.unitText = pl(rem, 'día queda', 'días quedan') + ' de ' + MESES[M];
      pg.dateOf = i => { const s = new Date(Y, M, i + 1); return { s, e: addDays(s, 1), t: fechaLarga(s) }; };
    }
  } else if (key === 'semana') {
    pg.units = UNITS.semana; pg.date = fechaLarga(now);
    const di = (now.getDay() - ws + 7) % 7, w0 = addDays(today, -di);
    const remMin = 7 * 1440 - (di * 1440 + mins);
    if (unit === 'Horas') {
      set(168, di * 24 + now.getHours(), 24, .55, 0, top + 30); pg.wd = null;
      const h = Math.floor(remMin / 60), m = remMin % 60;
      pg.num = String(h); pg.unitText = pl(h, 'hora', 'horas') + (m ? ' y ' + m + ' ' + pl(m, 'minuto', 'minutos') : '') + ' quedan de esta semana';
      pg.rowLabels = WD(ws);
      pg.dateOf = i => { const s = addDays(w0, Math.floor(i / 24)); s.setHours(i % 24); return { s, e: new Date(+s + 3600000), t: cap(DIAS[s.getDay()]) + ', de ' + hh(i % 24) + ' a ' + hh((i % 24 + 1) % 24) }; };
    } else {
      set(7, di, 7, .72, 0, top + 30); pg.wd = WD(ws); pg.dayLevel = true;
      const rem = 6 - di;
      if (rem > 0) { pg.num = String(rem); pg.unitText = pl(rem, 'día queda', 'días quedan') + ' de esta semana'; }
      else { const h = Math.floor(remMin / 60), m = remMin % 60; pg.num = String(h || m); pg.unitText = h ? pl(h, 'hora', 'horas') + (m ? ' y ' + m + ' ' + pl(m, 'minuto', 'minutos') : '') + ' quedan de esta semana' : pl(m, 'minuto queda', 'minutos quedan') + ' de esta semana'; }
      pg.dateOf = i => { const s = addDays(w0, i); return { s, e: addDays(s, 1), t: fechaLarga(s) }; };
    }
  } else if (key === 'dia') {
    pg.units = UNITS.dia; pg.date = fechaLarga(now);
    const remMin = 1440 - mins;
    if (unit === 'Cuartos') {
      set(96, Math.floor(mins / 15), 8, .5);
      const q = Math.floor(remMin / 15); pg.num = String(q); pg.unitText = pl(q, 'cuarto de hora queda', 'cuartos de hora quedan') + ' de hoy';
      pg.dateOf = i => { const s = new Date(today); s.setMinutes(i * 15); return { s, e: new Date(+s + 900000), t: 'De ' + hh(Math.floor(i / 4), (i % 4) * 15) + ' a ' + hh(Math.floor((i + 1) / 4) % 24, ((i + 1) % 4) * 15) }; };
    } else {
      set(24, now.getHours(), 4, .52);
      const h = Math.floor(remMin / 60), m = remMin % 60;
      if (h > 0) { pg.num = String(h); pg.unitText = pl(h, 'hora', 'horas') + (m ? ' y ' + m + ' ' + pl(m, 'minuto', 'minutos') : '') + ' quedan de hoy'; }
      else { pg.num = String(m); pg.unitText = pl(m, 'minuto queda', 'minutos quedan') + ' de hoy'; }
      pg.dateOf = i => { const s = new Date(today); s.setHours(i); return { s, e: new Date(+s + 3600000), t: 'De ' + hh(i) + ' a ' + hh((i + 1) % 24) }; };
    }
  } else if (key.startsWith('cd:')) {
    const c = getCd(key.slice(3), now);
    pg.units = UNITS.cd; pg.acc = colorOf(c.color); pg.cd = c;
    const tgt = parseISO(c.date), st0 = parseISO(c.start) || today, start = st0 > tgt ? tgt : st0;
    const N = daysBetween(start, tgt) + 1, idx = daysBetween(start, today);
    const left = daysBetween(today, tgt);
    pg.date = c.name;
    if (unit === 'Semanas') {
      const NW = Math.ceil(N / 7), wi = Math.floor(idx / 7);
      const g = idx < 0 ? -1 : Math.min(wi, NW);
      const cols = autoCols(NW, top, bottom - 50, dims); set(NW, g < 0 ? 0 : g, cols, .6);
      if (g < 0) pg.dots.forEach(d => d.st = 'l');
      const w = Math.floor(Math.max(0, left) / 7), d = Math.max(0, left) % 7;
      pg.num = String(left > 0 ? (w || d) : Math.abs(left));
      pg.unitText = left > 0 ? (w ? pl(w, 'semana', 'semanas') + (d ? ' y ' + d + ' ' + pl(d, 'día', 'días') : '') : pl(d, 'día', 'días')) + ' hasta ' + c.name : (left === 0 ? 'Es hoy' : pl(-left, 'día', 'días') + ' desde ' + c.name);
      pg.dateOf = i => { const s = addDays(start, i * 7); return { s, e: addDays(s, 7), t: 'Semana del ' + fechaMedia(s, now) }; };
    } else {
      const cols = autoCols(N, top, bottom - 50, dims);
      const g = idx < 0 ? 0 : Math.min(idx, N);
      set(N, g, cols, .6); pg.dayLevel = true;
      if (idx < 0) pg.dots.forEach(d => d.st = 'l');
      pg.goal = N - 1;
      pg.num = String(Math.abs(left));
      pg.unitText = left > 0 ? pl(left, 'día', 'días') + ' hasta ' + c.name : (left === 0 ? c.name + ' es hoy' : pl(-left, 'día', 'días') + ' desde ' + c.name);
      pg.dateOf = i => { const s = addDays(start, i); return { s, e: addDays(s, 1), t: fechaLarga(s) }; };
    }
    pg.legend = 'Desde el ' + fechaMedia(start, now) + ' hasta el ' + fechaMedia(tgt, now);
  }
  // hitos
  const ms = S.milestones.map(parseISO).filter(Boolean);
  pg.ms = new Set();
  if (ms.length && pg.dateOf) pg.dots.forEach((d, i) => { const r = pg.dateOf(i); if (ms.some(m => m >= sod(r.s) && m < r.e && (r.e - r.s) >= DAY * .99)) pg.ms.add(i); });
  return pg;
}

/* ---------- dibujo ---------- */
const FONT_NUM = "200 110px SpDisplay, -apple-system, system-ui";
const F = (w, s) => w + ' ' + s + 'px SpText, -apple-system, system-ui';
let NOW = 0;
const breath = () => .5 - .5 * Math.cos(NOW / 1000 * 2 * Math.PI / 3.2);
function glowDot(ctx, x, y, r, a, color) {
  r = Math.max(r, 2);
  const b = REDUCED ? .6 : breath(); const c = hex2rgb(color);
  const g = Math.max(6, r * 2.2) * (.75 + .6 * b);
  const grd = ctx.createRadialGradient(x, y, r * .5, x, y, r + g);
  grd.addColorStop(0, rgba(c, P().glowA * a * (.35 + .75 * b))); grd.addColorStop(1, rgba(c, 0));
  ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(x, y, r + g, 0, 7); ctx.fill();
  ctx.fillStyle = rgba(c, a * (.72 + .28 * b)); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
}
function txt(ctx, s, x, y, font, a = 1, align = 'left') {
  if (a <= 0) return; ctx.globalAlpha = a; ctx.font = font; ctx.fillStyle = rgba(P().ink); ctx.textAlign = align; ctx.fillText(s, x, y); ctx.globalAlpha = 1; ctx.textAlign = 'left';
}
/* cabecera; o: {a, dy, stag[4], numOverride, numA, numDy, unitMix} */
function drawHeader(ctx, pg, o = {}, dims) {
  dims = dims || { ST };
  const T = dims.ST, a = o.a ?? 1, st = o.stag || [1, 1, 1, 1];
  const blk = i => [a * st[i], (1 - st[i]) * 10 + (o.dy || 0)];
  let [a0, d0] = blk(0);
  if (pg.acc) { ctx.globalAlpha = a0; ctx.fillStyle = pg.acc; ctx.beginPath(); ctx.arc(34, T + 44 + d0, 5, 0, 7); ctx.fill(); ctx.globalAlpha = 1; txt(ctx, pg.date, 46, T + 49 + d0, F(400, 15), a0 * .5); }
  else txt(ctx, pg.date, 28, T + 49 + d0, F(400, 15), a0 * .5);
  let [a1, d1] = blk(1);
  txt(ctx, o.num ?? pg.num, 24, T + 153 + d1 + (o.numDy || 0), FONT_NUM, a1 * (o.numA ?? 1));
  let [a2, d2] = blk(2);
  txt(ctx, o.unitText ?? pg.unitText, 28, T + 182 + d2 + (o.numDy || 0) * .6, F(400, 17), a2 * .55 * (o.numA ?? 1));
  let [a3, d3] = blk(3);
  let x = 28; const rects = [];
  for (const u of pg.units) {
    let on = u === pg.unit ? 1 : 0;
    if (o.unitFrom) on = u === o.unitTo ? o.unitMix : (u === o.unitFrom ? 1 - o.unitMix : 0);
    const f = F(on > .5 ? 600 : 400, 13); ctx.font = f; const w = ctx.measureText(u).width;
    txt(ctx, u, x, T + 209 + d3, f, a3 * lerp(.38, 1, on));
    rects.push({ u, x: x - 9, y: T + 186, w: w + 18, h: 40 }); x += w + 18;
  }
  return rects;
}
function drawWD(ctx, pg, a, cam) {
  if (!pg.wd || a <= 0) return; const L = pg.L;
  pg.wd.forEach((l, i) => { let x = 28 + L.s / 2 + i * L.xp, y = pg.wdY; if (cam) { x = cam.tx + (x - cam.fx) * cam.s; y = cam.ty + (y - cam.fy) * cam.s; } txt(ctx, l, x, y, F(400, 12), a * .4, 'center'); });
}
/* puntos; cam: {s, fx, fy, tx, ty}; reveal: {cx, cy, R, f} */
function drawDots(ctx, pg, o = {}) {
  const pal = P(), cam = o.cam, s = cam ? cam.s : 1, a0 = o.a ?? 1;
  const acc = pg.acc || pal.acc, accC = hex2rgb(acc);
  let td = null;
  for (let i = 0; i < pg.dots.length; i++) {
    const d = pg.dots[i];
    let x = d.x, y = d.y;
    if (cam) { x = cam.tx + (d.x - cam.fx) * s; y = cam.ty + (d.y - cam.fy) * s; }
    x += o.ox || 0;
    let r = d.r * s;
    if (x < -r - 60 || x > W + r + 60 || y < -r - 60 || y > H + r + 60) continue;
    let a = a0;
    if (o.reveal) { const dd = Math.hypot(x - o.reveal.cx, y - o.reveal.cy); a *= cl((o.reveal.R - dd) / o.reveal.f); }
    if (o.hl && o.hl.i === i) r *= o.hl.sc;
    if (d.st === 't') { td = [x, y, r]; if (pg.ms.has(i)) ring(ctx, x, y, r, accC, a); continue; }
    if (i === pg.goal) { ctx.strokeStyle = rgba(accC, a); ctx.lineWidth = Math.max(1.5, r * .28); ctx.beginPath(); ctx.arc(x, y, r - ctx.lineWidth / 2, 0, 7); ctx.stroke(); continue; }
    if (a <= 0) continue;
    ctx.fillStyle = rgba(d.st === 'g' ? pal.gone : pal.left, a);
    if (r < 1.1) ctx.fillRect(x - r, y - r, r * 2, r * 2);
    else { ctx.beginPath(); ctx.arc(x, y, Math.max(.5, r), 0, 7); ctx.fill(); }
    if (pg.ms.has(i)) ring(ctx, x, y, r, accC, a);
  }
  if (td && !o.noToday) glowDot(ctx, td[0], td[1], td[2], a0, acc);
  return td;
}
function ring(ctx, x, y, r, c, a) { ctx.strokeStyle = rgba(c, a); ctx.lineWidth = Math.max(1.2, r * .22); ctx.beginPath(); ctx.arc(x, y, r + Math.max(2.5, r * .45), 0, 7); ctx.stroke(); }
function drawLegend(ctx, pg, a, ox = 0) {
  if (!pg.legend || a <= 0) return;
  const last = pg.dots[pg.dots.length - 1]; const y = last.y + last.r + 30;
  txt(ctx, pg.legend, 28 + ox, y, F(400, 13), a * .5);
}
function drawRowLabels(ctx, pg, a, ox = 0) {
  if (!pg.rowLabels) return; // semana por horas: etiqueta del día a la izquierda no cabe; se omite
}
/* página completa (cabecera + puntos) en un contexto */
function drawPage(ctx, pg, o = {}) {
  ctx.save(); if (o.ox) ctx.translate(o.ox, 0);
  const rects = drawHeader(ctx, pg, o.h || {});
  drawWD(ctx, pg, 1);
  drawLegend(ctx, pg, 1);
  ctx.restore();
  drawDots(ctx, pg, { ox: o.ox, noToday: o.noToday, hl: o.hl });
  return rects;
}

/* ---------- estado ---------- */
let now = new Date();
let pages = [], cur = 0, cache = {}, unitRects = [], anim = null, drag = null, pinch = null, bubble = null, hl = null, introDone = false;
function pageKey(i) { return pages[i]; }
function unitOf(key) { return key.startsWith('cd:') ? (S.cdUnits[key] || 'Días') : S.units[key]; }
function getPage(key) {
  if (!cache[key]) cache[key] = build(key, unitOf(key), now);
  return cache[key];
}
function rebuild() {
  now = new Date(); measure();
  const keep = pages[cur];
  pages = pagesList(now); cache = {};
  cur = Math.max(0, pages.indexOf(keep)); if (cur < 0) cur = 0;
  renderNav(); offs = {};
}
/* lienzos guardados por página (sin el punto de hoy) */
let offs = {};
function offscreen(key) {
  if (offs[key]) return offs[key];
  const pg = getPage(key);
  const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height;
  const ctx = c.getContext('2d'); ctx.scale(DPR, DPR);
  const save = X; // drawPage usa el contexto que se le pasa
  pg.rects = drawPage(ctx, pg, { noToday: true });
  offs[key] = c; return c;
}
function drawToday(pg, ox = 0, a = 1) {
  if (pg.today < 0) return; const d = pg.dots[pg.today];
  glowDot(X, d.x + ox, d.y, d.r, a, pg.acc || P().acc);
}

/* ---------- bucle ---------- */
function frame(ts) {
  NOW = ts;
  X.setTransform(DPR, 0, 0, DPR, 0, 0);
  X.clearRect(0, 0, W, H);
  if (anim) {
    const t = (ts - anim.t0) / anim.dur;
    anim.draw(cl(t), ts - anim.t0);
    if (t >= 1) { const done = anim.done; anim = null; done && done(); }
  } else if (drag) {
    drawSlide(cur - drag.dx / W);
  } else {
    const key = pages[cur], pg = getPage(key);
    X.drawImage(offscreen(key), 0, 0, W, H);
    if (hl) { // punto pulsado más grande
      const d = pg.dots[hl.i]; const sc = 1 + .7 * MUE(cl((ts - hl.t0) / 340));
      drawDotSingle(pg, hl.i, sc);
    }
    drawToday(pg);
  }
  requestAnimationFrame(frame);
}
function drawDotSingle(pg, i, sc) {
  const d = pg.dots[i], pal = P();
  if (d.st === 't') return;
  X.fillStyle = rgba(d.st === 'g' ? pal.gone : pal.left);
  X.beginPath(); X.arc(d.x, d.y, Math.max(3, d.r * sc), 0, 7); X.fill();
}
function drawSlide(pos) {
  const i0 = Math.floor(pos);
  for (let i = i0; i <= i0 + 1; i++) {
    if (i < 0 || i >= pages.length) continue;
    const off = (i - pos) * W; if (Math.abs(off) >= W) continue;
    X.drawImage(offscreen(pages[i]), off, 0, W, H);
    drawToday(getPage(pages[i]), off);
  }
  setNavPos(pos);
}

/* ---------- transiciones ---------- */
function goTo(target, fromPos) {
  target = cl(target, 0, pages.length - 1);
  const from = fromPos ?? cur;
  if (Math.abs(target - from) > 1.01) { // salto largo: fundido
    const A = pages[cur], B = pages[target];
    anim = { t0: performance.now(), dur: REDUCED ? 150 : 320, draw: (p) => {
      const pa = getPage(A), pb = getPage(B), e = ENT(p);
      X.globalAlpha = 1 - e; X.drawImage(offscreen(A), 0, -6 * e, W, H); drawToday(pa, 0, 1 - e);
      X.globalAlpha = e; X.drawImage(offscreen(B), 0, 6 * (1 - e), W, H); drawToday(pb, 0, e); X.globalAlpha = 1;
    }, done: () => setCur(target) };
    setNavActive(target);
    return;
  }
  const d = Math.abs(target - from);
  anim = { t0: performance.now(), dur: REDUCED ? 150 : 260 + 240 * d, draw: p => drawSlide(lerp(from, target, ENT(p))), done: () => setCur(target) };
}
function setCur(i) { cur = i; const k = pages[i]; if (VIEWS.includes(k)) { S.last = k; save(); } setNavActive(i); }
/* pellizco: acercar (dir 1) o alejar (-1) */
function zoomTo(target, dir) {
  const A = getPage(pages[cur]), B = getPage(pages[target]);
  const fallback = pg => pg.today >= 0 ? pg.dots[pg.today] : pg.dots[Math.floor(pg.dots.length / 2)];
  const ta = fallback(A), tb = fallback(B), k = tb.r / ta.r;
  setNavActive(target);
  anim = { t0: performance.now(), dur: REDUCED ? 150 : 820, draw: p => {
    const e = SOFT(p), tx = lerp(ta.x, tb.x, e), ty = lerp(ta.y, tb.y, e);
    const camA = { s: llerp(1, k, e), fx: ta.x, fy: ta.y, tx, ty }, camB = { s: llerp(1 / k, 1, e), fx: tb.x, fy: tb.y, tx, ty };
    const aA = 1 - seg(p, .12, .6), aB = seg(p, .35, .85);
    drawDots(X, A, { cam: camA, a: aA }); drawWD(X, A, aA, camA);
    drawDots(X, B, { cam: camB, a: aB }); drawWD(X, B, aB, camB);
    const ho = SAL(seg(p, .1, .32)), hi = ENT(seg(p, .32, .8));
    drawHeader(X, A, { a: 1 - ho, dy: -7 * ho * dir });
    drawHeader(X, B, { a: hi, dy: 7 * (1 - hi) * dir });
    drawLegend(X, B, hi);
  }, done: () => setCur(target) };
}
/* cambio de unidad: los puntos se mueven a su sitio nuevo */
function changeUnit(u) {
  const key = pages[cur], A = getPage(key);
  if (u === A.unit) return;
  if (key.startsWith('cd:')) S.cdUnits[key] = u; else S.units[key] = u;
  save();
  delete cache[key]; delete offs[key];
  const B = getPage(key), pal = P(), acc = hex2rgb(B.acc || pal.acc);
  const big = A.dots.length >= B.dots.length;
  const nA = A.dots.length, nB = B.dots.length;
  const col = (pg, i) => { const st = pg.dots[i].st; return st === 'g' ? pal.gone : (st === 't' ? acc : pal.left); };
  const dir = 1;
  anim = { t0: performance.now(), dur: REDUCED ? 150 : 980, draw: p => {
    const n = big ? nA : nB;
    for (let k = 0; k < n; k++) {
      const ia = big ? k : Math.min(nA - 1, Math.floor(k * nA / nB));
      const ib = big ? Math.min(nB - 1, Math.floor(k * nB / nA)) : k;
      const da = A.dots[ia], db = B.dots[ib];
      const lp = ENT(cl(p * 1.3 - (ib / nB) * .3));
      const x = lerp(da.x, db.x, lp), y = lerp(da.y, db.y, lp), r = lerp(da.r, db.r, lp);
      X.fillStyle = mixc(col(A, ia), col(B, ib), lp);
      if (r < 1.1) X.fillRect(x - r, y - r, r * 2, r * 2);
      else { X.beginPath(); X.arc(x, y, Math.max(.5, r), 0, 7); X.fill(); }
    }
    const out = SAL(seg(p, 0, .14)), inn = ENT(seg(p, .14, .42));
    const first = p < .14;
    drawHeader(X, first ? A : B, { num: first ? A.num : B.num, unitText: first ? A.unitText : B.unitText, numA: first ? 1 - out : inn, numDy: first ? -7 * out : 7 * (1 - inn), unitFrom: A.unit, unitTo: B.unit, unitMix: ENT(seg(p, 0, .3)) });
    drawWD(X, A, 1 - seg(p, 0, .3)); drawWD(X, B, seg(p, .6, 1));
    drawLegend(X, B, seg(p, .5, 1));
  }, done: () => {} };
}
/* entrada: del punto de hoy a la vista */
function intro() {
  const key = pages[cur], pg = getPage(key);
  const td = pg.today >= 0 ? pg.dots[pg.today] : pg.dots[Math.floor(pg.dots.length / 2)];
  nav.classList.add('sp-hide');
  if (REDUCED) { nav.classList.remove('sp-hide'); introDone = true; return; }
  const total = 3400;
  anim = { t0: performance.now(), dur: total, draw: (p, ms) => {
    const t = ms / 1000;
    const z = SOFT(seg(t, .55, 2.6)), mv = ENT(seg(t, .55, 2.6));
    const appear = MUE(seg(t, .05, .5));
    const s = llerp(70, 1, z) * (t < .55 ? lerp(.6, 1, appear) : 1);
    const tx = lerp(W / 2, td.x, mv), ty = lerp(H / 2, td.y, mv);
    const R = lerp(40, Math.max(W, H) * 1.4, SOFT(seg(t, .6, 2.7))), f = lerp(140, 320, z);
    const cam = { s, fx: td.x, fy: td.y, tx, ty };
    drawDots(X, pg, { cam, a: seg(t, 0, .3), reveal: { cx: tx, cy: ty, R, f } });
    drawWD(X, pg, seg(t, 2.3, 2.8));
    const stg = [0, 1, 2, 3].map(i => ENT(seg(t, 2.35 + i * .065, 2.81 + i * .065)));
    let num = pg.num;
    const cnt = SOFT(seg(t, 2.4, 3.3)); const raw = parseInt(String(pg.num).replace(/\./g, ''), 10);
    if (!isNaN(raw) && !pg.num.includes(',')) num = miles(Math.round(raw * cnt));
    drawHeader(X, pg, { stag: stg, num });
    drawLegend(X, pg, stg[3]);
    if (t > 2.9 && nav.classList.contains('sp-hide')) nav.classList.remove('sp-hide');
  }, done: () => { introDone = true; maybeHint(); } };
}

/* ---------- barra ---------- */
const nav = document.getElementById('sp-nav');
function renderNav() {
  nav.innerHTML = '';
  pages.forEach((k, i) => {
    if (VIEWS.includes(k)) {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = NAVN[k]; b.dataset.i = i; nav.appendChild(b);
    }
  });
  const cds = pages.filter(k => k.startsWith('cd:'));
  if (cds.length) {
    const wrap = document.createElement('div'); wrap.className = 'sp-cds';
    cds.forEach(k => { const c = getCd(k.slice(3), now); const b = document.createElement('button'); b.type = 'button'; b.className = 'sp-cd'; b.dataset.i = pages.indexOf(k); b.setAttribute('aria-label', c.name); b.style.color = colorOf(c.color); b.innerHTML = '<i style="background:' + colorOf(c.color) + '"></i>'; wrap.appendChild(b); });
    nav.appendChild(wrap);
  }
  setNavActive(cur);
}
function setNavActive(i) { nav.querySelectorAll('button').forEach(b => b.classList.toggle('sp-on', +b.dataset.i === i)); }
function setNavPos(pos) { setNavActive(Math.round(pos)); }
nav.addEventListener('click', e => { const b = e.target.closest('button'); if (!b || anim) return; closeBubble(); const i = +b.dataset.i; if (i !== cur) goTo(i); });

/* ---------- gestos ---------- */
const pts = new Map();
let lp = null, down = null;
cv.addEventListener('pointerdown', e => {
  if (e.isPrimary) { pts.clear(); pinch = null; }
  try { cv.setPointerCapture(e.pointerId); } catch (er) {}
  pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (anim && !introDone) { skipIntro(); return; }
  if (pts.size === 2) { // pellizco
    clearTimeout(lp); drag = null; down = null;
    const [a, b] = [...pts.values()]; pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y), done: false };
    return;
  }
  if (anim) return;
  down = { x: e.clientX, y: e.clientY, t: performance.now(), moved: false };
  if (bubble) { closeBubble(); down.consumed = true; return; }
  clearTimeout(lp);
  lp = setTimeout(() => longPress(down), 480);
});
cv.addEventListener('pointermove', e => {
  if (!pts.has(e.pointerId)) return;
  pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pinch && pts.size >= 2) {
    const [a, b] = [...pts.values()]; const r = Math.hypot(a.x - b.x, a.y - b.y) / pinch.d0;
    const k = pages[cur]; const vi = VIEWS.indexOf(k);
    if (!pinch.done && vi >= 0 && !anim) {
      if (r > 1.3 && vi < VIEWS.length - 1) { pinch.done = true; zoomTo(pages.indexOf(VIEWS[vi + 1]), 1); }
      else if (r < .77 && vi > 0) { pinch.done = true; zoomTo(pages.indexOf(VIEWS[vi - 1]), -1); }
    }
    return;
  }
  if (!down || down.consumed) return;
  const dx = e.clientX - down.x, dy = e.clientY - down.y;
  if (!down.moved && Math.hypot(dx, dy) > 10) { down.moved = true; clearTimeout(lp); if (Math.abs(dx) > Math.abs(dy)) drag = { dx: 0, last: [] }; }
  if (drag) {
    let d = dx; if ((cur === 0 && d > 0) || (cur === pages.length - 1 && d < 0)) d *= .35;
    drag.dx = d; drag.last.push([performance.now(), e.clientX]); if (drag.last.length > 5) drag.last.shift();
  }
});
const endPtr = e => {
  pts.delete(e.pointerId);
  if (pinch) { if (pts.size === 0) pinch = null; return; }
  clearTimeout(lp);
  if (drag) {
    const L = drag.last; let v = 0; if (L.length > 1) v = (L[L.length - 1][1] - L[0][1]) / Math.max(1, L[L.length - 1][0] - L[0][0]);
    const pos = cur - drag.dx / W; let target = cur;
    if (drag.dx < -W * .22 || v < -.45) target = cur + 1; else if (drag.dx > W * .22 || v > .45) target = cur - 1;
    target = cl(target, 0, pages.length - 1);
    drag = null; goTo(target, pos);
  } else if (down && !down.moved && !down.consumed && !down.long) {
    tap(down);
  }
  if (hl && down && down.long) { /* el punto sigue grande mientras se ve el bocadillo */ }
  down = null;
};
cv.addEventListener('pointerup', endPtr);
cv.addEventListener('pointercancel', endPtr);
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('dblclick', e => e.preventDefault());

function tap(p) {
  const pg = getPage(pages[cur]); const rects = pg.rects || [];
  for (const r of rects) if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) { changeUnit(r.u); return; }
}
function nearestDot(pg, x, y) {
  let best = -1, bd = 1e9;
  pg.dots.forEach((d, i) => { const dd = Math.hypot(d.x - x, d.y - y); if (dd < bd) { bd = dd; best = i; } });
  if (best < 0) return -1; const d = pg.dots[best];
  return bd <= Math.max(d.r + 8, 12) ? best : -1;
}
function longPress(p) {
  if (!p || p.moved) return; p.long = true;
  const pg = getPage(pages[cur]);
  if (p.y > ST + 10 && p.y < ST + 192) { openSheet(); return; }
  const i = nearestDot(pg, p.x, p.y); if (i < 0) return;
  hl = { i, t0: performance.now() };
  showBubble(pg, i);
}

/* ---------- bocadillo ---------- */
const bub = document.getElementById('sp-bubble'), bubT = document.getElementById('sp-bubble-t'), bubS = document.getElementById('sp-bubble-s'), bubA = document.getElementById('sp-bubble-a');
function relText(r) {
  const today = sod(now);
  if (r.e - r.s >= DAY * .99) {
    if (now >= r.s && now < r.e) return 'Ahora';
    const d = daysBetween(today, r.s);
    if (r.e - r.s <= DAY * 1.01) return d === 0 ? 'Hoy' : (d > 0 ? 'dentro de ' + d + ' ' + pl(d, 'día', 'días') : 'hace ' + (-d) + ' ' + pl(-d, 'día', 'días'));
    const de = daysBetween(today, r.e);
    if (de <= 0) return 'hace ' + (-daysBetween(today, r.s)) + ' días';
    return 'dentro de ' + d + ' ' + pl(d, 'día', 'días');
  }
  const m = Math.round((r.s - now) / 60000);
  if (now >= r.s && now < r.e) return 'Ahora';
  const h = Math.floor(Math.abs(m) / 60), mm = Math.abs(m) % 60;
  const t = h ? h + ' ' + pl(h, 'hora', 'horas') + (mm ? ' y ' + mm + ' min' : '') : mm + ' min';
  return m > 0 ? 'dentro de ' + t : 'hace ' + t;
}
function showBubble(pg, i) {
  const r = pg.dateOf(i); const d = pg.dots[i];
  bubT.textContent = r.t;
  let sub = r.sub || relText(r);
  if (pg.key === 'vida') sub = 'A los ' + r.age + ' años, ' + sub;
  bubS.textContent = sub;
  const isDay = pg.dayLevel; const key = iso(sod(r.s));
  if (isDay) { bubA.hidden = false; bubA.textContent = S.milestones.includes(key) ? 'Quitar hito' : 'Marcar como hito'; const shownAt = performance.now(); bubA.onclick = () => { if (performance.now() - shownAt < 400) return; toggleMilestone(key); closeBubble(); }; }
  else bubA.hidden = true;
  bub.hidden = false; bub.classList.add('sp-enter');
  const bw = bub.offsetWidth, bh = bub.offsetHeight;
  let x = cl(d.x - bw / 2, 16, W - 16 - bw), y = d.y - bh - d.r * 1.7 - 14;
  if (y < ST + 10) y = d.y + d.r * 1.7 + 14;
  bub.style.left = x + 'px'; bub.style.top = y + 'px';
  requestAnimationFrame(() => bub.classList.remove('sp-enter'));
  bubble = true;
}
function closeBubble() {
  if (!bubble) return; bubble = null; hl = null;
  bub.classList.add('sp-enter'); setTimeout(() => { if (!bubble) bub.hidden = true; }, 220);
}
function toggleMilestone(k) {
  const i = S.milestones.indexOf(k);
  if (i >= 0) S.milestones.splice(i, 1); else S.milestones.push(k);
  S.milestones.sort(); save(); cache = {}; offs = {}; fillSettings();
}

/* ---------- aviso ---------- */
const toast = document.getElementById('sp-toast');
function showToast(msg, ms = 3800) {
  toast.textContent = msg; toast.hidden = false; toast.classList.add('sp-enter');
  requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.remove('sp-enter')));
  clearTimeout(showToast.t); showToast.t = setTimeout(() => { toast.classList.add('sp-enter'); setTimeout(() => toast.hidden = true, 400); }, ms);
}
function maybeHint() { if (!S.hintShown) { S.hintShown = true; save(); setTimeout(() => showToast('Mantén pulsada la cifra para abrir los ajustes'), 600); } }
function skipIntro() { if (anim && !introDone) { anim = null; introDone = true; nav.classList.remove('sp-hide'); maybeHint(); } }

/* ---------- hojas ---------- */
const veil = document.getElementById('sp-veil'), sheet = document.getElementById('sp-sheet'), form = document.getElementById('sp-form');
function show(el) { el.hidden = false; el.classList.add('sp-enter'); el.offsetHeight; requestAnimationFrame(() => el.classList.remove('sp-enter')); }
function hide(el, cb) { el.classList.add('sp-leave'); setTimeout(() => { el.hidden = true; el.classList.remove('sp-leave'); cb && cb(); }, 420); }
function openSheet() {
  closeBubble(); fillSettings();
  document.querySelectorAll('.sp-page').forEach(p => { p.hidden = p.id !== 'sp-p-ajustes'; p.classList.remove('sp-right', 'sp-left'); });
  show(veil); show(sheet); openedAt = performance.now();
}
function closeSheet() { hide(sheet); veil.classList.add('sp-enter'); setTimeout(() => { veil.hidden = true; veil.classList.remove('sp-enter'); }, 380); }
let openedAt = 0;
veil.addEventListener('click', () => { if (performance.now() - openedAt < 600) return; if (!form.hidden) closeForm(); else closeSheet(); });
sheet.querySelector('[data-close]').addEventListener('click', closeSheet);
// arrastrar el asa hacia abajo para cerrar
(function () {
  let y0 = null;
  sheet.addEventListener('touchstart', e => { const t = e.touches[0]; if (e.target.closest('.sp-grab') || t.clientY - sheet.getBoundingClientRect().top < 60) y0 = t.clientY; else y0 = null; }, { passive: true });
  sheet.addEventListener('touchmove', e => { if (y0 == null) return; const dy = Math.max(0, e.touches[0].clientY - y0); sheet.style.transition = 'none'; sheet.style.translate = '0 ' + dy + 'px'; }, { passive: true });
  sheet.addEventListener('touchend', e => { if (y0 == null) return; const dy = Math.max(0, e.changedTouches[0].clientY - y0); sheet.style.transition = ''; sheet.style.translate = ''; if (dy > 110) closeSheet(); y0 = null; });
})();
// subpáginas
function goPage(id) {
  const main = document.getElementById('sp-p-ajustes'), p = document.getElementById(id);
  p.hidden = false; p.classList.add('sp-right'); p.offsetHeight;
  requestAnimationFrame(() => { p.classList.remove('sp-right'); main.classList.add('sp-left'); });
}
function backPage() {
  const main = document.getElementById('sp-p-ajustes');
  const p = [...document.querySelectorAll('.sp-page')].find(x => x.id !== 'sp-p-ajustes' && !x.hidden);
  if (!p) return; p.classList.add('sp-right'); main.classList.remove('sp-left');
  setTimeout(() => { p.hidden = true; p.classList.remove('sp-right'); }, 400);
}
sheet.addEventListener('click', e => {
  const g = e.target.closest('[data-go]'); if (g) { fillSettings(); goPage(g.dataset.go); }
  if (e.target.closest('[data-back]')) backPage();
});
// volver deslizando desde el borde izquierdo
(function () {
  let x0 = null;
  sheet.addEventListener('touchstart', e => { const t = e.touches[0]; x0 = t.clientX < 28 ? t.clientX : null; }, { passive: true });
  sheet.addEventListener('touchend', e => { if (x0 == null) return; if (e.changedTouches[0].clientX - x0 > 80) backPage(); x0 = null; });
})();

/* ajustes: rellenar y escuchar */
const $ = id => document.getElementById(id);
function fillSettings() {
  const b = parseISO(S.birth);
  $('sp-v-birth').textContent = b ? fechaCorta(b) : 'Sin fecha'; $('sp-i-birth').value = S.birth || '';
  const life = $('sp-i-life'); if (!life.options.length) for (let a = 60; a <= 110; a++) life.add(new Option(a + ' años', a));
  life.value = S.life; $('sp-v-life').textContent = S.life + ' años';
  $('sp-i-week').value = S.weekStart; $('sp-v-week').textContent = S.weekStart === 1 ? 'Lunes' : 'Domingo';
  const cc = courseCd(now);
  $('sp-v-cs').textContent = fechaCorta(parseISO(cc.start)); $('sp-i-cs').value = cc.start;
  $('sp-v-ce').textContent = fechaCorta(parseISO(cc.date)); $('sp-i-ce').value = cc.date;
  const all = allCds(now); $('sp-v-cd').textContent = all.filter(c => c.show).length + ' de ' + all.length + ' ' + pl(all.length, 'visible', 'visibles');
  $('sp-v-hitos').textContent = String(S.milestones.length);
  $('sp-i-theme').querySelectorAll('button').forEach(x => x.classList.toggle('sp-on', x.dataset.v === S.theme));
  $('sp-i-open').value = S.open; $('sp-v-open').textContent = $('sp-i-open').selectedOptions[0].text;
  $('sp-version').textContent = VERSION;
  renderCdList(); renderHitos();
}
function changed() { save(); rebuild(); fillSettings(); }
$('sp-i-birth').addEventListener('change', e => { if (e.target.value) { S.birth = e.target.value; changed(); } });
$('sp-i-life').addEventListener('change', e => { S.life = +e.target.value; changed(); });
$('sp-i-week').addEventListener('change', e => { S.weekStart = +e.target.value; changed(); });
$('sp-i-cs').addEventListener('change', e => { if (e.target.value) { S.courseStart = e.target.value.slice(5); changed(); } });
$('sp-i-ce').addEventListener('change', e => { if (e.target.value) { S.courseEnd = e.target.value.slice(5); changed(); } });
$('sp-i-open').addEventListener('change', e => { S.open = e.target.value; changed(); });
$('sp-i-theme').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; S.theme = b.dataset.v; save(); applyTheme(); rebuild(); fillSettings(); });

/* cuentas atrás */
function renderCdList() {
  const box = $('sp-cd-list'); box.innerHTML = '';
  allCds(now).forEach(c => {
    const t = parseISO(c.date), left = daysBetween(now, t);
    const row = document.createElement('div'); row.className = 'sp-cd-row';
    row.innerHTML = '<span class="sp-dot" style="background:' + colorOf(c.color) + '"></span><button class="sp-txt" type="button"></button><button type="button" class="sp-tog' + (c.show ? ' sp-on' : '') + '" aria-label="Mostrar en la barra"></button>';
    const tx = row.querySelector('.sp-txt'); tx.style.textAlign = 'left';
    tx.innerHTML = ''; const n = document.createElement('div'); n.textContent = c.name; const s = document.createElement('small');
    s.textContent = fechaMedia(t, now) + ', ' + (left > 0 ? 'faltan ' + left + ' ' + pl(left, 'día', 'días') : (left === 0 ? 'es hoy' : 'hace ' + (-left) + ' días'));
    tx.append(n, s);
    tx.addEventListener('click', () => openForm(c));
    row.querySelector('.sp-tog').addEventListener('click', ev => {
      ev.currentTarget.classList.toggle('sp-on');
      if (c.system) S.courseShow = !S.courseShow; else { const x = S.countdowns.find(y => y.id === c.id); x.show = !x.show; }
      save(); rebuild(); $('sp-v-cd').textContent = allCds(now).filter(c => c.show).length + ' de ' + allCds(now).length + ' visibles';
    });
    box.appendChild(row);
  });
}
$('sp-cd-new').addEventListener('click', () => openForm(null));
let editing = null, fColor = 'coral', fShow = true;
function openForm(c) {
  editing = c;
  $('sp-f-title').textContent = c ? (c.system ? 'Curso' : 'Editar cuenta atrás') : 'Nueva cuenta atrás';
  $('sp-f-name').value = c ? c.name : ''; $('sp-f-name').disabled = !!(c && c.system);
  $('sp-f-date').value = c ? c.date : ''; $('sp-f-from').value = c ? c.start : iso(now);
  fColor = c ? c.color : 'coral'; fShow = c ? c.show : true;
  $('sp-f-show').classList.toggle('sp-on', fShow);
  $('sp-f-del').hidden = !c || c.system;
  $('sp-f-date').disabled = $('sp-f-from').disabled = !!(c && c.system);
  renderColors(); syncForm();
  show(form);
}
function closeForm() { hide(form); }
form.querySelector('[data-close-form]').addEventListener('click', closeForm);
function renderColors() {
  const box = $('sp-f-colors'); box.innerHTML = '';
  Object.keys(COLORS).forEach(k => { const b = document.createElement('button'); b.type = 'button'; b.style.background = colorOf(k); b.style.color = colorOf(k); b.className = k === fColor ? 'sp-on' : ''; b.setAttribute('aria-label', k); b.onclick = () => { fColor = k; renderColors(); }; box.appendChild(b); });
}
function syncForm() {
  const d = parseISO($('sp-f-date').value), f = parseISO($('sp-f-from').value);
  $('sp-f-date-v').textContent = d ? fechaMedia(d, new Date(1900, 0, 1)) : 'Elige una fecha';
  $('sp-f-from-v').textContent = f ? (daysBetween(now, f) === 0 ? 'Hoy, ' + fechaMedia(f, now) : fechaMedia(f, new Date(1900, 0, 1))) : 'Hoy';
  $('sp-f-save').disabled = !($('sp-f-name').value.trim() && d);
}
['sp-f-name', 'sp-f-date', 'sp-f-from'].forEach(id => $(id).addEventListener('input', syncForm));
['sp-f-date', 'sp-f-from'].forEach(id => $(id).addEventListener('change', syncForm));
$('sp-f-show').addEventListener('click', e => { fShow = !fShow; e.currentTarget.classList.toggle('sp-on', fShow); });
$('sp-f-save').addEventListener('click', () => {
  const data = { name: $('sp-f-name').value.trim(), date: $('sp-f-date').value, start: $('sp-f-from').value || iso(now), color: fColor, show: fShow };
  if (editing && editing.system) { S.courseColor = fColor; S.courseShow = fShow; }
  else if (editing) Object.assign(S.countdowns.find(c => c.id === editing.id), data);
  else S.countdowns.push(Object.assign({ id: 'c' + Date.now().toString(36) }, data));
  save(); rebuild(); renderCdList(); fillSettings(); closeForm();
});
$('sp-f-del').addEventListener('click', () => {
  if (!editing) return; S.countdowns = S.countdowns.filter(c => c.id !== editing.id); delete S.cdUnits['cd:' + editing.id];
  save(); rebuild(); fillSettings(); closeForm();
});
/* hitos */
function renderHitos() {
  const box = $('sp-h-list'); box.innerHTML = '';
  if (!S.milestones.length) { box.innerHTML = '<p class="sp-empty">Todavía no has marcado ningún día.</p>'; return; }
  S.milestones.forEach(k => {
    const d = parseISO(k), row = document.createElement('div'); row.className = 'sp-h-row';
    const s = document.createElement('span'); s.textContent = fechaLarga(d) + (d.getFullYear() !== now.getFullYear() ? ' de ' + d.getFullYear() : '');
    const b = document.createElement('button'); b.type = 'button'; b.textContent = 'Quitar'; b.onclick = () => { toggleMilestone(k); };
    row.append(s, b); box.appendChild(row);
  });
}

/* ---------- fondo de pantalla ---------- */
const tex = { light: new Image(), dark: new Image() };
tex.light.src = 'img/papel-claro.jpg'; tex.dark.src = 'img/papel-oscuro.jpg';
$('sp-wallpaper').addEventListener('click', () => {
  const dims = { W: 390, H: 844, ST: 47, SB: 34 }, k = 3;
  const key = pages[cur].startsWith('cd:') ? pages[cur] : (VIEWS.includes(pages[cur]) ? pages[cur] : 'ano');
  const pg = build(key, unitOf(key), new Date(), dims);
  // el fondo de pantalla deja sitio arriba para la hora del iPhone
  const shift = 150;
  pg.dots.forEach(d => d.y += shift);
  const c = document.createElement('canvas'); c.width = 390 * k; c.height = 844 * k;
  const ctx = c.getContext('2d');
  const im = tex[THEME];
  ctx.fillStyle = THEME === 'dark' ? '#0B0D14' : '#F7F7F5'; ctx.fillRect(0, 0, c.width, c.height);
  if (im.complete && im.naturalWidth) { ctx.save(); ctx.scale(1.5, 1.5); ctx.fillStyle = ctx.createPattern(im, 'repeat'); ctx.fillRect(0, 0, c.width / 1.5, c.height / 1.5); ctx.restore(); }
  ctx.scale(k, k);
  const keepW = W, keepH = H; W = 390; H = 844;
  ctx.save(); ctx.translate(0, shift); drawHeader(ctx, pg, {}, { ST: 47 }); drawWD(ctx, pg, 1); drawLegend(ctx, Object.assign({}, pg, { dots: pg.dots.map(d => Object.assign({}, d, { y: d.y - shift })) }), 1); ctx.restore();
  drawDots(ctx, pg, {});
  W = keepW; H = keepH;
  $('sp-wall-img').src = c.toDataURL('image/png');
  show($('sp-wall'));
});
$('sp-wall-close').addEventListener('click', () => { const w = $('sp-wall'); w.classList.add('sp-enter'); setTimeout(() => { w.hidden = true; w.classList.remove('sp-enter'); }, 300); });

/* ---------- primera vez ---------- */
function welcome() {
  const w = $('sp-welcome'); w.hidden = false;
  const dots = w.querySelector('.sp-welcome-dots'); dots.innerHTML = Array.from({ length: 15 }, (_, i) => '<i class="' + (i < 6 ? 'sp-g' : (i === 6 ? 'sp-t' : '')) + '"></i>').join('');
  const dd = $('sp-w-day'), mm = $('sp-w-month'), yy = $('sp-w-year');
  for (let i = 1; i <= 31; i++) dd.add(new Option(i, i));
  MESES.forEach((m, i) => mm.add(new Option(m, i)));
  const Y = new Date().getFullYear(); for (let y = Y; y >= Y - 100; y--) yy.add(new Option(y, y));
  dd.value = 1; mm.value = 0; yy.value = Y - 30;
  $('sp-w-go').addEventListener('click', () => {
    const y = +yy.value, m = +mm.value, d = Math.min(+dd.value, dim(y, m));
    S.birth = iso(new Date(y, m, d)); S.last = 'vida'; save();
    w.classList.add('sp-leave'); setTimeout(() => { w.hidden = true; }, 400);
    rebuild(); cur = 0; setNavActive(0); intro();
  });
}

/* ---------- reloj ---------- */
function tick() {
  const n = new Date();
  if (n.getMinutes() !== now.getMinutes() || n.getDate() !== now.getDate()) { if (!anim && !drag) { const k = pages[cur]; now = n; pages = pagesList(now); cur = Math.max(0, pages.indexOf(k)); cache = {}; offs = {}; renderNav(); } }
}
setInterval(tick, 15000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
let pendingResize = false;
function onResize() {
  if (anim || drag) { pendingResize = true; return; }
  pendingResize = false;
  const keep = lastDims; measure(); const now2 = lastDims; lastDims = keep;
  if (now2 !== keep) { lastDims = now2; rebuild(); }
}
window.addEventListener('resize', onResize);
setInterval(() => { if (pendingResize && !anim && !drag) onResize(); }, 500);

/* ---------- arranque ---------- */
async function start() {
  applyTheme();
  // espera a que el tamaño de la pantalla se asiente antes de colocar nada
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  await new Promise(r => setTimeout(r, 80));
  measure();
  try { await Promise.all([document.fonts.load(FONT_NUM), document.fonts.load(F(400, 15)), document.fonts.load(F(600, 15))]); } catch (e) {}
  pages = pagesList(now);
  const first = S.open === 'last' ? S.last : S.open;
  cur = Math.max(0, pages.indexOf(first));
  renderNav();
  requestAnimationFrame(frame);
  if (!S.birth) { nav.classList.add('sp-hide'); welcome(); }
  else intro();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
}
start();
// para pruebas
window.__spare = { state: () => ({ anim: !!anim, drag: !!drag, pinch: !!pinch, pts: pts.size, bubble: !!bubble, down: !!down }), S, goTo: i => goTo(i), changeUnit: u => changeUnit(u), openSheet, zoomTo, pages: () => pages, cur: () => cur, skipIntro, showBubbleAt: (i) => { const pg = getPage(pages[cur]); hl = { i, t0: performance.now() }; showBubble(pg, i); }, goPage, openForm };
})();
