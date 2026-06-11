# 🍽 Meal Planner

A full-stack, responsive meal planning web app with user authentication, personal recipe libraries, weekly plan generation, grocery lists, and PDF export.

**Stack:** React + Vite · Tailwind CSS · Supabase (Auth + PostgreSQL + Storage) · Vercel

---

## ✅ Features

- 🔐 Email + Google sign-in (per-user data, fully isolated)
- 📅 Smart weekly meal plan generator (optimizes for shared ingredients)
- 🥦 Diet filters: Veg / Vegan / Non-Veg
- 📖 Personal recipe library with add, edit, delete
- 📥 Import recipes from JSON or CSV
- 📤 Export recipes to JSON or CSV
- 🛒 Interactive grocery checklist with progress tracking
- ⭐ Save and reload named weekly plans
- 📄 Export any plan to a formatted PDF
- 📱 Fully responsive — mobile, tablet, desktop
- 💾 PWA installable on iOS and Android home screen

---

## 🚀 Setup Guide (Step by Step)

### Step 1 — Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up for free
2. Click **"New project"**
3. Choose a name (e.g. `meal-planner`), set a database password, pick a region close to you
4. Wait ~2 minutes for the project to spin up

### Step 2 — Run the Database Schema

1. In your Supabase project, click **"SQL Editor"** in the left sidebar
2. Click **"New query"**
3. Open the file `supabase_schema.sql` from this project
4. Paste the entire contents into the SQL editor
5. Click **"Run"** (or press Ctrl+Enter)
6. You should see: `Success. No rows returned`

### Step 3 — Enable Google OAuth (optional but recommended)

1. In Supabase → **Authentication** → **Providers**
2. Find **Google** and toggle it on
3. Go to [console.cloud.google.com](https://console.cloud.google.com)
4. Create a new project → **APIs & Services** → **Credentials**
5. Create an **OAuth 2.0 Client ID** (Web application)
6. Add your Supabase callback URL as an authorized redirect:
   `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
7. Copy the Client ID and Client Secret back into Supabase → Google provider settings
8. Save

> Skip this if you only want email/password login — it works without Google.

### Step 4 — Get your Supabase API keys

1. In Supabase → **Settings** → **API**
2. Copy:
   - **Project URL** (looks like `https://abcxyz.supabase.co`)
   - **anon / public key** (the long JWT string)

### Step 5 — Set up the project locally

```bash
# Clone or download this project, then:
cd meal-planner
npm install

# Create your environment file
cp .env.example .env.local
```

Open `.env.local` and fill in your keys:
```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Step 6 — Run locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) — sign up with a new account and the app will auto-seed your meal library.

---

## 🌐 Deploy to Vercel (Free)

### Step 7 — Push to GitHub

1. Create a new repository on [github.com](https://github.com)
2. In the project folder:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/meal-planner.git
git push -u origin main
```

### Step 8 — Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign up (free) — log in with GitHub
2. Click **"Add New Project"**
3. Import your `meal-planner` GitHub repository
4. Under **"Environment Variables"**, add both:
   - `VITE_SUPABASE_URL` → your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` → your anon key
5. Click **"Deploy"**
6. Vercel gives you a live URL like `https://meal-planner-xyz.vercel.app`

### Step 9 — Add your Vercel URL to Supabase

1. In Supabase → **Authentication** → **URL Configuration**
2. Set **Site URL** to your Vercel URL (e.g. `https://meal-planner-xyz.vercel.app`)
3. Add the same URL to **Redirect URLs**
4. If using Google OAuth, also add this redirect URL in your Google Cloud Console

---

## 📲 Install as a PWA (mobile)

After deploying:
- **iPhone/iPad:** Open in Safari → Share → "Add to Home Screen"
- **Android:** Open in Chrome → menu → "Add to Home screen" (or Chrome will prompt automatically)

---

## 📁 Project Structure

```
meal-planner/
├── public/
│   ├── manifest.json         # PWA manifest
│   └── favicon.svg
├── src/
│   ├── components/
│   │   └── layout/
│   │       ├── AppLayout.jsx  # Sidebar (desktop) + bottom nav (mobile)
│   │       └── LoadingScreen.jsx
│   ├── hooks/
│   │   ├── useAuth.jsx        # Auth context + session management
│   │   ├── useMeals.js        # Meal CRUD operations
│   │   └── usePlans.js        # Saved plans CRUD
│   ├── lib/
│   │   ├── supabase.js        # Supabase client
│   │   ├── mealLogic.js       # Plan generation algorithm
│   │   ├── pdfExport.js       # PDF generation
│   │   ├── importExport.js    # JSON/CSV import & export
│   │   └── seedMeals.js       # Default 120 meals for new users
│   ├── pages/
│   │   ├── AuthPage.jsx       # Login / signup
│   │   ├── PlannerPage.jsx    # Weekly meal plan builder
│   │   ├── RecipesPage.jsx    # Recipe library (CRUD + import/export)
│   │   ├── GroceryPage.jsx    # Interactive grocery checklist
│   │   ├── SavedPage.jsx      # Saved plans viewer
│   │   └── ProfilePage.jsx    # User settings + data export
│   ├── styles/
│   │   └── index.css          # Tailwind + global styles
│   ├── App.jsx                # Routing + auth providers
│   └── main.jsx               # React entry point
├── supabase_schema.sql        # Run this in Supabase SQL editor
├── vercel.json                # Vercel SPA routing config
├── .env.example               # Copy to .env.local
├── tailwind.config.js
├── vite.config.js
└── package.json
```

---

## 🔄 Import / Export Format

### JSON format
```json
[
  {
    "item_name": "Avocado Toast",
    "category": "Breakfast",
    "ingredients": "bread, avocado, olive oil, salt",
    "diet_type": "vegan",
    "notes": "https://example.com/recipe"
  }
]
```

### CSV format
```csv
item_name,category,ingredients,diet_type,notes
Avocado Toast,Breakfast,"bread, avocado, olive oil, salt",vegan,
Chicken Salad,Lunch,"chicken, lettuce, olive oil",nonveg,
```

**Valid categories:** `Breakfast`, `Lunch`, `Dinner`, `Snack`
**Valid diet types:** `veg`, `vegan`, `nonveg`

---

## 🛠 Local Development

```bash
npm run dev      # Start dev server at localhost:5173
npm run build    # Build for production
npm run preview  # Preview production build locally
```

---

## 🔒 Security Notes

- **Never commit `.env.local`** — it's in `.gitignore`
- The Supabase anon key is safe to use in frontend code — it's public by design
- Row Level Security (RLS) is enabled on all tables — users can only access their own data
- The database enforces isolation at the SQL level, not just the application level

---

## 💡 Tips

- After deploying, every `git push` to `main` auto-deploys on Vercel
- You can add a custom domain in Vercel → Project → Settings → Domains
- To reset a user's meal library, delete their rows in the `meals` table — they'll be re-seeded on next login
- The grocery list is stored in `sessionStorage` — it resets when the browser tab is closed
