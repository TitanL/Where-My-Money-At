import { addDoc, collection, deleteDoc, doc, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from './firebase';

// Every save in the app goes through here. For a real user it writes to Firestore.
// For a guest it only changes in-memory data (App registers its state setters below), so nothing is ever saved.
let guest = { setTxs: () => {}, setSettings: () => {} };
export const bindGuest = handlers => { guest = handlers; };
let seq = 0;
const gid = () => `g${Date.now()}${seq++}`;

const col = u => collection(db, 'users', u.uid, 'transactions');
const tdoc = (u, id) => doc(db, 'users', u.uid, 'transactions', id);
const sdoc = u => doc(db, 'users', u.uid, 'meta', 'settings');

export async function addTx(user, data) {
  if (user.isGuest) return guest.setTxs(t => [...t, { id: gid(), ...data }]);
  await addDoc(col(user), { ...data, createdAt: serverTimestamp() });
}

export async function updateTx(user, id, data) {
  if (user.isGuest) return guest.setTxs(t => t.map(x => (x.id === id ? { ...x, ...data } : x)));
  await updateDoc(tdoc(user, id), data);
}

export async function deleteTx(user, id) {
  if (user.isGuest) return guest.setTxs(t => t.filter(x => x.id !== id));
  await deleteDoc(tdoc(user, id));
}

// Many new entries at once (CSV import)
export async function addTxs(user, list) {
  if (user.isGuest) return guest.setTxs(t => [...t, ...list.map(d => ({ id: gid(), ...d }))]);
  for (let i = 0; i < list.length; i += 400) {
    const b = writeBatch(db);
    list.slice(i, i + 400).forEach(d => b.set(doc(col(user)), { ...d, createdAt: serverTimestamp() }));
    await b.commit();
  }
}

// Move every entry from one category name to another (used when a category is renamed)
export async function recategorize(user, txs, from, to) {
  if (user.isGuest) return guest.setTxs(all => all.map(t => (t.category === from ? { ...t, category: to } : t)));
  const hits = txs.filter(t => t.category === from);
  for (let i = 0; i < hits.length; i += 400) {
    const b = writeBatch(db);
    hits.slice(i, i + 400).forEach(t => b.update(tdoc(user, t.id), { category: to }));
    await b.commit();
  }
}

// Merge changes into the settings. `replace` = fields to overwrite completely instead of merging.
export async function saveSettings(user, data, replace) {
  if (user.isGuest) {
    return guest.setSettings(s => ({
      ...s, ...data,
      ...(data.categoryColors && !replace ? { categoryColors: { ...s.categoryColors, ...data.categoryColors } } : {}),
    }));
  }
  await setDoc(sdoc(user), data, replace ? { mergeFields: replace } : { merge: true });
}