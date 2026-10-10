# Ledger: personal finance tracker (React + Vite + Firebase)

## Setup
1. Create a Firebase project. Enable **Authentication → Email/Password**, **Firestore**, and **Storage**.
2. Add a Web app in project settings; copy its config into `.env` (see `.env.example`).
3. Paste `firestore.rules` and `storage.rules` into the Rules tab of Firestore and Storage (or `firebase deploy --only firestore:rules,storage`).
4. `npm install && npm run dev`

## Data model (all under `users/{uid}`)
- `transactions/{id}`: title, category, amount (positive), type (`expense`|`income`), date (`YYYY-MM-DD`), recurrence `{freq: none|weekly|biweekly|monthly, day}`, notes, photoUrl, createdAt
- `meta/settings`: savingsGoal, categories[]

A recurring entry is stored once; the dashboard expands it into every occurrence in the selected period.
