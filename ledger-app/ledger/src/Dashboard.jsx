// Dashboard.jsx: main screen with totals, donut chart, savings goal, category bars and recent entries.
import { useState } from 'react';
import { expand, monthRange, money, signed, catColor, today } from './lib';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
// Donut ring circumference (radius 80), used to draw the arc
const C = 2 * Math.PI * 80;

export default function Dashboard({ txs, goal, onEdit, colors }) {
  // ── View state: which month, and Monthly vs All Time ──
  const n = new Date();
  const [ym, setYm] = useState([n.getFullYear(), n.getMonth()]);
  const [all, setAll] = useState(false);
  // the period (month or All Time) whose full entry list is open
  const [expanded, setExpanded] = useState(null);
  // categories ticked in the filter (empty = show everything)
  const [filter, setFilter] = useState([]);
  const [filterOpen, setFilterOpen] = useState(false);
  // Date range for the current view
  const [from, to] = all ? ['0000-01-01', today()] : monthRange(...ym);
  // Transactions in range, with recurring entries expanded into each occurrence
  const es = expand(txs, from, to);
  // Categories present in this period (the filter menu options) and the entries that pass the filter
  const periodCats = [...new Set(es.map(e => e.category))].sort();
  const filtered = filter.length ? es.filter(e => filter.includes(e.category)) : es;
  const toggleCat = c => setFilter(f => (f.includes(c) ? f.filter(x => x !== c) : [...f, c]));
  // ── Totals ──
  const sum = t => es.filter(e => e.type === t).reduce((a, e) => a + e.amount, 0);
  const income = sum('income'), expense = sum('expense'), net = income - expense;
  // Savings rate = net ÷ income
  const rate = income > 0 ? (net / income) * 100 : 0;
  // Progress toward the monthly savings goal (0 to 1)
  const gp = goal > 0 ? Math.min(1, Math.max(0, net) / goal) : 0;
  // Expenses grouped by category, largest first
  const byCat = Object.entries(es.filter(e => e.type === 'expense').reduce((a, e) => (a[e.category] = (a[e.category] || 0) + e.amount, a), {})).sort((a, b) => b[1] - a[1]);
  // Donut slices: one per spending category, then what's left in mustard.
  // The ring represents your income (or your spending, if you overspent).
  const total = Math.max(income, expense);
  let off = 0;
  const segs = total > 0
    ? [...byCat.map(([c, v]) => [c, catColor(c, colors), v]), ['Left', 'var(--mus)', Math.max(0, net)]]
        .filter(([, , v]) => v > 0)
        .map(([label, color, v]) => { const len = (v / total) * C; const s = { label, color, len, off, v }; off += len; return s; })
    : [];
  // Largest category gets the full-width bar
  const max = byCat[0]?.[1] || 1;
  // Newest first. Only the first 25 show until "Show more" is tapped for this period.
  const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date));
  const showAll = expanded === from + to;
  const recent = showAll ? sorted : sorted.slice(0, 25);
  // Move to the previous / next month
  const shift = k => setYm(([y, m]) => { const d = new Date(y, m + k, 1); return [d.getFullYear(), d.getMonth()]; });

  // Month title and its font size. Longer names get a smaller font so the arrows never move.
  const title = all ? 'All Time' : MONTHS[ym[1]];
  const size = title.length <= 5 ? 3.4 : title.length <= 7 ? 2.9 : title.length === 8 ? 2.6 : 2.3;

  return <>
    {/* Year above the month, then the month header. Arrows keep their place (hidden in All Time) */}
    <div className="year">{all ? '' : ym[0]}</div>
    <div className="month">
      <button className={all ? 'ghost' : ''} aria-label="Previous month" onClick={() => shift(-1)}>◀</button>
      <h1 style={{ fontSize: `${size}rem` }}>{title}</h1>
      <button className={all ? 'ghost' : ''} aria-label="Next month" onClick={() => shift(1)}>▶</button>
    </div>
    {/* Monthly / All Time toggle */}
    <div className="pills">
      <button className={all ? '' : 'on'} onClick={() => setAll(false)}>Monthly</button>
      <button className={all ? 'on' : ''} onClick={() => setAll(true)}>All Time</button>
    </div>

    {/* Donut chart: colored slices = spending by category, mustard = what is left, net balance in the middle */}
    <div className="donut">
      <svg viewBox="0 0 200 200" role="img" aria-label={`Net balance ${money(net)}`}>
        {total === 0 && <circle cx="100" cy="100" r="80" fill="none" strokeWidth="26" stroke="#dcb48f" />}
        {segs.map(s => (
          <circle key={s.label} cx="100" cy="100" r="80" fill="none" strokeWidth="26" stroke={s.color}
            strokeDasharray={`${s.len} ${C - s.len}`} strokeDashoffset={-s.off}>
            <title>{s.label}: {money(s.v)}</title>
          </circle>
        ))}
      </svg>
      <div><span>Net balance</span><b>{money(net)}</b></div>
    </div>

    {/* Income, expenses and savings rate */}
    <div className="stats">
      <div><span>Income</span><b className="mus">{money(income)}</b></div>
      <div><span>Expenses</span><b className="red">{money(expense)}</b></div>
      <div><span>Save Rate</span><b className="mid">{rate.toFixed(1)}%</b></div>
    </div>

    {/* Savings goal progress bar (monthly view only) */}
    {!all && <>
      <div className="row"><h3>Monthly Savings Goal:</h3><small><b>{money(Math.max(0, net))} / {money(goal || 0)}</b></small></div>
      <div className="track"><i style={{ width: `${gp * 100}%` }} /></div>
    </>}

    {/* Spending by category bars (colors come from Settings) */}
    <details open><summary>Spending by Category</summary>
      {byCat.length === 0 && <p className="mid">No expenses in this period yet.</p>}
      {byCat.map(([c, v]) => (
        <div className="cat" key={c} title={money(v)}><span>{c}</span><i style={{ width: `${(v / max) * 100}%`, background: catColor(c, colors) }} /></div>
      ))}
    </details>

    {/* Recent entries with edit buttons */}
    <details open className="entries"><summary>Recent Entries</summary>
      {/* Category filter */}
      <div className="filterbar" onKeyDown={e => e.key === 'Escape' && setFilterOpen(false)}>
        <button className={`filter-btn${filter.length ? ' active' : ''}`} aria-expanded={filterOpen} onClick={() => setFilterOpen(!filterOpen)}>
          Filter{filter.length ? ` (${filter.length})` : ''} <span>▾</span>
        </button>
        {filterOpen && (
          <div className="menu filter-menu">
            {periodCats.length === 0 && <p className="mid">No categories yet.</p>}
            {periodCats.map(c => (
              <button key={c} type="button" role="checkbox" aria-checked={filter.includes(c)}
                className={filter.includes(c) ? 'sel' : ''} onClick={() => toggleCat(c)}>
                <i className="dot" style={{ background: catColor(c, colors) }} />{c}<span>{filter.includes(c) ? '✓' : ''}</span>
              </button>
            ))}
            <div className="acts">
              <button type="button" onClick={() => setFilter([])}>Clear</button>
              <button type="button" className="btn sm" onClick={() => setFilterOpen(false)}>Done</button>
            </div>
          </div>
        )}
      </div>
      {recent.length === 0 && (filter.length
        ? <p className="mid">No entries match this filter. <button className="link" onClick={() => setFilter([])}>Clear filter</button></p>
        : <p className="mid">Tap + to add your first entry.</p>)}
      {recent.map(e => (
        <div className="entry" key={e.id + e.date}>
          <b>{e.date.slice(5).replace('-', '/')}</b>
          <div><b>{e.title}</b><small style={{ color: catColor(e.category, colors) }}>{e.category}</small></div>
          <b className={e.type === 'income' ? 'mus' : 'red'}>{signed(e)}</b>
          <button className="edit" aria-label={`Edit ${e.title}`} onClick={() => onEdit(e)}>✎</button>
        </div>
      ))}
      {sorted.length > 25 && (
        <button className="link more" onClick={() => setExpanded(showAll ? null : from + to)}>
          {showAll ? 'Show less' : `Show more (${sorted.length - 25})`}
        </button>
      )}
    </details>
  </>;
}
