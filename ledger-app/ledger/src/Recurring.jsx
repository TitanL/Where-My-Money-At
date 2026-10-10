// Recurring.jsx: Recurring Bills screen. Lists bills and income that repeat, with monthly totals.
import { catColor, freqLabel, isRec, money, perMonth } from './lib';

export default function Recurring({ txs, onEdit, colors }) {
  // Only entries that have a recurrence
  const rec = txs.filter(isRec);
  // Split into bills (expenses) and income
  const bills = rec.filter(t => t.type === 'expense'), inc = rec.filter(t => t.type === 'income');
  // Sum of monthly equivalents (weekly and 2-weekly amounts are converted to a month)
  const total = l => l.reduce((a, t) => a + perMonth(t), 0);
  // Net recurring = income minus bills
  const net = total(inc) - total(bills);
  // One row per entry: title, category, schedule, amount and edit button
  const List = ({ items, cls, sign }) => items.length === 0 ? <p className="mid">Nothing here yet.</p> : items.map(t => (
  <div className="entry nodate" key={t.id}>
    <div>
      <b>{t.title}</b>
      <small style={{ color: catColor(t.category, colors) }}>{t.category}</small>
      <small className="mid">{freqLabel(t)}</small>
    </div>
    <b className={cls}>{sign}{money(t.amount)}</b>
    <button className="edit" aria-label={`Edit ${t.title}`} onClick={() => onEdit(t)}>✎</button>
  </div>
));
  return <>
    {/* Net recurring total */}
    <h1 className="title">Net Recurring</h1>
    <h1 className={net < 0 ? 'red big' : 'mus big'}>{net < 0 ? '-' : ''}{money(Math.abs(net))}</h1>
    {/* Bills section and its total */}
    <h2>Recurring Bills</h2>
    <List items={bills} cls="red" sign="-" />
    <h3 className="sub">Total Monthly Recurring Bills</h3>
    <b className="red sub">-{money(total(bills))}</b>
    {/* Income section and its total */}
    <h2>Income</h2>
    <List items={inc} cls="mus" sign="+" />
    <h3 className="sub">Total Monthly Income</h3>
    <b className="mus sub">+{money(total(inc))}</b>
  </>;
}
