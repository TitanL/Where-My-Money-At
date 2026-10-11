// lib.js: shared helpers (dates, category colors, formatting, recurring-entry logic).
// ── Dates (all dates are "YYYY-MM-DD" strings) ──
export const pad = n => String(n).padStart(2, '0');
export const ymd = d => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const parse = s => new Date(s + 'T00:00:00Z');
// Today's date in the user's local timezone
export const today = () => { const n = new Date(); return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`; };
// First and last day of a month (m is 0-based)
export const monthRange = (y, m) => [`${y}-${pad(m + 1)}-01`, ymd(new Date(Date.UTC(y, m + 1, 0)))];

// ── Categories & colors ──
export const DEFAULT_CATS = ['Groceries', 'Housing', 'Subs', 'Transport', 'Dining', 'Health', 'Income', 'Fun', 'School', 'Other'];
const COLORS = { Groceries: '#6fa66b', Housing: '#b5835a', Subs: '#5e96da', Transport: '#5f5a5a', Dining: '#865736', Health: '#d2429b', Income: '#d99a36', Fun: '#976dd6', School: '#dc4545' };
// Color chosen in Settings wins, then the built-in default, then gray
export const catColor = (c, map = {}) => map[c] || COLORS[c] || '#a08f7d';

// ── Formatting ──
export const money = n => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
export const signed = t => (t.type === 'income' ? '+' : '-') + money(t.amount);
// Number to ordinal: 1 → 1st, 2 → 2nd, 3 → 3rd
const ord = n => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
// ── Recurrence ──
export const isRec = t => (t.recurrence?.freq || 'none') !== 'none';
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// Readable schedule text, e.g. "1st of every month" or "Every Mon"
export const freqLabel = t => {
  const r = t.recurrence || {}, w = r.weekday != null ? WD[r.weekday] : null;
  return r.freq === 'weekly' ? (w ? `Every ${w}` : 'Every week')
    : r.freq === 'biweekly' ? (w ? `Every 2 weeks on ${w}` : 'Every 2 weeks')
    : r.freq === 'monthly' ? `${ord(r.day || +t.date.slice(8))} of every month` : 'None';
};
// Monthly equivalent of an amount (weekly = 52/12, every 2 weeks = 26/12)
export const perMonth = t => t.amount * { weekly: 52 / 12, biweekly: 26 / 12, monthly: 1 }[t.recurrence.freq];

// ── Recurring expansion ──
// Expand stored transactions into dated occurrences within [from, to] (YYYY-MM-DD).
export function expand(txs, from, to) {
  const out = [], end = parse(to);
  const add = (t, d) => { const date = ymd(d); if (date >= from && date >= t.date && date <= to) out.push({ ...t, date, _tid: t.id }); };
  for (const t of txs) {
    const f = t.recurrence?.freq || 'none';
    // One-off entry: include it only if its date is in range
    if (f === 'none') { if (t.date >= from && t.date <= to) out.push({ ...t, _tid: t.id }); continue; }
    const s = parse(t.date);
    // Monthly: same day each month, clamped to the month length (31 → 30 in short months)
    if (f === 'monthly') {
      const want = t.recurrence.day || s.getUTCDate(), y = s.getUTCFullYear();
      for (let m = s.getUTCMonth(); ; m++) {
        const dim = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
        const d = new Date(Date.UTC(y, m, Math.min(want, dim)));
        if (d > end) break;
        add(t, d);
      }
    } else {
      // Weekly / every 2 weeks: step forward in fixed day increments
      const step = (f === 'weekly' ? 7 : 14) * 864e5, wd = t.recurrence.weekday;
      let d = s;
      if (wd != null) d = new Date(+s + ((wd - s.getUTCDay() + 7) % 7) * 864e5); // first chosen weekday on/after the entry date
      for (; d <= end; d = new Date(+d + step)) add(t, d);
    }
  }
  return out;
}

// ── Themes ──
// Slots follow the palettes top to bottom: dark (text, menus), mid (buttons, accents), soft (pencils, savings rate),
// tan (page background), red (expenses), mus (income, donut). onMid = text color used on top of "mid" buttons.
export const THEMES = {
  coffee: { name: 'Coffee', dark: '#492310', mid: '#9d673a', soft: '#ae8356', tan: '#e8c5a5', red: '#955049', mus: '#d99937', onMid: '#e8c5a5' },
  matcha: { name: 'Matcha', dark: '#44624a', mid: '#668b4a', soft: '#8ba888', tan: '#c0cfb2', red: '#c16c64', mus: '#648a60', onMid: '#c0cfb2' },
  ube:    { name: 'Ube',    dark: '#692a9f', mid: '#9978bf', soft: '#cbbadd', tan: '#f5eff9', red: '#e0ca99', mus: '#bd96cf', onMid: '#f5eff9' },
};

// Theme remembered on this device (also saved to the account, see App.jsx)
export const savedTheme = () => { try { return localStorage.getItem('theme') || 'coffee'; } catch { return 'coffee'; } };

// Apply a theme by setting the CSS color variables, and remember it on this device
export function applyTheme(key) {
  const t = THEMES[key] || THEMES.coffee, root = document.documentElement.style;
  Object.entries({ dark: t.dark, mid: t.mid, soft: t.soft, tan: t.tan, red: t.red, mus: t.mus, 'on-mid': t.onMid })
    .forEach(([k, v]) => root.setProperty(`--${k}`, v));
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t.tan);
  try { localStorage.setItem('theme', key); } catch { /* private mode: skip */ }
}

// ── Income vs spending ──
// Income is whatever is in the Income category. Everything else is spending: expenses add to it,
// and money coming back in a spending category (like a payback) reduces it instead of raising income.
export const INCOME_CAT = 'Income';
export const isIncomeCat = c => c === INCOME_CAT;
export const balanceEffect = e => (e.type === 'income' ? e.amount : -e.amount); // effect of one entry on your balance
export const incomeTotal = es => es.filter(e => isIncomeCat(e.category)).reduce((a, e) => a + balanceEffect(e), 0);
export const spendingTotal = es => -es.filter(e => !isIncomeCat(e.category)).reduce((a, e) => a + balanceEffect(e), 0);
// Net spending per category, largest first (categories that net to zero or less are hidden)
export const spendingByCategory = es => Object.entries(
  es.filter(e => !isIncomeCat(e.category)).reduce((a, e) => (a[e.category] = (a[e.category] || 0) - balanceEffect(e), a), {})
).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);