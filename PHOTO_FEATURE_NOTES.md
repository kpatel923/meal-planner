# Photo → Recipe feature (AI Chef page)

Snap or upload a photo of a meal; Groq's vision model identifies the dish,
its likely ingredients, diet type, category, and a short description, then
routes it into the existing "Review before adding" modal so you can edit and
save it to your library. Nutrition is auto-estimated from the identified
ingredients, exactly like every other recipe (no DB changes).

## How it works
1. **UI** (`src/pages/AISuggestionsPage.jsx`): a "Snap a meal" card opens the
   camera/file picker (`<input type="file" accept="image/*" capture="environment">`).
2. **Compression** (`src/lib/imageUtils.js`): the photo is downscaled to 1024px
   longest edge and re-encoded as JPEG (~0.82 quality) so the upload is small
   and fast — phone photos are often several MB.
3. **Analysis** (`src/lib/aiFeatures.js` → `analyzeMealPhoto`): sends the image
   to the `ai-chef` edge function and parses the JSON result.
4. **Edge function** (`supabase/functions/ai-chef/index.ts`): now accepts an
   optional `imageBase64`. When present it uses the vision model
   `meta-llama/llama-4-scout-17b-16e-instruct` and sends an OpenAI-style
   image content block. Text-only requests are unchanged (fully backward compatible).
5. **Review modal**: pre-filled with the analysis, shows the photo thumbnail,
   and offers "Find recipe on YouTube / Google" quick links built from the
   AI's suggested search query. Paste a link back in to save it with the recipe.

## Deploying the updated edge function
The vision model needs the same `GROQ_API_KEY` secret you already use — no new
key required. Just redeploy the function so the new code is live:

```bash
supabase functions deploy ai-chef
```

(If you've never deployed it: `supabase link` your project first, and ensure
`supabase secrets set GROQ_API_KEY=your_key` has been run once.)

## Notes & limits
- Nutrition still comes from `estimateNutrition()` matching the identified
  ingredients against its lookup table — so common dishes get good estimates,
  unusual ingredients may show no calories (same behavior as the rest of the app).
- The vision model's read is a best-effort guess; the Review step exists so you
  can correct the dish name, ingredients, or diet type before saving.
- Groq free tier covers this (Llama 4 Scout, ~$0 for personal use). Llama 4
  Maverick was deprecated in March 2026 — Scout is the current vision model.
