import { useState } from 'react';
import { expand, monthRange, money, signed, catColor, today } from './lib';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const C = 2 * Math.PI * 80;

export default function Dashboard({ txs, goal, onEdit }) {
  const n = new Date();
  const [ym, setYm] = useState([n.getFullYear(), n.getMonth()]);
  const [all, setAll] = useState(false);
  const [from, to] = all ? ['0000-01-01', today()] : monthRange(...ym);
  const es = expand(txs, from, to);
  const sum = t => es.filter(e => e.type === t).reduce((a, e) => a + e.amount, 0);
  const income = sum('income'), expense = sum('expense'), net = income - expense;
  const rate = income > 0 ? (net / income) * 100 : 0;
  const keep = income > 0 ? Math.min(1, Math.max(0, net / income)) : 0;
  const gp = goal > 0 ? Math.min(1, Math.max(0, net) / goal) : 0;
  const byCat = Object.entries(es.filter(e => e.type === 'expense').reduce((a, e) => (a[e.category] = (a[e.category] || 0) + e.amount, a), {})).sort((a, b) => b[1] - a[1]);
  const max = byCat[0]?.[1] || 1;
  const recent = [...es].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 25);
  const shift = k => setYm(([y, m]) => { const d = new Date(y, m + k, 1); return [d.getFullYear(), d.getMonth()]; });

  return <>
    <div className="month">
      {!all && <button aria-label="Previous month" onClick={() => shift(-1)}>◀</button>}
      <h1>{all ? 'All Time' : MONTHS[ym[1]]}</h1>
      {!all && <button aria-label="Next month" onClick={() => shift(1)}>▶</button>}
    </div>
    <div className="pills">
      <button className={all ? '' : 'on'} onClick={() => setAll(false)}>Monthly</button>
      <button className={all ? 'on' : ''} onClick={() => setAll(true)}>All Time</button>
    </div>

    <div className="donut">
      <svg viewBox="0 0 200 200" role="img" aria-label={`Net balance ${money(net)}`}>
        <circle cx="100" cy="100" r="80" fill="none" strokeWidth="26" stroke={expense > 0 ? 'var(--red)' : '#dcb48f'} />
        <circle cx="100" cy="100" r="80" fill="none" strokeWidth="26" stroke="var(--mus)" strokeDasharray={`${keep * C} ${C}`} />
      </svg>
      <div><span>Net balance</span><b>{money(net)}</b></div>
    </div>

    <div className="stats">
      <div><span>Income</span><b className="mus">{money(income)}</b></div>
      <div><span>Expenses</span><b className="red">{money(expense)}</b></div>
      <div><span>Savings Rate</span><b className="mid">{rate.toFixed(1)}%</b></div>
    </div>

    {!all && <>
      <div className="row"><h3>Monthly Savings Goal:</h3><small><b>{money(Math.max(0, net))} / {money(goal || 0)}</b></small></div>
      <div className="track"><i style={{ width: `${gp * 100}%` }} /></div>
    </>}

    <details open><summary>Spending by Category</summary>
      {byCat.length === 0 && <p className="mid">No expenses in this period yet.</p>}
      {byCat.map(([c, v]) => (
        <div className="cat" key={c} title={money(v)}><span>{c}</span><i style={{ width: `${(v / max) * 100}%`, background: catColor(c) }} /></div>
      ))}
    </details>

    <details open><summary>Recent Entries</summary>
      {recent.length === 0 && <p className="mid">Tap + to add your first entry.</p>}
      {recent.map(e => (
        <div className="entry" key={e.id + e.date}>
          <b>{e.date.slice(5).replace('-', '/')}</b>
          <div><b>{e.title}</b><small style={{ color: catColor(e.category) }}>{e.category}</small></div>
          <b className={e.type === 'income' ? 'mus' : 'red'}>{signed(e)}</b>
          <button className="edit" aria-label={`Edit ${e.title}`} onClick={() => onEdit(e)}>✎</button>
        </div>
      ))}
    </details>
  </>;
}
