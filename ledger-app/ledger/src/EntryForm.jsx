// EntryForm.jsx: add / edit entry form, with the date calendar, recurrence menu and receipt photo.
import { useState } from 'react';
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { pad, today, freqLabel } from './lib';

// Weekday headers for the calendar
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Shrink a photo to a small JPEG data URL (< ~260 KB) so it fits in a Firestore document (1 MiB limit).
// Receipt photos are stored inside the Firestore document, so they are resized first
async function shrink(file) {
  const bmp = await createImageBitmap(file);
  for (const max of [1200, 900, 700, 500]) {
    const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    for (const q of [0.7, 0.55, 0.4]) { const url = c.toDataURL('image/jpeg', q); if (url.length < 350000) return url; }
  }
  throw new Error('That photo is too large to store. Try a smaller image.');
}

// Popup calendar for picking a date (value and onPick use "YYYY-MM-DD")
function Calendar({ value, onPick }) {
  // Month being viewed (starts on the selected date)
  const [y0, m0] = value.split('-').map(Number);
  const [[y, m], setV] = useState([y0, m0 - 1]);
  // Blank cells before day 1 so it lines up under the right weekday
  const first = new Date(y, m, 1).getDay(), dim = new Date(y, m + 1, 0).getDate();
  const cells = [...Array(first).fill(null), ...Array.from({ length: dim }, (_, i) => i + 1)];
  const iso = d => `${y}-${pad(m + 1)}-${pad(d)}`;
  // Move the calendar forward / back by k months
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

// Themed day-of-week dropdown (0 = Sunday), used for weekly / every-2-weeks entries
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function DayDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="dd" onKeyDown={e => e.key === 'Escape' && setOpen(false)}>
      <button type="button" className="dd-btn" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)}>
        {value == null ? 'Day' : WEEKDAYS[value].slice(0, 3)} <span>▾</span>
      </button>
      {open && (
        <ul className="dd-list" role="listbox">
          {WEEKDAYS.map((d, i) => (
            <li key={d} role="option" aria-selected={value === i}>
              <button type="button" className={value === i ? 'sel' : ''} onClick={() => { onChange(i); setOpen(false); }}>{d}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Recurrence popup: how often, plus the weekday (weekly) or day of month (monthly)
function RecMenu({ value, onDone, onCancel }) {
  const [freq, setFreq] = useState(value.freq || 'none'), [day, setDay] = useState(value.day ?? '');
  const [weekday, setWeekday] = useState(value.weekday ?? null);
  const opts = [['weekly', 'Every week'], ['biweekly', 'Every 2 weeks'], ['monthly', 'Monthly'], ['none', 'None']];
  // Weekly and every-2-weeks share the weekday dropdown
  const weekly = freq === 'weekly' || freq === 'biweekly';
  return (
    <div className="menu rec">
      <h4>Custom Recurrence</h4>
      {opts.map(([k, l]) => <button type="button" key={k} className={freq === k ? 'sel' : ''} onClick={() => setFreq(k)}>{l}</button>)}
      {weekly && <div className="onrow"><span>On:</span><DayDropdown value={weekday} onChange={setWeekday} /></div>}
      <div className="acts">
        <button type="button" onClick={onCancel}>Cancel</button>
        <button type="button" className="btn sm" onClick={() => onDone({
          freq,
          day: freq === 'monthly' && +day >= 1 && +day <= 31 ? +day : null,
          weekday: weekly ? weekday : null,
        })}>Done</button>
      </div>
    </div>
  );
}

// The form itself. tx = {} for a new entry, or the existing transaction when editing.
export default function EntryForm({ user, tx, categories, onClose }) {
  // Form fields
  const [f, setF] = useState({
    title: tx.title || '', category: tx.category || '', amount: tx.amount != null ? String(tx.amount) : '',
    type: tx.type || 'expense', date: tx.date || today(), notes: tx.notes || '', photo: tx.photo || '',
    recurrence: { freq: 'none', day: null, ...tx.recurrence },
  });
  // Which popup is open, saving state and error message
  const [cal, setCal] = useState(false), [rec, setRec] = useState(false);
  const [busy, setBusy] = useState(false), [err, setErr] = useState('');
  // Update one form field
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  // Receipt photo chosen: shrink it and keep it on the form until saved
  const pick = async e => {
    const file = e.target.files[0]; if (!file) return;
    setErr('');
    try { set('photo', await shrink(file)); } catch (x) { setErr(x.message); }
    e.target.value = '';
  };

  // Validate, then create or update the transaction in Firestore
  async function submit() {
    const amount = parseFloat(f.amount);
    if (!f.title.trim() || !(amount > 0) || !f.category) return setErr('Add a title, a category and an amount above 0.');
    setBusy(true); setErr('');
    try {
      const data = { title: f.title.trim(), category: f.category, amount, type: f.type, date: f.date, recurrence: f.recurrence, notes: f.notes, photo: f.photo };
      if (tx.id) await updateDoc(doc(db, 'users', user.uid, 'transactions', tx.id), data);
      else await addDoc(collection(db, 'users', user.uid, 'transactions'), { ...data, createdAt: serverTimestamp() });
      onClose();
    } catch (e) { setErr(e.message); setBusy(false); }
  }
  // Delete the entry after confirming
  const remove = async () => { if (confirm('Delete this entry?')) { await deleteDoc(doc(db, 'users', user.uid, 'transactions', tx.id)); onClose(); } };

  return (
    <div className="overlay"><div className="sheet">
      {/* Title */}
      <input className="ttl" placeholder="Title" value={f.title} onChange={e => set('title', e.target.value)} />
      {/* Category (list comes from Settings) */}
      <label className="frow">Category
        <select className="pill-input" value={f.category} onChange={e => set('category', e.target.value)}>
          <option value="" />{categories.map(c => <option key={c}>{c}</option>)}
        </select>
      </label>
      {/* Amount */}
      <label className="frow">Amount
        <input className="pill-input" inputMode="decimal" placeholder="$" value={f.amount} onChange={e => set('amount', e.target.value)} />
      </label>
      {/* Expense / Income toggle */}
      <div className="toggle">
        <button type="button" className={f.type === 'expense' ? 'on exp' : ''} onClick={() => set('type', 'expense')}>Expense</button>
        <button type="button" className={f.type === 'income' ? 'on inc' : ''} onClick={() => set('type', 'income')}>Income</button>
      </div>
      {/* Date field with popup calendar */}
      <div className="anchor">
        <button type="button" className="pill-input wide" onClick={() => { setCal(!cal); setRec(false); }}>{f.date} <span>📅</span></button>
        {cal && <Calendar value={f.date} onPick={d => { set('date', d); setCal(false); }} />}
      </div>
      {/* Recurrence field with popup menu */}
      <div className="frow anchor">Recurrence
        <button type="button" className="pill-input" onClick={() => { setRec(!rec); setCal(false); }}>{f.recurrence.freq === 'none' ? 'None' : freqLabel({ ...f, recurrence: f.recurrence })}</button>
        {rec && <RecMenu value={f.recurrence} onCancel={() => setRec(false)} onDone={r => { set('recurrence', r); setRec(false); }} />}
      </div>
      {/* Notes and receipt photo attach button */}
      <div className="pill-input wide notes">
        <input placeholder="Notes:" value={f.notes} onChange={e => set('notes', e.target.value)} />
        <label aria-label="Attach receipt photo">📷<input type="file" accept="image/*" hidden onChange={pick} /></label>
      </div>
      {/* Receipt preview */}
      {f.photo && <div className="receipt"><img src={f.photo} alt="Receipt" /><button type="button" onClick={() => set('photo', '')}>Remove photo</button></div>}
      {/* Error message */}
      {err && <p className="err">{err}</p>}
      {/* Delete (existing entries only), Cancel and Add / Save */}
      <div className="acts">
        {tx.id && <button type="button" className="delete" onClick={remove}>Delete</button>}
        <button type="button" className="cancel" onClick={onClose}>Cancel</button>
        <button type="button" className="btn" disabled={busy} onClick={submit}>{busy ? 'Saving…' : tx.id ? 'Save' : 'Add'}</button>
      </div>
    </div></div>
  );
}
