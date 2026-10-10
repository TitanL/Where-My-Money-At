import { useState } from 'react';
import Papa from 'papaparse';
import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { pad, money } from './lib';

const guess = (cols, re) => cols.find(c => re.test(c)) || '';
const num = s => {
  const t = String(s ?? '').trim(); if (!t) return NaN;
  const neg = /^\(.*\)$/.test(t) || t.startsWith('-');
  const n = parseFloat(t.replace(/[^0-9.]/g, '')); return neg ? -n : n;
};
const toIso = s => {
  s = String(s ?? '').trim();
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/); if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/); // assumes MM/DD/YYYY
  if (m) return `${m[3].length === 2 ? '20' + m[3] : m[3]}-${pad(m[1])}-${pad(m[2])}`;
  const d = new Date(s); return isNaN(d) ? '' : d.toISOString().slice(0, 10);
};

export default function Import({ user, categories, onDone }) {
  const [raw, setRaw] = useState(null), [cols, setCols] = useState([]), [map, setMap] = useState({});
  const [flip, setFlip] = useState(false), [rows, setRows] = useState(null), [busy, setBusy] = useState(false);

  const load = e => {
    const file = e.target.files[0]; if (!file) return;
    Papa.parse(file, { header: true, skipEmptyLines: true, complete: r => {
      const c = r.meta.fields || [];
      setRaw(r.data); setCols(c); setRows(null);
      setMap({ date: guess(c, /date/i), title: guess(c, /desc|payee|merchant|name|memo|detail/i), amount: guess(c, /amount|debit|withdraw/i), credit: guess(c, /credit|deposit/i) });
    } });
  };

  const preview = () => setRows(raw.map(r => {
    const a = num(r[map.amount]); let type, amount;
    if (map.credit && num(r[map.credit]) > 0) { type = 'income'; amount = num(r[map.credit]); }
    else if (map.credit) { type = 'expense'; amount = Math.abs(a); }
    else { const s = flip ? -a : a; type = s < 0 ? 'expense' : 'income'; amount = Math.abs(s); }
    return { date: toIso(r[map.date]), title: String(r[map.title] ?? '').trim(), amount, type, category: type === 'income' ? 'Income' : 'Other', on: true };
  }).filter(r => r.date && r.title && r.amount > 0));

  const upd = (i, p) => setRows(rs => rs.map((r, j) => (j === i ? { ...r, ...p } : r)));
  const setAll = category => setRows(rs => rs.map(r => (r.type === 'expense' ? { ...r, category } : r)));

  const save = async () => {
    setBusy(true);
    const pick = rows.filter(r => r.on);
    for (let i = 0; i < pick.length; i += 400) {
      const b = writeBatch(db);
      pick.slice(i, i + 400).forEach(r => b.set(doc(collection(db, 'users', user.uid, 'transactions')), {
        title: r.title, category: r.category, amount: r.amount, type: r.type, date: r.date,
        recurrence: { freq: 'none', day: null }, notes: 'Imported from CSV', photoUrl: '', createdAt: serverTimestamp(),
      }));
      await b.commit();
    }
    onDone();
  };

  const Pick = ({ k, label, optional }) => (
    <label className="frow dk">{label}
      <select className="pill-input" value={map[k] || ''} onChange={e => setMap({ ...map, [k]: e.target.value })}>
        {optional && <option value="">None</option>}{cols.map(c => <option key={c}>{c}</option>)}
      </select>
    </label>
  );

  return <>
    <h1 className="title">Import</h1>
    <p>Choose a CSV exported from your bank.</p>
    <input type="file" accept=".csv,text/csv" onChange={load} />
    {raw && !rows && <>
      <h3>Match your columns</h3>
      <Pick k="date" label="Date" /><Pick k="title" label="Title" /><Pick k="amount" label="Amount / Debit" />
      <Pick k="credit" label="Credit (if separate)" optional />
      {!map.credit && <label><input type="checkbox" checked={flip} onChange={e => setFlip(e.target.checked)} /> Positive amounts are expenses</label>}
      <button className="btn" onClick={preview}>Preview {raw.length} rows</button>
    </>}
    {rows && <>
      <h3>{rows.filter(r => r.on).length} of {rows.length} entries will be added</h3>
      <label className="frow dk">Set all expenses to
        <select className="pill-input" onChange={e => e.target.value && setAll(e.target.value)} defaultValue="">
          <option value="" />{categories.map(c => <option key={c}>{c}</option>)}
        </select>
      </label>
      <div className="scroll"><table>
        <tbody>{rows.map((r, i) => (
          <tr key={i}>
            <td><input type="checkbox" checked={r.on} onChange={e => upd(i, { on: e.target.checked })} aria-label="Include" /></td>
            <td>{r.date.slice(5)}</td><td>{r.title}</td>
            <td className={r.type === 'income' ? 'mus' : 'red'}>{money(r.amount)}</td>
            <td><select value={r.category} onChange={e => upd(i, { category: e.target.value })}>{categories.map(c => <option key={c}>{c}</option>)}</select></td>
          </tr>))}</tbody>
      </table></div>
      <button className="btn" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save entries'}</button>
      <button className="link" onClick={() => setRows(null)}>Back to columns</button>
    </>}
  </>;
}
