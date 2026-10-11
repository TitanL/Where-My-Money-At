// Pages.jsx: the smaller screens (Savings Goal, Settings, Account).
import { useEffect, useRef, useState } from 'react';
import { doc, setDoc, writeBatch } from 'firebase/firestore';
import { sendPasswordResetEmail, signOut } from 'firebase/auth';
import { auth, db } from './firebase';
import { catColor, THEMES, expand, monthRange, money, incomeTotal, balanceEffect, isIncomeCat } from './lib';

// Settings live in one document per user: users/{uid}/meta/settings
const settingsRef = user => doc(db, 'users', user.uid, 'meta', 'settings');

// Category dropdown (same look as the dashboard filter): tick several categories, closes on tap outside
function CategoryPicker({ options, value, onChange, colors }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const close = e => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);
  const toggle = c => onChange(value.includes(c) ? value.filter(x => x !== c) : [...value, c]);
  return (
    <div className="picker" ref={ref} onKeyDown={e => e.key === 'Escape' && setOpen(false)}>
      <button type="button" className="picker-btn" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className={value.length ? '' : 'ph'}>{value.length ? value.join(', ') : 'Select'}</span><i>▼</i>
      </button>
      {open && (
        <div className="menu filter-menu">
          {options.length === 0 && <p className="mid">No categories available.</p>}
          {options.map(c => (
            <button key={c} type="button" role="checkbox" aria-checked={value.includes(c)}
              className={value.includes(c) ? 'sel' : ''} onClick={() => toggle(c)}>
              <i className="dot" style={{ background: catColor(c, colors) }} />{c}<span>{value.includes(c) ? '✓' : ''}</span>
            </button>
          ))}
          <div className="acts">
            <button type="button" onClick={() => onChange([])}>Clear</button>
            <button type="button" className="btn sm" onClick={() => setOpen(false)}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Savings Calculator & Goal screen: Needs, Wants and the monthly savings goal
export function Goal({ user, settings, txs, categories, colors }) {
  const save = data => setDoc(settingsRef(user), data, { merge: true });

  // This month's income and expenses (same range as the dashboard's monthly view)
  const now = new Date(), [from, to] = monthRange(now.getFullYear(), now.getMonth());
  const es = expand(txs, from, to);
  const income = incomeTotal(es);
  // Share of this month's income spent on the chosen categories
  const share = cats => {
    if (!(income > 0)) return '—';
    const spent = -es.filter(e => cats.includes(e.category)).reduce((a, e) => a + balanceEffect(e), 0);    
    return `${Math.round((spent / income) * 1000) / 10}%`;
  };

  const needs = settings.needsCats || [], wants = settings.wantsCats || [];
  // A category can only be in one section, so hide the ones picked in the other (and Income)
  const options = other => categories.filter(c => c !== 'Income' && !other.includes(c));

  // Savings goal: an exact dollar amount, or a percentage of income
  const [mode, setMode] = useState(settings.savingsGoalMode || 'amount');
  const [vals, setVals] = useState({ amount: settings.savingsGoal ?? '', percent: settings.savingsGoalPct ?? '' });
  const [ok, setOk] = useState(false);
  const v = vals[mode];
  const saveGoal = async () => {
    const num = mode === 'percent' ? Math.min(100, Math.max(0, Number(v) || 0)) : Math.max(0, Number(v) || 0);
    await save(mode === 'percent' ? { savingsGoalMode: 'percent', savingsGoalPct: num } : { savingsGoalMode: 'amount', savingsGoal: num });
    setOk(true);
  };

  return <>
    <h1 className="title">Savings Calculator:</h1>

    {/* Needs and Wants: pick categories, see their share of this month's income */}
    {[['Needs', needs, 'needsCats', wants], ['Wants', wants, 'wantsCats', needs]].map(([label, picked, key, other]) => (
      <section key={label}>
        <h2>{label}</h2>
        <div className="calc-row">
          <span>Categories</span>
          <CategoryPicker options={options(other)} value={picked} colors={colors} onChange={list => save({ [key]: list })} />
        </div>
        <div className="calc-row">
          <span>Percent of Total Income</span>
          <b className="pct-val">{share(picked)}</b>
        </div>
      </section>
    ))}

    {/* Savings goal: amount or percentage of income */}
    <section>
      <h2>Savings</h2>
      <div className="calc-row">
        <span>Set Monthly Savings Goal</span>
        <label className={`money-field${mode === 'percent' ? ' pct' : ''}`}>
          <span>{mode === 'percent' ? '%' : '$'}</span>
          <input className="pill-input field" inputMode="decimal" aria-label="Monthly savings goal" value={v}
            onChange={e => { setVals({ ...vals, [mode]: e.target.value }); setOk(false); }} />
        </label>
      </div>
      <div className="calc-row">
        <div className="mode" role="radiogroup" aria-label="Goal type">
          <button type="button" role="radio" aria-checked={mode === 'amount'} className={mode === 'amount' ? 'on' : ''}
            onClick={() => { setMode('amount'); setOk(false); }}>Amount</button>
          <button type="button" role="radio" aria-checked={mode === 'percent'} className={mode === 'percent' ? 'on' : ''}
            onClick={() => { setMode('percent'); setOk(false); }}>Percentage</button>
        </div>
        <button className="btn" onClick={saveGoal}>Save goal</button>
      </div>
      {mode === 'percent' && income > 0 && Number(v) > 0 && <p className="mid">About {money((income * Number(v)) / 100)} of this month's income.</p>}
      {ok && <p className="mid">Goal saved.</p>}
    </section>
  </>;
}


// Preset muted colors offered for new categories
const SWATCHES = ['#d4706a', '#8e84c9', '#5f8fa3', '#d99a36', '#a0693d'];

// Small popup for editing one category's name and color
function CategoryEditor({ name, color, taken, locked, onSave, onClose }) {
  const [n, setN] = useState(name), [c, setC] = useState(color), [custom, setCustom] = useState(null);
  const [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const choices = SWATCHES.includes(color) ? SWATCHES : [color, ...SWATCHES]; // keep the current color available
  const submit = async () => {
    const t = n.trim();
    if (!t) return setErr('Name can not be empty.');
    if (t !== name && taken.includes(t)) return setErr('That category already exists.');
    setBusy(true);
    await onSave(t, c);
  };
  return <>
    <div className="scrim" onClick={onClose} />
    <div className="pop" role="dialog" aria-label={`Edit ${name}`}>
      <input className="pill-input field" value={n} onChange={e => setN(e.target.value)} readOnly={locked} autoFocus={!locked} aria-label="Category name" />
      {locked && <small>The Income name can't be changed, but you can pick a new color.</small>}
      <div className="swatches" role="radiogroup" aria-label="Category color">
        {choices.map(s => (
          <button key={s} type="button" role="radio" aria-checked={c === s} aria-label={s}
            className={c === s ? 'on' : ''} style={{ background: s }} onClick={() => setC(s)} />
        ))}
        <label className={`colorpick${custom ? ' set' : ''}${custom && c === custom ? ' on' : ''}`}
          style={custom ? { background: custom } : undefined} aria-label="Custom color">
          {!custom && '+'}
          <input type="color" value={custom || c} onChange={e => { setCustom(e.target.value); setC(e.target.value); }} />
        </label>
      </div>
      {err && <p className="err">{err}</p>}
      <div className="acts">
        <button type="button" onClick={onClose}>Cancel</button>
        <button type="button" className="btn sm" disabled={busy} onClick={submit}>Save</button>
      </div>
    </div>
  </>;
}

// Settings screen: category list with colors, and a form to add categories
export function Settings({ user, categories, colors, theme, onTheme, txs, settings }) {
  const [name, setName] = useState(''), [color, setColor] = useState(SWATCHES[0]);
  // custom color picked with the + button (null = none yet)
  const [custom, setCustom] = useState(null);
  // Merge changes into the settings document
  const save = data => setDoc(settingsRef(user), data, { merge: true });
  // Switch theme right away and save it to the account
  const pickTheme = k => { onTheme(k); save({ theme: k }); };
  // Category being edited (null = popup closed)
  const [editing, setEditing] = useState(null);
  // Save a category edit. A rename also updates its entries and its Needs / Wants picks.
  const saveEdit = async (oldName, newName, color) => {
    if (newName === oldName) { await save({ categoryColors: { [oldName]: color } }); return; }
    const swap = list => (list || []).map(x => (x === oldName ? newName : x));
    const { [oldName]: _old, ...rest } = colors;
    await setDoc(settingsRef(user), {
      categories: swap(categories), categoryColors: { ...rest, [newName]: color },
      needsCats: swap(settings.needsCats), wantsCats: swap(settings.wantsCats),
    }, { mergeFields: ['categories', 'categoryColors', 'needsCats', 'wantsCats'] });
    const hits = txs.filter(t => t.category === oldName);
    for (let i = 0; i < hits.length; i += 400) {
      const b = writeBatch(db);
      hits.slice(i, i + 400).forEach(t => b.update(doc(db, 'users', user.uid, 'transactions', t.id), { category: newName }));
      await b.commit();
    }
  };
  // Add a new category with the chosen color (ignores blanks and duplicates)
  const add = () => {
    const t = name.trim();
    if (t && !categories.includes(t)) save({ categories: [...categories, t], categoryColors: { [t]: color } });
    setName('');
  };
  return <>
    <h1 className="title">Settings</h1>
    <h3>Categories</h3>
    {/* Existing categories: color dot, name, remove button */}
    <div className="chips">
      {categories.map(c => (
        <span className="chip" key={c}>
          <button type="button" className="chip-main" onClick={() => setEditing(c)} aria-label={`Edit ${c}`}>
            <i className="dot" style={{ background: catColor(c, colors) }} />{c}
          </button>
          {!isIncomeCat(c) && <button onClick={() => save({ categories: categories.filter(x => x !== c) })} aria-label={`Remove ${c}`}>✕</button>}        </span>
      ))}
    </div>
    {/* New category form: name, color swatches and a custom color picker */}
    <h3>New category</h3>
    <input className="pill-input field" placeholder="Category name" value={name} onChange={e => setName(e.target.value)} />
    <div className="swatches" role="radiogroup" aria-label="Category color">
      {SWATCHES.map(s => (
        <button key={s} type="button" role="radio" aria-checked={color === s} aria-label={s}
          className={color === s ? 'on' : ''} style={{ background: s }} onClick={() => setColor(s)} />
      ))}
      <label className={`colorpick${custom ? ' set' : ''}${custom && color === custom ? ' on' : ''}`}
        style={custom ? { background: custom } : undefined} aria-label="Custom color">
        {!custom && '+'}
        <input type="color" value={custom || color} onChange={e => { setCustom(e.target.value); setColor(e.target.value); }} />
      </label>
    </div>
    <button className="btn" onClick={add}>Add category</button>
    <h3>Themes</h3>
    <div className="themes" role="radiogroup" aria-label="Theme">
      {Object.entries(THEMES).map(([k, t]) => (
        <button key={k} type="button" role="radio" aria-checked={theme === k} className={theme === k ? 'on' : ''} onClick={() => pickTheme(k)}>
          <i style={{ background: t.mid, borderColor: t.dark }} />
          {t.name}
        </button>
      ))}
    </div>
    {editing && (
      <CategoryEditor key={editing} name={editing} color={catColor(editing, colors)} taken={categories} locked={isIncomeCat(editing)}
        onClose={() => setEditing(null)}
        onSave={async (n, c) => { await saveEdit(editing, n, c); setEditing(null); }} />
    )}
  </>;
}

// Account screen: email, password reset and log out
export function Account({ user }) {
  const [sent, setSent] = useState(false);
  return <>
    <h1 className="title">Account</h1>
    <p>Signed in as <b>{user.email}</b></p>
    <button className="btn" onClick={async () => { await sendPasswordResetEmail(auth, user.email); setSent(true); }}>Email me a password reset</button>
    {sent && <p className="mid">Reset email sent.</p>}
    <button className="btn dark" onClick={() => signOut(auth)}>Log out</button>
  </>;
}
