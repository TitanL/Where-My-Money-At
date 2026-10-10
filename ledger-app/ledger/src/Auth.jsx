// Auth.jsx: login / sign-up screen shown when nobody is signed in.
import { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase';

export default function Auth() {
  // mode: "in" = log in, "up" = create account
  const [mode, setMode] = useState('in'), [email, setEmail] = useState(''), [pw, setPw] = useState(''), [err, setErr] = useState('');
  // Submit: log in or create the account; show Firebase's error message if it fails
  const go = async e => {
    e.preventDefault(); setErr('');
    try { await (mode === 'in' ? signInWithEmailAndPassword : createUserWithEmailAndPassword)(auth, email, pw); }
    catch (x) { setErr(x.message.replace('Firebase: ', '')); }
  };
  // Email + password form with a switch between log in and sign up
  return (
    <div className="app auth">
      <h1>Ledger</h1>
      <form onSubmit={go}>
        <input className="pill-input" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input className="pill-input" type="password" placeholder="Password (6+ characters)" value={pw} onChange={e => setPw(e.target.value)} required minLength={6} />
        {err && <p className="red">{err}</p>}
        <button className="btn">{mode === 'in' ? 'Log in' : 'Create account'}</button>
      </form>
      <button className="link" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>
        {mode === 'in' ? 'New here? Create an account' : 'Have an account? Log in'}
      </button>
    </div>
  );
}
