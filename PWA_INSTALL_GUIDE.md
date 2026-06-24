# Install MealPlan on your iPhone (free, no App Store)

Your app is now a **PWA** (Progressive Web App). Once it's hosted online, you
can add it to your home screen and it opens fullscreen like a native app — its
own icon, no Safari address bar, offline support. No App Store, no Apple
Developer account ($99/yr), no cost.

## What I added to make this work
- `public/sw.js` — a service worker (offline + installability)
- `public/icon-192.png`, `icon-512.png`, `apple-touch-icon.png` — the app icons
- Service-worker registration in `src/main.jsx` (production only)
- `public/manifest.json` and the meta tags in `index.html` were already set up

## Step 1 — Deploy it free (one time)

A PWA must be served over HTTPS to be installable. Localhost won't install on
your phone. Easiest free hosts: **Vercel** or **Netlify**. Vercel steps:

1. Push your project to a GitHub repo (or use the Vercel CLI).
2. Go to vercel.com, "Add New → Project", import the repo.
3. Framework preset: **Vite**. Build command `npm run build`, output dir `dist`.
4. Add your environment variables (the same ones from your `.env`):
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
5. Deploy. You'll get a URL like `https://meal-planner-xxx.vercel.app`.

(Netlify is nearly identical: "Add new site → Import", build `npm run build`,
publish dir `dist`, add the same env vars.)

CLI alternative, from the project folder:
```bash
npm i -g vercel
vercel        # follow prompts; set the two env vars when asked
vercel --prod
```

## Step 2 — Install on iPhone

1. Open the deployed URL in **Safari** (must be Safari, not Chrome, on iOS).
2. Tap the **Share** button (square with an up arrow).
3. Scroll down, tap **Add to Home Screen**.
4. Name it "MealPlan", tap **Add**.

You'll get the app icon on your home screen. Tapping it opens fullscreen with
no browser chrome — it looks and feels like a native app.

## Notes
- Updates: when you deploy a new version, the app updates automatically next
  time it's opened online (the service worker fetches the latest).
- The service worker only runs in the production build, so `npm run dev`
  locally is unaffected.
- Offline: the app shell loads offline; live data (meals, plans) still needs a
  connection, but the grocery page already caches your last list for offline use.
- If you later want it in the actual App Store, that's the paid Apple Developer
  route — but for personal use on your own phone, this PWA approach is the way.
