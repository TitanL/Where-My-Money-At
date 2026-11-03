# 🐱💰 Where My Money At?

A mobile-first personal finance tracker for logging income and spending, spotting where your money goes, and planning your savings. Sign in on any device and your data syncs through the cloud.

<img width="561" height="916" alt="image" src="https://github.com/user-attachments/assets/b4f0cbdf-4c18-4150-92ec-b4964737bd23" />


**Live demo:** (https://personalexpensetracker-6cfa5.web.app) Try out Guest Mode!

## Features

**Dashboard**
- Income, expenses, net, and savings rate at a glance, with a Monthly / All Time toggle
- Donut chart split by spending category, using each category's own color
- Tap a donut slice or a "Spending by Category" bar to see that category's name and total
- Recent Entries (up to 25 per month, with Show more / Show less), editable and filterable by category

**Entries**
- Title, category, amount, expense/income toggle, date picker, and notes
- Recurrence options, including a custom day-of-week picker
- Receipt photo attachments, compressed and stored in Firestore

**Recurring Bills**
- Dedicated screen for recurring entries with a Net Recurring total

**Savings Calculator**
- Pick Needs and Wants categories to see what share of the month's income they use
- Set a savings target as either an amount or a percentage

**Import**
- Bring in bank CSV files, map the columns, and categorize the rows

**Settings and customization**
- Create and edit categories with custom colors (the Income category can be edited but not deleted)
- Three themes: Coffee, Matcha, and Ube, saved between sessions
- Smooth sidebar and add-entry animations

## How income and spending are counted

Only entries in the **Income** category count as income. Everything else counts as spending, so a payback in a spending category reduces that category's total instead of inflating income.

## Tech Stack

- **Frontend:** React, Vite
- **Backend:** Firebase (Authentication and Firestore, on the free Spark plan)

## Getting Started

### Prerequisites
- Node.js 18+

### Installation

```bash
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>
npm install
```

### Run

```bash
npm run dev
```

Then open the local URL Vite prints (usually `http://localhost:5173`).

## Design

A warm, earthy palette of tans, browns, and mustard yellow with muted category colors, built for one-handed use on a phone.
