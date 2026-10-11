// Recurring.jsx: Recurring Bills screen. Lists bills and income that repeat, with monthly totals.
import { catColor, freqLabel, isRec, money, perMonth, isIncomeCat, signed } from './lib';

export default function Recurring({ txs, onEdit, colors }) {
  // Only entries that have a recurrence
  const rec = txs.filter(isRec);
  // Income section = Income category; Bills = every other category (money coming back reduces them)
  const bills = rec.filter(t => !isIncomeCat(t.category)), inc = rec.filter(t => isIncomeCat(t.category));
  const effect = t => (t.type === 'income' ? 1 : -1) * perMonth(t); // monthly effect on your balance
  const total = l => l.reduce((a, t) => a + effect(t), 0);
  const sgn = n => (n >= 0 ? '+' : '') + money(n);
  const net = total(inc) + total(bills);
  // One row per entry: title, category, schedule, amount and edit button
  const List = ({ items }) => items.length === 0 ? <p className="mid">Nothing here yet.</p> : items.map(t => (
  <div className="entry nodate" key={t.id}>
    <div>
      <b>{t.title}</b>
      <small style={{ color: catColor(t.category, colors) }}>{t.category}</small>
      <small className="mid">{freqLabel(t)}</small>
    </div>
    <b className={t.type === 'income' ? 'mus' : 'red'}>{signed(t)}</b>
    <button className="edit" aria-label={`Edit ${t.title}`} onClick={() => onEdit(t)}>✎</button>
  </div>
));
  return <>
    {/* Net recurring total */}
    <h1 className="title">Net Recurring</h1>
    <h1 className={net < 0 ? 'red big' : 'mus big'}>{net < 0 ? '-' : ''}{money(Math.abs(net))}</h1>
    {/* Bills section and its total */}
    <h2>Recurring Bills</h2>
    <List items={bills} />
    <h3 className="sub">Total Monthly Recurring Bills</h3>
    <b className="red sub">{sgn(total(bills))}</b>
    {/* Income section and its total */}
    <h2>Income</h2>
    <List items={inc} />
    <h3 className="sub">Total Monthly Income</h3>
    <b className="mus sub">{sgn(total(inc))}</b>
  </>;
}
