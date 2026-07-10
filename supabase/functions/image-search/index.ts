// Supabase Edge Function: image-search
// Fetches a real, relevant food photo for a dish name via the Pexels API.
// The Pexels API key lives server-side only (set as a Supabase secret).
// Request:  { query: string }
// Response: { url: string | null, photographer?: string, source: 'pexels' }

import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const PEXELS_API_KEY = Deno.env.get("PEXELS_API_KEY")

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    if (!PEXELS_API_KEY) {
      return json({ url: null, error: "Image search not configured" }, 200)
    }

    const { query } = await req.json()
    if (!query || !String(query).trim()) {
      return json({ url: null, error: "No query provided" }, 200)
    }

    // Bias the query toward appetizing food photography.
    const q = encodeURIComponent(`${String(query).trim()} food dish`)
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${q}&per_page=8&orientation=landscape`,
      { headers: { Authorization: PEXELS_API_KEY } },
    )

    if (!res.ok) {
      return json({ url: null, error: `Pexels ${res.status}` }, 200)
    }

    const data = await res.json()
    const photos = data.photos || []
    if (!photos.length) return json({ url: null, source: "pexels" }, 200)

    // Prefer a mid-size, well-shaped photo. Pexels 'large' is ~940px wide.
    const pick = photos[0]
    const url = pick?.src?.large || pick?.src?.medium || pick?.src?.original || null

    return json({
      url,
      photographer: pick?.photographer || "",
      source: "pexels",
    })
  } catch (e) {
    return json({ url: null, error: String(e?.message || e) }, 200)
  }
})
