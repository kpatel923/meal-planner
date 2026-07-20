import { useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'
import Onboarding from '../Onboarding'
import {
  ShoppingCart, Bookmark,
  BookOpen, User, LogOut, ChefHat,
  Sun, Moon, Sparkles, Users, Menu, X, ChevronRight, Home
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/today',     label: 'Today',       icon: Home         },
  { to: '/grocery',   label: 'Grocery',     icon: ShoppingCart },
  { to: '/saved',     label: 'Saved',       icon: Bookmark     },
  { to: '/recipes',   label: 'Recipes',     icon: BookOpen     },
  { to: '/ai',        label: 'AI Chef',     icon: Sparkles     },
  { to: '/household', label: 'Household',   icon: Users        },
  { to: '/profile',   label: 'Profile',     icon: User         },
]

const MOBILE_NAV = [
  { to: '/today',     label: 'Today',     icon: Home         },
  { to: '/grocery',   label: 'Grocery',   icon: ShoppingCart },
  { to: '/ai',        label: 'AI Chef',   icon: Sparkles     },
  { to: '/recipes',   label: 'Recipes',   icon: BookOpen     },
]

const MORE_ITEMS = [
  { to: '/saved',     label: 'Saved plans', icon: Bookmark },
  { to: '/household', label: 'Household',   icon: Users    },
  { to: '/profile',   label: 'Profile',     icon: User     },
]

export default function AppLayout() {
  const { user, profile, signOut } = useAuth()
  const ONBOARDING_DISMISS_KEY = 'mealplan_onboarding_dismissed'
  const [dismissedOnboarding, setDismissedOnboarding] = useState(() => {
    try { return localStorage.getItem(ONBOARDING_DISMISS_KEY) === 'true' } catch { return false }
  })
  const showOnboarding = profile && profile.onboarding_done === false && !dismissedOnboarding
  const { isDark, toggle } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  function handleOnboardingComplete() {
    try { localStorage.setItem(ONBOARDING_DISMISS_KEY, 'true') } catch {}
    setDismissedOnboarding(true)
    // Land on the planner so they can generate their first week immediately
    // (their starter recipes are now in the library).
    navigate('/planner')
  }

  const [moreOpen, setMoreOpen] = useState(false)

  async function handleSignOut() { await signOut(); navigate('/auth') }

  const initials = (profile?.username || user?.email || 'U').charAt(0).toUpperCase()
  const username = profile?.username || user?.email?.split('@')[0] || 'User'

  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ background: 'var(--bg)' }}>

      {/* ── Desktop Sidebar — flat, light surface, Apple Settings/Finder style ── */}
      <aside className="hidden lg:flex flex-col w-60 xl:w-64 shrink-0 h-screen sticky top-0"
        style={{
          background: 'var(--surface)',
          borderRight: '1px solid var(--border)',
        }}>

        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-6">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'var(--brand)' }}>
            <ChefHat size={18} className="text-white" />
          </div>
          <p className="font-display font-semibold" style={{ fontSize: '16px', letterSpacing: '-0.03em', color: 'var(--text)' }}>
            MealPlan
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium transition-all duration-150 relative group">
              {({ isActive }) => (
                <>
                  <div className="absolute inset-0 rounded-xl transition-all duration-150"
                    style={{ background: isActive ? 'var(--surface-3)' : 'transparent' }} />
                  <Icon size={18} strokeWidth={isActive ? 2.3 : 1.8}
                    style={{ color: isActive ? 'var(--brand)' : 'var(--text-2)', flexShrink: 0, position: 'relative' }}
                  />
                  <span style={{ fontSize: '14px', letterSpacing: '-0.01em', color: isActive ? 'var(--text)' : 'var(--text-2)', fontWeight: isActive ? 600 : 500, position: 'relative' }}>
                    {label}
                  </span>
                  {to === '/ai' && (
                    <span className="ml-auto font-semibold rounded-full px-1.5 py-0.5 relative"
                      style={{ fontSize: '9px', background: 'var(--brand)', color: '#fff', letterSpacing: '0.02em' }}>
                      NEW
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom — theme + user */}
        <div className="px-3 pb-5 space-y-1.5" style={{ borderTop: '1px solid var(--border)', paddingTop: '14px' }}>

          <button onClick={toggle}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-150"
            style={{ color: 'var(--text-2)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            {isDark ? <Sun size={17} /> : <Moon size={17} />}
            <span style={{ fontSize: '14px', fontWeight: 500 }}>
              {isDark ? 'Light mode' : 'Dark mode'}
            </span>
          </button>

          <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl" style={{ background: 'var(--surface-2)' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0"
              style={{ background: 'var(--brand)' }}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate" style={{ fontSize: '13px', color: 'var(--text)' }}>
                {username}
              </p>
              <p className="truncate" style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                {user?.email}
              </p>
            </div>
            <button onClick={handleSignOut} title="Sign out"
              className="p-1.5 rounded-lg transition-all"
              style={{ color: 'var(--text-3)' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)' }}>
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────── */}
      <main className="flex-1 min-w-0 lg:pb-0 safe-top main-scroll" style={{ overflowX: 'hidden' }}>
        <div key={location.pathname} style={{ animation: 'pageIn 0.32s cubic-bezier(0.22,1,0.36,1)' }}>
          <Outlet />
        </div>
      </main>

      {/* ── Mobile bottom nav — floating pill bar ────────────── */}
      {/* Fade scrim: content dissolves into the background as it nears the bar */}
      <div className="lg:hidden fixed inset-x-0 bottom-0 z-40" aria-hidden="true"
        style={{
          height: 'calc(env(safe-area-inset-bottom) + 92px)',
          background: 'linear-gradient(to top, var(--bg) 38%, transparent)',
          pointerEvents: 'none',
        }} />
      <nav className="lg:hidden fixed inset-x-0 z-50 safe-bottom"
        style={{ bottom: 0, padding: '0 14px calc(env(safe-area-inset-bottom) + 12px)', pointerEvents: 'none' }}>
        <div className="nav-glass flex items-center justify-around"
          style={{
            borderRadius: 24,
            padding: 8,
            pointerEvents: 'auto',
          }}>
          {MOBILE_NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className="flex-1">
              {({ isActive }) => (
                <div className="flex flex-col items-center gap-1 tap-target transition-all duration-250"
                  style={{
                    padding: '8px 6px', borderRadius: 15,
                    background: isActive ? 'var(--accent-light)' : 'transparent',
                  }}>
                  <div className="relative">
                    <Icon size={21} strokeWidth={isActive ? 2.4 : 1.8}
                      style={{ color: isActive ? 'var(--accent-dark)' : 'var(--text-3)' }} />
                    {to === '/ai' && !isActive && (
                      <div className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
                    )}
                  </div>
                  <span className="font-display" style={{ fontSize: '9.5px', fontWeight: isActive ? 700 : 600, color: isActive ? 'var(--accent-dark)' : 'var(--text-3)' }}>
                    {label}
                  </span>
                </div>
              )}
            </NavLink>
          ))}
          <button onClick={() => setMoreOpen(true)} className="flex-1">
            <div className="flex flex-col items-center gap-1 tap-target transition-all duration-250"
              style={{ padding: '8px 6px', borderRadius: 15, background: moreOpen ? 'var(--accent-light)' : 'transparent' }}>
              <Menu size={21} strokeWidth={moreOpen ? 2.4 : 1.8} style={{ color: moreOpen ? 'var(--accent-dark)' : 'var(--text-3)' }} />
              <span className="font-display" style={{ fontSize: '9.5px', fontWeight: moreOpen ? 700 : 600, color: moreOpen ? 'var(--accent-dark)' : 'var(--text-3)' }}>
                More
              </span>
            </div>
          </button>
        </div>
      </nav>

      {/* ── Mobile "More" sheet ──────────────────────────────── */}
      {moreOpen && (
        <div className="lg:hidden">
          <div className="sheet-backdrop" onClick={() => setMoreOpen(false)} />
          <div className="sheet-panel" role="dialog" aria-modal="true" aria-label="More">
            <div className="sheet-grip" />
            <div className="flex items-center justify-between px-5 pt-1 pb-3">
              <h3 className="font-display font-semibold" style={{ fontSize: 16, color: 'var(--text)' }}>More</h3>
              <button onClick={() => setMoreOpen(false)} aria-label="Close"
                className="flex items-center justify-center rounded-lg tap-target"
                style={{ width: 32, height: 32, color: 'var(--text-3)' }}>
                <X size={18} />
              </button>
            </div>
            <div className="px-3 pb-5">
              {MORE_ITEMS.map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 px-3 py-3.5 rounded-xl tap-target transition-all"
                  style={{ color: 'var(--text)' }}>
                  <Icon size={19} style={{ color: 'var(--text-3)' }} />
                  <span style={{ fontSize: 14.5, fontWeight: 500, flex: 1 }}>{label}</span>
                  <ChevronRight size={16} style={{ color: 'var(--text-3)' }} />
                </NavLink>
              ))}
              <button onClick={() => { toggle(); }}
                className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl tap-target transition-all"
                style={{ color: 'var(--text)' }}>
                {isDark ? <Sun size={19} style={{ color: 'var(--text-3)' }} /> : <Moon size={19} style={{ color: 'var(--text-3)' }} />}
                <span style={{ fontSize: 14.5, fontWeight: 500, flex: 1, textAlign: 'left' }}>{isDark ? 'Light mode' : 'Dark mode'}</span>
              </button>
              <button onClick={() => { setMoreOpen(false); handleSignOut(); }}
                className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl tap-target transition-all"
                style={{ color: 'var(--danger)' }}>
                <LogOut size={19} />
                <span style={{ fontSize: 14.5, fontWeight: 500, flex: 1, textAlign: 'left' }}>Sign out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showOnboarding && <Onboarding onComplete={handleOnboardingComplete} />}
    </div>
  )
}
