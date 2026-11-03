// App.jsx: app shell. Handles login state, syncs data from Firestore, and switches between screens.
import { useEffect, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import { DEFAULT_CATS, INCOME_CAT, applyTheme, savedTheme } from './lib';
import Auth from './Auth';
import Dashboard from './Dashboard';
import Recurring from './Recurring';
import EntryForm from './EntryForm';
import Import from './Import';
import { Goal, Settings, Account } from './Pages';
import { bindGuest } from './store';
import { guestData, GUEST_USER } from './guest';

// Sidebar menu items: [screen key, label]
const NAV = [['home', 'Dashboard'], ['recurring', 'Recurring Bills'], ['goal', 'Savings Calculator'], ['import', 'Import'], ['settings', 'Settings'], ['account', 'Account']];

export default function App() {
  // undefined = still checking login, null = logged out
  const [user, setUser] = useState(undefined);
  // All saved transactions (recurring ones are stored once and expanded when displayed)
  const [txs, setTxs] = useState([]);
  // Savings goal, category list and category colors, synced from Firestore
  const [settings, setSettings] = useState({ savingsGoal: 500, categories: DEFAULT_CATS });
  // view = current screen, menu = sidebar open, editing = entry being edited ({} = new entry, null = form closed)
  const [view, setView] = useState('home'), [menu, setMenu] = useState(false), [editing, setEditing] = useState(null);
  // current theme key: coffee, matcha or ube
  const [theme, setTheme] = useState(savedTheme); 
  // true while browsing the demo (nothing is saved)
  const [guest, setGuest] = useState(false);
  // theme to restore when leaving guest mode
  const prevTheme = useRef(null);            

  // Track login state
  useEffect(() => onAuthStateChanged(auth, u => {
    setUser(u);
    setView('home');     // always land on the dashboard after logging in or out
    setMenu(false);      // close the sidebar
    setEditing(null);    // close any open entry form
  }), []);
  // While logged in, live-sync transactions and settings from Firestore; unsubscribe on logout
  useEffect(() => {
    if (!user) return;
    const a = onSnapshot(collection(db, 'users', user.uid, 'transactions'), s => setTxs(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const b = onSnapshot(doc(db, 'users', user.uid, 'meta', 'settings'), s => s.exists() && setSettings(p => ({ ...p, ...s.data() })));
    return () => { a(); b(); };
  }, [user]);

  // Apply the theme whenever it changes
  useEffect(() => { applyTheme(theme); }, [theme]);
  // If the account has a saved theme (e.g. picked on another device), use it
  useEffect(() => { if (settings.theme && settings.theme !== theme) setTheme(settings.theme); }, [settings.theme]);
  
  // Guest mode: store.js sends every "save" to these setters instead of Firestore
  useEffect(() => { bindGuest({ setTxs, setSettings }); }, []);
  // Enter the demo: load the preset data into memory only
  const startGuest = () => {
    const g = guestData();
    prevTheme.current = theme;
    setTxs(g.txs); setSettings(g.settings); setView('home'); setGuest(true);
  };
  // Leave the demo: throw the demo data away and go back to the login screen
  const exitGuest = () => {
    setGuest(false); setTxs([]); setSettings({ savingsGoal: 500, categories: DEFAULT_CATS });
    setView('home'); setMenu(false); setEditing(null);
    if (prevTheme.current) setTheme(prevTheme.current);
  };
  
  // Loading screen, then login screen, before the app itself
  if (user === undefined) return <div className="app"><p>Loading…</p></div>;
  if (!user && !guest) return <Auth onGuest={startGuest} />;
  const me = guest ? GUEST_USER : user; // the "user" the screens save as

  // Open the entry form for a transaction (recurring occurrences map back to their stored entry)
  const edit = t => setEditing(txs.find(x => x.id === (t._tid || t.id)) || {});
  // Switch screen and close the sidebar
  const go = v => { setView(v); setMenu(false); };
  // Category list (falls back to the defaults until the user customizes it)
  const base = settings.categories?.length ? settings.categories : DEFAULT_CATS;
  // the Income category is always present
  const cats = base.includes(INCOME_CAT) ? base : [...base, INCOME_CAT];
  // Category colors chosen in Settings: { name: "#hex" }
  const colors = settings.categoryColors || {};

  return (
    <div className="app">
      {guest && (
        <div className="guest-bar">
          <span>Guest mode: demo data, nothing is saved.</span>
          <button onClick={exitGuest}>Exit</button>
        </div>
      )}
      {/* Sidebar toggle */}
      <button className="burger" aria-label="Open menu" onClick={() => setMenu(true)}><i /><i /><i /></button>
      {/* Sidebar menu (always mounted so it can slide in and out) */}
      <div className={`scrim fade${menu ? ' open' : ''}`} onClick={() => setMenu(false)} />
      <nav className={`drawer${menu ? ' open' : ''}`}>
        <button className="burger" aria-label="Close menu" onClick={() => setMenu(false)}><i /><i /><i /></button>
        {NAV.map(([k, l]) => <button key={k} onClick={() => go(k)}>{l}</button>)}
      </nav>
      {/* Current screen */}
      {view === 'home' && <Dashboard txs={txs} goal={settings.savingsGoal} goalPct={settings.savingsGoalMode === 'percent' ? settings.savingsGoalPct : null} onEdit={edit} colors={colors} />}
      {view === 'recurring' && <Recurring txs={txs} onEdit={edit} colors={colors} />}
      {view === 'goal' && <Goal user={me} settings={settings} txs={txs} categories={cats} colors={colors} />}
      {view === 'import' && <Import user={me} categories={cats} onDone={() => go('home')} />}
      {view === 'settings' && <Settings user={me} categories={cats} colors={colors} theme={theme} onTheme={setTheme} txs={txs} settings={settings} />}      
      {view === 'account' && <Account user={me} onExit={exitGuest} />}
      {/* Floating add button (dashboard and recurring screens only) */}
      {(view === 'home' || view === 'recurring') && <button className="fab" aria-label="Add entry" onClick={() => setEditing({})}>+</button>}
      {/* Add / edit entry form (full-screen sheet) */}
      {editing && <EntryForm user={me} tx={editing} categories={cats} onClose={() => setEditing(null)} />}
    </div>
  );
}
