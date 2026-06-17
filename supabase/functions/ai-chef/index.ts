// Supabase Edge Function: ai-chef
// Securely proxies requests to the Groq API using a server-side secret key.
// The frontend NEVER sees the API key — it only talks to this function.
// Groq free tier: generous rate limits, no credit card required, no regional gating.

import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY")
const MODEL = "llama-3.3-70b-versatile"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (!GROQ_API_KEY) {
    return new Response(
      JSON.stringify({ error: "GROQ_API_KEY not configured on the server. Run: supabase secrets set GROQ_API_KEY=your_key" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }

  try {
    const { prompt, maxTokens } = await req.json()

    if (!prompt || typeof prompt !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'prompt' field" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens || 400,
        temperature: 0.8,
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
        return new Response(
          JSON.stringify({ error: `Groq rate limit (429): ${detail}` }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      return new Response(
        JSON.stringify({ error: `Groq API error: ${groqRes.status} ${detail}` }),
        { status: groqRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const data = await groqRes.json()

    // OpenAI-compatible response shape: data.choices[0].message.content
    const text = data.choices?.[0]?.message?.content || ""

    if (!text && data.choices?.[0]?.finish_reason) {
      return new Response(
        JSON.stringify({ error: `Groq returned no content (reason: ${data.choices[0].finish_reason})` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    return new Response(
      JSON.stringify({ text }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `Edge function error: ${err.message}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
