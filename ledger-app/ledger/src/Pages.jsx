// Pages.jsx: the smaller screens (Savings Goal, Settings, Account).
import { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { sendPasswordResetEmail, signOut } from 'firebase/auth';
import { auth, db } from './firebase';
import { catColor } from './lib';

// Settings live in one document per user: users/{uid}/meta/settings
const settingsRef = user => doc(db, 'users', user.uid, 'meta', 'settings');

// Savings Goal screen: edit the monthly goal
export function Goal({ user, settings }) {
  const [v, setV] = useState(settings.savingsGoal ?? 0), [ok, setOk] = useState(false);
  const save = async () => { await setDoc(settingsRef(user), { savingsGoal: Number(v) || 0 }, { merge: true }); setOk(true); };
  return <>
    <h1 className="title">Savings Goal</h1>
    <p>How much do you want to save each month?</p>
    <input className="pill-input" inputMode="decimal" value={v} onChange={e => { setV(e.target.value); setOk(false); }} />
    <button className="btn" onClick={save}>Save goal</button>
    {ok && <p className="mid">Goal saved.</p>}
  </>;
}


// Preset muted colors offered for new categories
const SWATCHES = ['#d4706a', '#8e84c9', '#5f8fa3', '#d99a36', '#a0693d'];
// Settings screen: category list with colors, and a form to add categories
export function Settings({ user, categories, colors }) {
  const [name, setName] = useState(''), [color, setColor] = useState(SWATCHES[0]);
  // custom color picked with the + button (null = none yet)
  const [custom, setCustom] = useState(null);
  // Merge changes into the settings document
  const save = data => setDoc(settingsRef(user), data, { merge: true });
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
          <i className="dot" style={{ background: catColor(c, colors) }} />
          {c}
          <button onClick={() => save({ categories: categories.filter(x => x !== c) })} aria-label={`Remove ${c}`}>✕</button>
        </span>
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
