export const pad = n => String(n).padStart(2, '0');
export const ymd = d => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const parse = s => new Date(s + 'T00:00:00Z');
export const today = () => { const n = new Date(); return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`; };
export const monthRange = (y, m) => [`${y}-${pad(m + 1)}-01`, ymd(new Date(Date.UTC(y, m + 1, 0)))];

export const DEFAULT_CATS = ['Groceries', 'Housing', 'Subscriptions', 'Furniture', 'Transport', 'Dining', 'Health', 'Income', 'Other'];
const COLORS = { Groceries: '#6fa66b', Housing: '#b5835a', Subscriptions: '#d4706a', Furniture: '#8e84c9', Transport: '#5f8fa3', Dining: '#c9955a', Health: '#7aa8a0', Income: '#d99a36' };
export const catColor = c => COLORS[c] || '#a08f7d';

export const money = n => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
export const signed = t => (t.type === 'income' ? '+' : '-') + money(t.amount);
const ord = n => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
export const isRec = t => (t.recurrence?.freq || 'none') !== 'none';
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const freqLabel = t => {
  const r = t.recurrence || {}, w = r.weekday != null ? WD[r.weekday] : null;
  return r.freq === 'weekly' ? (w ? `Every ${w}` : 'Every week')
    : r.freq === 'biweekly' ? (w ? `Every 2 weeks on ${w}` : 'Every 2 weeks')
    : r.freq === 'monthly' ? `${ord(r.day || +t.date.slice(8))} of every month` : 'None';
};
export const perMonth = t => t.amount * { weekly: 52 / 12, biweekly: 26 / 12, monthly: 1 }[t.recurrence.freq];

// Expand stored transactions into dated occurrences within [from, to] (YYYY-MM-DD).
export function expand(txs, from, to) {
  const out = [], end = parse(to);
  const add = (t, d) => { const date = ymd(d); if (date >= from && date >= t.date && date <= to) out.push({ ...t, date, _tid: t.id }); };
  for (const t of txs) {
    const f = t.recurrence?.freq || 'none';
    if (f === 'none') { if (t.date >= from && t.date <= to) out.push({ ...t, _tid: t.id }); continue; }
    const s = parse(t.date);
    if (f === 'monthly') {
      const want = t.recurrence.day || s.getUTCDate(), y = s.getUTCFullYear();
      for (let m = s.getUTCMonth(); ; m++) {
        const dim = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
        const d = new Date(Date.UTC(y, m, Math.min(want, dim)));
        if (d > end) break;
        add(t, d);
      }
    } else {
      const step = (f === 'weekly' ? 7 : 14) * 864e5, wd = t.recurrence.weekday;
      let d = s;
      if (wd != null) d = new Date(+s + ((wd - s.getUTCDay() + 7) % 7) * 864e5); // first chosen weekday on/after the entry date
      for (; d <= end; d = new Date(+d + step)) add(t, d);
    }
  }
  return out;
}
