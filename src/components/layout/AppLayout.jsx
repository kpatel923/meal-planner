import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'
import Onboarding from '../Onboarding'
import {
  CalendarDays, ShoppingCart, Bookmark,
  BookOpen, User, LogOut, ChefHat,
  Sun, Moon, Sparkles, Users, Menu, X, ChevronRight
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/planner',   label: 'Planner',     icon: CalendarDays },
  { to: '/grocery',   label: 'Grocery',     icon: ShoppingCart },
  { to: '/saved',     label: 'Saved',       icon: Bookmark     },
  { to: '/recipes',   label: 'Recipes',     icon: BookOpen     },
  { to: '/ai',        label: 'AI Chef',     icon: Sparkles     },
  { to: '/household', label: 'Household',   icon: Users        },
  { to: '/profile',   label: 'Profile',     icon: User         },
]

const MOBILE_NAV = [
  { to: '/planner',   label: 'Plan',      icon: CalendarDays },
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

  function handleOnboardingComplete() {
    try { localStorage.setItem(ONBOARDING_DISMISS_KEY, 'true') } catch {}
    setDismissedOnboarding(true)
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
      <main className="flex-1 min-w-0 pb-28 lg:pb-0" style={{ overflowX: 'hidden' }}>
        <Outlet />
      </main>

      {/* ── Mobile bottom nav ────────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 glass safe-bottom"
        style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-stretch">
          {MOBILE_NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-all duration-200">
              {({ isActive }) => (
                <>
                  <div className="relative" style={{ transform: isActive ? 'scale(1.08)' : 'scale(1)', transition: 'transform 0.2s ease' }}>
                    <Icon size={21} strokeWidth={isActive ? 2.4 : 1.7}
                      style={{ color: isActive ? 'var(--brand)' : 'var(--text-3)' }} />
                    {to === '/ai' && !isActive && (
                      <div className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full"
                        style={{ background: 'var(--brand)' }} />
                    )}
                  </div>
                  <span className="font-medium" style={{ fontSize: '10px', letterSpacing: '-0.005em', color: isActive ? 'var(--brand)' : 'var(--text-3)' }}>
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
          <button onClick={() => setMoreOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-all duration-200">
            <div className="relative" style={{ transform: moreOpen ? 'scale(1.08)' : 'scale(1)', transition: 'transform 0.2s ease' }}>
              <Menu size={21} strokeWidth={moreOpen ? 2.4 : 1.7}
                style={{ color: moreOpen ? 'var(--brand)' : 'var(--text-3)' }} />
            </div>
            <span className="font-medium" style={{ fontSize: '10px', letterSpacing: '-0.005em', color: moreOpen ? 'var(--brand)' : 'var(--text-3)' }}>
              More
            </span>
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
