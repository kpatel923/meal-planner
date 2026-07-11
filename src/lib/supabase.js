import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY

// Log clearly so the developer can see in the console what's missing
if (!supabaseUrl || !supabaseKey) {
  console.error(
    '⚠️  Supabase env vars missing!\n' +
    'Make sure .env.local exists in the project root and contains:\n' +
    '  VITE_SUPABASE_URL=https://your-project.supabase.co\n' +
    '  VITE_SUPABASE_ANON_KEY=eyJ...\n\n' +
    `Current values:\n  URL: ${supabaseUrl || '❌ MISSING'}\n  KEY: ${supabaseKey ? '✅ present' : '❌ MISSING'}`
  )
}

export const supabase = createClient(
  supabaseUrl  || 'https://placeholder.supabase.co',
  supabaseKey  || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'implicit',
    },
  }
)

export const isMisconfigured = !supabaseUrl || !supabaseKey
