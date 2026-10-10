# Ledger: personal finance tracker (React + Vite + Firebase)

## Setup
1. Create a Firebase project. Stay on the free **Spark** plan. Enable **Authentication → Email/Password** and **Firestore** (Storage isn't used).
2. Add a Web app in project settings; copy its config into `.env` (see `.env.example`).
3. Paste `firestore.rules` into the Rules tab of Firestore (or `firebase deploy --only firestore:rules`).
4. `npm install && npm run dev`

## Data model (all under `users/{uid}`)
- `transactions/{id}`: title, category, amount (positive), type (`expense`|`income`), date (`YYYY-MM-DD`), recurrence `{freq: none|weekly|biweekly|monthly, day}`, notes, photo (small JPEG data URL, under about 260 KB), createdAt
- `meta/settings`: savingsGoal, categories[]

A recurring entry is stored once; the dashboard expands it into every occurrence in the selected period.
