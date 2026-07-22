// Supabase Edge Function: ai-chef
// Securely proxies requests to the Groq API using a server-side secret key.
// The frontend NEVER sees the API key — it only talks to this function.
// Groq free tier: generous rate limits, no credit card required, no regional gating.
//
// Supports two request shapes:
//   1. Text:   { prompt: string, maxTokens?: number }
//   2. Vision: { prompt: string, imageBase64: string, maxTokens?: number }
//      imageBase64 may be a raw base64 string or a full data URL.

import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY")
// Groq deprecated llama-3.3-70b-versatile and llama-4-scout (June 2026).
// Migrated to current models: gpt-oss-120b for text, qwen3.6-27b for vision.
const TEXT_MODEL   = "openai/gpt-oss-120b"
const VISION_MODEL = "qwen/qwen3.6-27b"

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

// ── Fetch real page metadata for a URL ──────────────────────────────
// Returns { title, description, siteName } pulled from oEmbed (YouTube) or
// the page's Open Graph / <title> tags. This is what makes URL auto-fill
// accurate: we read the actual page instead of guessing from the link text.
async function fetchUrlMeta(url: string) {
  const out = { title: "", description: "", siteName: "" }

  // YouTube: official oEmbed endpoint, no API key, returns the real title.
  if (/youtube\.com|youtu\.be/i.test(url)) {
    try {
      const o = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`)
      if (o.ok) {
        const d = await o.json()
        out.title = d.title || ""
        out.siteName = "YouTube"
        out.description = d.author_name ? `by ${d.author_name}` : ""
        return out
      }
    } catch { /* fall through to generic fetch */ }
  }

  // Generic: fetch the HTML and read OG tags + <title>.
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MealPlanBot/1.0)" },
      redirect: "follow",
    })
    if (!res.ok) return out
    const html = (await res.text()).slice(0, 200_000) // cap for safety

    const pick = (re: RegExp) => { const m = html.match(re); return m ? m[1].trim() : "" }
    const ogTitle = pick(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
      || pick(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)
    const ogDesc = pick(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)
      || pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
    const ogSite = pick(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i)
    const titleTag = pick(/<title[^>]*>([^<]+)<\/title>/i)

    // Decode the few HTML entities that commonly appear in titles.
    const decode = (s: string) => s
      .replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'")
      .replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">")

    out.title = decode(ogTitle || titleTag)
    out.description = decode(ogDesc)
    out.siteName = decode(ogSite)
  } catch { /* return whatever we have */ }

  return out
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (!GROQ_API_KEY) {
    return json({ error: "GROQ_API_KEY not configured on the server. Run: supabase secrets set GROQ_API_KEY=your_key" }, 500)
  }

  try {
    const { prompt, maxTokens, imageBase64, fetchUrl, jsonMode } = await req.json()

    // ── URL metadata fetch path ──────────────────────────────────
    if (fetchUrl && typeof fetchUrl === "string") {
      const meta = await fetchUrlMeta(fetchUrl)
      return json({ meta })
    }

    if (!prompt || typeof prompt !== "string") {
      return json({ error: "Missing or invalid 'prompt' field" }, 400)
    }

    const hasImage = typeof imageBase64 === "string" && imageBase64.length > 0
    const model = hasImage ? VISION_MODEL : TEXT_MODEL

    // Normalise the image into a data URL the model accepts.
    let imageUrl = ""
    if (hasImage) {
      imageUrl = imageBase64.startsWith("data:")
        ? imageBase64
        : `data:image/jpeg;base64,${imageBase64}`
    }

    // Build the message content: a plain string for text, or an array of
    // content blocks (text + image) for vision — both OpenAI-compatible.
    const messages = hasImage
      ? [{
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        }]
      : [{ role: "user", content: prompt }]

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens || 400,
        temperature: hasImage ? 0.4 : 0.8, // lower temp for factual image reads
        // JSON mode: qwen3.6-27b supports response_format, which forces valid
        // JSON instead of prose/reasoning that we'd have to salvage by parsing.
        ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
    })

    if (!groqRes.ok) {
      const errText = await groqRes.text()
      let detail = errText
      try {
        const parsed = JSON.parse(errText)
        detail = parsed?.error?.message || errText
      } catch { /* not JSON, use raw text */ }

      if (groqRes.status === 429) {
        return json({ error: `Groq rate limit (429): ${detail}` }, 429)
      }
      return json({ error: `Groq API error: ${groqRes.status} ${detail}` }, groqRes.status)
    }

    const data = await groqRes.json()
    const msg = data.choices?.[0]?.message
    const finish = data.choices?.[0]?.finish_reason
    // Reasoning models may leave `content` empty and put text in `reasoning`.
    let text = msg?.content || ""
    if (!text && typeof msg?.reasoning === "string") text = msg.reasoning

    if (!text) {
      const why = finish === "length"
        ? "ran out of tokens (try a shorter prompt or higher max_tokens)"
        : `reason: ${finish || "unknown"}`
      return json({ error: `Groq returned no content (${why})` }, 502)
    }

    // _debug helps verify the image actually reached the function and which
    // model ran. Harmless to leave in; the client only reads `text`.
    return json({
      text,
      _debug: {
        receivedImage: hasImage,
        model,
        imageChars: hasImage ? imageBase64.length : 0,
        finish,
        jsonMode: !!jsonMode,
        usedReasoningField: !msg?.content && !!msg?.reasoning,
      },
    })
  } catch (err) {
    return json({ error: `Edge function error: ${err.message}` }, 500)
  }
})
