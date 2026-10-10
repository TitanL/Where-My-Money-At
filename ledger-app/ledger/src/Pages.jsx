import { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { sendPasswordResetEmail, signOut } from 'firebase/auth';
import { auth, db } from './firebase';

const settingsRef = user => doc(db, 'users', user.uid, 'meta', 'settings');

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

export function Settings({ user, categories }) {
  const [name, setName] = useState('');
  const save = list => setDoc(settingsRef(user), { categories: list }, { merge: true });
  return <>
    <h1 className="title">Settings</h1>
    <h3>Categories</h3>
    <div className="chips">{categories.map(c => <button key={c} onClick={() => save(categories.filter(x => x !== c))} aria-label={`Remove ${c}`}>{c} ✕</button>)}</div>
    <input className="pill-input" placeholder="New category" value={name} onChange={e => setName(e.target.value)} />
    <button className="btn" onClick={() => { const t = name.trim(); if (t && !categories.includes(t)) save([...categories, t]); setName(''); }}>Add category</button>
  </>;
}

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
