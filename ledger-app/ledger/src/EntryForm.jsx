import { useState } from 'react';
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from './firebase';
import { pad, today, freqLabel } from './lib';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function Calendar({ value, onPick }) {
  const [y0, m0] = value.split('-').map(Number);
  const [[y, m], setV] = useState([y0, m0 - 1]);
  const first = new Date(y, m, 1).getDay(), dim = new Date(y, m + 1, 0).getDate();
  const cells = [...Array(first).fill(null), ...Array.from({ length: dim }, (_, i) => i + 1)];
  const iso = d => `${y}-${pad(m + 1)}-${pad(d)}`;
  const shift = k => setV(([yy, mm]) => { const d = new Date(yy, mm + k, 1); return [d.getFullYear(), d.getMonth()]; });
  return (
    <div className="menu cal">
      <div className="row">
        <button type="button" onClick={() => shift(-1)} aria-label="Previous month">◀</button>
        <b>{new Date(y, m).toLocaleString('en-US', { month: 'long', year: 'numeric' })}</b>
        <button type="button" onClick={() => shift(1)} aria-label="Next month">▶</button>
        <button type="button" className="small" onClick={() => onPick(today())}>Today</button>
      </div>
      <div className="grid">
        {DOW.map(d => <small key={d}>{d}</small>)}
        {cells.map((d, i) => d
          ? <button type="button" key={i} className={iso(d) === value ? 'sel' : ''} onClick={() => onPick(iso(d))}>{d}</button>
          : <span key={i} />)}
      </div>
    </div>
  );
}

function RecMenu({ value, onDone, onCancel }) {
  const [freq, setFreq] = useState(value.freq || 'none'), [day, setDay] = useState(value.day ?? '');
  const opts = [['weekly', 'Every week'], ['biweekly', 'Every 2 weeks'], ['monthly', 'Monthly'], ['none', 'None']];
  return (
    <div className="menu rec">
      <h4>Custom Recurrence</h4>
      {opts.map(([k, l]) => <button type="button" key={k} className={freq === k ? 'sel' : ''} onClick={() => setFreq(k)}>{l}</button>)}
      <label>On: <input inputMode="numeric" placeholder="Day" value={day} onChange={e => setDay(e.target.value.replace(/\D/g, '').slice(0, 2))} /></label>
      <div className="acts">
        <button type="button" onClick={onCancel}>Cancel</button>
        <button type="button" className="btn sm" onClick={() => onDone({ freq, day: freq === 'monthly' && +day >= 1 && +day <= 31 ? +day : null })}>Done</button>
      </div>
    </div>
  );
}

export default function EntryForm({ user, tx, categories, onClose }) {
  const [f, setF] = useState({
    title: tx.title || '', category: tx.category || '', amount: tx.amount != null ? String(tx.amount) : '',
    type: tx.type || 'expense', date: tx.date || today(), notes: tx.notes || '', photoUrl: tx.photoUrl || '',
    recurrence: { freq: 'none', day: null, ...tx.recurrence },
  });
  const [file, setFile] = useState(null), [cal, setCal] = useState(false), [rec, setRec] = useState(false);
  const [busy, setBusy] = useState(false), [err, setErr] = useState('');
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  async function submit() {
    const amount = parseFloat(f.amount);
    if (!f.title.trim() || !(amount > 0) || !f.category) return setErr('Add a title, a category and an amount above 0.');
    setBusy(true); setErr('');
    try {
      let photoUrl = f.photoUrl;
      if (file) {
        const r = ref(storage, `users/${user.uid}/receipts/${Date.now()}-${file.name}`);
        await uploadBytes(r, file);
        photoUrl = await getDownloadURL(r);
      }
      const data = { title: f.title.trim(), category: f.category, amount, type: f.type, date: f.date, recurrence: f.recurrence, notes: f.notes, photoUrl };
      if (tx.id) await updateDoc(doc(db, 'users', user.uid, 'transactions', tx.id), data);
      else await addDoc(collection(db, 'users', user.uid, 'transactions'), { ...data, createdAt: serverTimestamp() });
      onClose();
    } catch (e) { setErr(e.message); setBusy(false); }
  }
  const remove = async () => { if (confirm('Delete this entry?')) { await deleteDoc(doc(db, 'users', user.uid, 'transactions', tx.id)); onClose(); } };

  return (
    <div className="overlay"><div className="sheet">
      <input className="ttl" placeholder="Title" value={f.title} onChange={e => set('title', e.target.value)} />
      <label className="frow">Category
        <select className="pill-input" value={f.category} onChange={e => set('category', e.target.value)}>
          <option value="" />{categories.map(c => <option key={c}>{c}</option>)}
        </select>
      </label>
      <label className="frow">Amount
        <input className="pill-input" inputMode="decimal" placeholder="$" value={f.amount} onChange={e => set('amount', e.target.value)} />
      </label>
      <div className="toggle">
        <button type="button" className={f.type === 'expense' ? 'on exp' : ''} onClick={() => set('type', 'expense')}>Expense</button>
        <button type="button" className={f.type === 'income' ? 'on inc' : ''} onClick={() => set('type', 'income')}>Income</button>
      </div>
      <div className="anchor">
        <button type="button" className="pill-input wide" onClick={() => { setCal(!cal); setRec(false); }}>{f.date} <span>📅</span></button>
        {cal && <Calendar value={f.date} onPick={d => { set('date', d); setCal(false); }} />}
      </div>
      <div className="frow anchor">Recurrence
        <button type="button" className="pill-input" onClick={() => { setRec(!rec); setCal(false); }}>{f.recurrence.freq === 'none' ? 'None' : freqLabel({ ...f, recurrence: f.recurrence })}</button>
        {rec && <RecMenu value={f.recurrence} onCancel={() => setRec(false)} onDone={r => { set('recurrence', r); setRec(false); }} />}
      </div>
      <div className="pill-input wide notes">
        <input placeholder="Notes:" value={f.notes} onChange={e => set('notes', e.target.value)} />
        <label aria-label="Attach receipt photo">📷<input type="file" accept="image/*" hidden onChange={e => setFile(e.target.files[0] || null)} /></label>
      </div>
      {file && <small>Attached: {file.name}</small>}
      {!file && f.photoUrl && <small><a href={f.photoUrl} target="_blank" rel="noreferrer">View attached receipt</a></small>}
      {err && <p className="err">{err}</p>}
      <div className="acts">
        {tx.id ? <button type="button" onClick={remove}>Delete</button> : <span />}
        <button type="button" onClick={onClose}>Cancel</button>
        <button type="button" className="btn" disabled={busy} onClick={submit}>{busy ? 'Saving…' : tx.id ? 'Save' : 'Add'}</button>
      </div>
    </div></div>
  );
}
