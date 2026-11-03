import { DEFAULT_CATS, pad } from './lib';

export const GUEST_USER = { uid: 'guest', email: 'Guest', isGuest: true };

// Demo data for guest mode. Dates are built from today's date so the dashboard always looks current.
export function guestData() {
  const now = new Date();
  // A date in the month `back` months ago (0 = this month), with the day clamped to that month's length
  const date = (back, day) => {
    const m = new Date(now.getFullYear(), now.getMonth() - back, 1);
    const dim = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
    return `${m.getFullYear()}-${pad(m.getMonth() + 1)}-${pad(Math.min(day, dim))}`;
  };
  const cur = day => date(0, Math.min(day, now.getDate())); // this month, never later than today
  const none = { freq: 'none', day: null };
  const monthly = day => ({ freq: 'monthly', day });
  let n = 0;
  const tx = (title, category, amount, type, dt, recurrence = none) =>
    ({ id: `g${++n}`, title, category, amount, type, date: dt, recurrence, notes: '', photo: '' });

  return {
    txs: [
      // Recurring (started 3 months ago so earlier months have data too)
      tx('Job', 'Income', 2400, 'income', date(3, 1), monthly(1)),
      tx('Part time', 'Income', 300, 'income', date(3, 5), { freq: 'biweekly', day: null, weekday: 5 }),
      tx('Rent', 'Housing', 1200, 'expense', date(3, 1), monthly(1)),
      tx('Spotify', 'Subscriptions', 14.69, 'expense', date(3, 6), monthly(6)),
      tx('Gym membership', 'Subscriptions', 9.03, 'expense', date(3, 2), { freq: 'biweekly', day: null }),
      tx('Phone bill', 'Subscriptions', 55, 'expense', date(3, 15), monthly(15)),
      // This month
      tx('Loblaws', 'Groceries', 86.42, 'expense', cur(3)),
      tx('Ikea', 'Furniture', 249.99, 'expense', cur(5)),
      tx('Coffee', 'Dining', 6.75, 'expense', cur(7)),
      tx('Uber', 'Transport', 18.3, 'expense', cur(8)),
      tx('Dinner with friends', 'Dining', 64.2, 'expense', cur(10)),
      tx('Dinner payback', 'Dining', 21.4, 'income', cur(11)), // money coming back lowers Dining spending
      tx('Pharmacy', 'Health', 23.15, 'expense', cur(12)),
      tx('Loblaws', 'Groceries', 112.08, 'expense', cur(14)),
      // Last month
      tx('Loblaws', 'Groceries', 94.1, 'expense', date(1, 4)),
      tx('Shoes', 'Other', 79.99, 'expense', date(1, 9)),
      tx('Uber', 'Transport', 27, 'expense', date(1, 12)),
      tx('Dinner out', 'Dining', 48.75, 'expense', date(1, 18)),
      tx('Loblaws', 'Groceries', 101.37, 'expense', date(1, 21)),
      tx('Dentist', 'Health', 120, 'expense', date(1, 24)),
    ],
    settings: {
      savingsGoal: 500, savingsGoalMode: 'amount', categories: DEFAULT_CATS, categoryColors: {},
      needsCats: ['Housing', 'Groceries', 'Transport', 'Health'], wantsCats: ['Dining', 'Furniture', 'Subscriptions'],
    },
  };
}