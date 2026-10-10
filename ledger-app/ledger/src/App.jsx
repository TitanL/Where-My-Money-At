import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import { DEFAULT_CATS } from './lib';
import Auth from './Auth';
import Dashboard from './Dashboard';
import Recurring from './Recurring';
import EntryForm from './EntryForm';
import Import from './Import';
import { Goal, Settings, Account } from './Pages';

const NAV = [['home', 'Dashboard'], ['recurring', 'Recurring Bills'], ['goal', 'Savings Goal'], ['import', 'Import'], ['settings', 'Settings'], ['account', 'Account']];

export default function App() {
  const [user, setUser] = useState(undefined);
  const [txs, setTxs] = useState([]);
  const [settings, setSettings] = useState({ savingsGoal: 500, categories: DEFAULT_CATS });
  const [view, setView] = useState('home'), [menu, setMenu] = useState(false), [editing, setEditing] = useState(null);

  useEffect(() => onAuthStateChanged(auth, setUser), []);
  useEffect(() => {
    if (!user) return;
    const a = onSnapshot(collection(db, 'users', user.uid, 'transactions'), s => setTxs(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const b = onSnapshot(doc(db, 'users', user.uid, 'meta', 'settings'), s => s.exists() && setSettings(p => ({ ...p, ...s.data() })));
    return () => { a(); b(); };
  }, [user]);

  if (user === undefined) return <div className="app"><p>Loading…</p></div>;
  if (!user) return <Auth />;

  const edit = t => setEditing(txs.find(x => x.id === (t._tid || t.id)) || {});
  const go = v => { setView(v); setMenu(false); };
  const cats = settings.categories?.length ? settings.categories : DEFAULT_CATS;

  return (
    <div className="app">
      <button className="burger" aria-label="Open menu" onClick={() => setMenu(true)}><i /><i /><i /></button>
      {menu && <>
        <div className="scrim" onClick={() => setMenu(false)} />
        <nav className="drawer">
          <button className="burger" aria-label="Close menu" onClick={() => setMenu(false)}><i /><i /><i /></button>
          {NAV.map(([k, l]) => <button key={k} onClick={() => go(k)}>{l}</button>)}
        </nav>
      </>}
      {view === 'home' && <Dashboard txs={txs} goal={settings.savingsGoal} onEdit={edit} />}
      {view === 'recurring' && <Recurring txs={txs} onEdit={edit} />}
      {view === 'goal' && <Goal user={user} settings={settings} />}
      {view === 'import' && <Import user={user} categories={cats} onDone={() => go('home')} />}
      {view === 'settings' && <Settings user={user} categories={cats} />}
      {view === 'account' && <Account user={user} />}
      {(view === 'home' || view === 'recurring') && <button className="fab" aria-label="Add entry" onClick={() => setEditing({})}>+</button>}
      {editing && <EntryForm user={user} tx={editing} categories={cats} onClose={() => setEditing(null)} />}
    </div>
  );
}
