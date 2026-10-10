import { catColor, freqLabel, isRec, money, perMonth } from './lib';

export default function Recurring({ txs, onEdit }) {
  const rec = txs.filter(isRec);
  const bills = rec.filter(t => t.type === 'expense'), inc = rec.filter(t => t.type === 'income');
  const total = l => l.reduce((a, t) => a + perMonth(t), 0);
  const net = total(inc) - total(bills);
  const List = ({ items, cls, sign }) => items.length === 0 ? <p className="mid">Nothing here yet.</p> : items.map(t => (
  <div className="entry nodate" key={t.id}>
    <div>
      <b>{t.title}</b>
      <small style={{ color: catColor(t.category) }}>{t.category}</small>
      <small className="mid">{freqLabel(t)}</small>
    </div>
    <b className={cls}>{sign}{money(t.amount)}</b>
    <button className="edit" aria-label={`Edit ${t.title}`} onClick={() => onEdit(t)}>✎</button>
  </div>
));
  return <>
    <h1 className="title">Net Recurring</h1>
    <h1 className={net < 0 ? 'red big' : 'mus big'}>{net < 0 ? '-' : ''}{money(Math.abs(net))}</h1>
    <h2>Recurring Bills</h2>
    <List items={bills} cls="red" sign="-" />
    <h3 className="sub">Total Monthly Recurring Bills</h3>
    <b className="red sub">-{money(total(bills))}</b>
    <h2>Income</h2>
    <List items={inc} cls="mus" sign="+" />
    <h3 className="sub">Total Monthly Income</h3>
    <b className="mus sub">+{money(total(inc))}</b>
  </>;
}
