import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // ── Seed default meals for brand new users ──────────────────
  // ── Fetch profile ───────────────────────────────────────────
  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data)
  }

  // ── On mount: check for existing session ───────────────────
  useEffect(() => {
    let done = false
    const finish = () => { if (!done) { done = true; setLoading(false) } }

    // Safety net: never let the app hang on the loading screen. If the session
    // check is slow or fails (common on a cold PWA launch), render anyway.
    const safety = setTimeout(finish, 4000)

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        const u = session?.user ?? null
        setUser(u)
        // Unblock the UI immediately; load profile/seed in the background so a
        // slow profile fetch can't keep the whole app on the loading screen.
        finish()
        if (u) {
          fetchProfile(u.id).catch(() => {})
        }
      })
      .catch(() => finish())   // network/auth error → still render the app
      .finally(() => clearTimeout(safety))

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const u = session?.user ?? null
        setUser(u)
        if (u) {
          fetchProfile(u.id).catch(() => {})
        } else {
          setProfile(null)
        }
        finish()
      }
    )

    return () => { clearTimeout(safety); subscription.unsubscribe() }
  }, [])

  // ── Auth actions ────────────────────────────────────────────
  async function signUp(email, password, fullName) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    return { data, error }
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  }

  async function signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    return { data, error }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function updateProfile(updates) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()
    if (!error) setProfile(data)
    return { data, error }
  }

  const value = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    updateProfile,
    refetchProfile: () => user && fetchProfile(user.id),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
