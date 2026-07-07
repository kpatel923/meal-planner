# Push Notifications — Setup (Phase 1)

This gets ONE reminder working: a weekly "time to plan" push. Once it lands on
your phone, we expand to meal reminders etc.

## Overview of the pieces
- Front-end asks permission + saves a subscription (done, in the app)
- `push_subscriptions` table stores subscriptions (SQL below)
- `send-reminders` Edge Function sends the push (deploy below)
- A scheduled cron calls the function weekly (below)

────────────────────────────────────────────────────────
## Step 1 — Generate VAPID keys (one time)

VAPID keys identify your server to Apple/Google push services. Generate once:

```bash
npx web-push generate-vapid-keys
```

You'll get a **Public Key** and **Private Key**. Keep them handy.

────────────────────────────────────────────────────────
## Step 2 — Add the public key to the app

In Vercel → your project → Settings → Environment Variables, add:

    VITE_VAPID_PUBLIC_KEY = <the public key>

Also add it to your local `.env.local` the same way. Redeploy after.

────────────────────────────────────────────────────────
## Step 3 — Create the table

Supabase → SQL Editor → paste the contents of
`supabase/migrations/0003_push_subscriptions.sql` → Run.

────────────────────────────────────────────────────────
## Step 4 — Set the function secrets

In your terminal (linked to your Supabase project):

```bash
supabase secrets set VAPID_PUBLIC_KEY=<public key>
supabase secrets set VAPID_PRIVATE_KEY=<private key>
supabase secrets set VAPID_SUBJECT=mailto:youremail@example.com
```

(SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.)

────────────────────────────────────────────────────────
## Step 5 — Deploy the function

```bash
supabase functions deploy send-reminders
```

────────────────────────────────────────────────────────
## Step 6 — Turn on reminders in the app

1. Open the installed app on your iPhone (must be the home-screen PWA, iOS 16.4+).
2. Go to Profile → Reminders → toggle on. Accept the permission prompt.
3. This saves your device's subscription to Supabase.

────────────────────────────────────────────────────────
## Step 7 — Test it immediately (don't wait for Sunday)

Manually invoke the function to confirm a push lands:

```bash
curl -X POST 'https://<your-project-ref>.functions.supabase.co/send-reminders' \
  -H 'Authorization: Bearer <your-anon-key>' \
  -H 'Content-Type: application/json' \
  -d '{"title":"Test","body":"If you see this, push works!"}'
```

You should get a notification within seconds. The response shows `{ sent: N }`.

────────────────────────────────────────────────────────
## Step 8 — Schedule it weekly

In Supabase → Database → Cron (or the pg_cron extension), schedule a call to the
function every Sunday morning. Example (Supabase Dashboard → Integrations → Cron):

- Name: weekly-plan-reminder
- Schedule: `0 9 * * 0`  (Sundays at 9am UTC — adjust for your timezone)
- Type: HTTP request → POST to your send-reminders function URL, with the
  Authorization: Bearer <anon-key> header.

That's it. Once the test in Step 7 works, the weekly schedule will just work.

────────────────────────────────────────────────────────
## Troubleshooting
- Nothing arrives on iPhone: confirm you opened the HOME-SCREEN app (not Safari),
  iOS is 16.4+, and permission shows "granted".
- `sent: 0`: no subscriptions saved — toggle reminders on in Profile first.
- Function 500 about VAPID: secrets not set (Step 4) or not redeployed (Step 5).
