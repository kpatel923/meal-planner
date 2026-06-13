import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'
import {
  CalendarDays, ShoppingCart, Bookmark,
  BookOpen, User, LogOut, ChefHat, Sun, Moon
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/planner', label: 'Planner',  icon: CalendarDays, emoji: '📅' },
  { to: '/grocery', label: 'Grocery',  icon: ShoppingCart, emoji: '🛒' },
  { to: '/saved',   label: 'Saved',    icon: Bookmark,     emoji: '⭐' },
  { to: '/recipes', label: 'Recipes',  icon: BookOpen,     emoji: '📖' },
  { to: '/profile', label: 'Profile',  icon: User,         emoji: '👤' },
]

export default function AppLayout() {
  const { user, profile, signOut } = useAuth()
  const { isDark, toggle }         = useTheme()
  const navigate                   = useNavigate()

  async function handleSignOut() { await signOut(); navigate('/auth') }

  const initials  = (profile?.username || user?.email || 'U').charAt(0).toUpperCase()
  const username  = profile?.username || user?.email?.split('@')[0] || 'User'

  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ background: 'var(--bg)' }}>

      {/* ── Desktop Sidebar ─────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-60 xl:w-64 shrink-0 h-screen sticky top-0"
        style={{
          background: 'linear-gradient(175deg, #0D1A10 0%, #09100B 50%, #080806 100%)',
          borderRight: '1px solid rgba(255,255,255,0.055)',
        }}>

        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.055)' }}>
          <div className="relative w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
            style={{
              background: 'linear-gradient(145deg, #27B872 0%, #0B4529 100%)',
              boxShadow: '0 0 24px rgba(31,158,98,0.45), 0 1px 0 rgba(255,255,255,0.15) inset',
            }}>
            <ChefHat size={20} className="text-white" />
          </div>
          <div>
            <p className="font-display font-semibold text-white" style={{ fontSize: '17px', letterSpacing: '-0.04em', lineHeight: 1 }}>
              MealPlan
            </p>
            <p style={{ fontSize: '11px', color: '#3A6648', marginTop: '3px', letterSpacing: '0.01em' }}>
              Your weekly kitchen
            </p>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex items-center gap-3.5 px-4 py-3 rounded-2xl font-medium transition-all duration-200 relative group ` +
                (isActive ? 'text-white' : 'text-carbon-500 hover:text-white')
              }
              style={({ isActive }) => isActive ? {
                background: 'linear-gradient(135deg, rgba(39,184,114,0.22) 0%, rgba(39,184,114,0.08) 100%)',
                boxShadow: '0 0 0 1px rgba(39,184,114,0.3) inset, 0 4px 16px rgba(0,0,0,0.2)',
              } : {}}>
              {({ isActive }) => (
                <>
                  {/* Active left accent bar */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-full"
                      style={{ background: 'linear-gradient(180deg,#3AB87D,#1F9E62)', boxShadow: '0 0 8px rgba(58,184,125,0.6)' }} />
                  )}
                  <Icon
                    size={18}
                    strokeWidth={isActive ? 2.5 : 1.8}
                    style={{ color: isActive ? '#3AB87D' : '#4A4238', transition: 'color 0.2s ease' }}
                    className="shrink-0 group-hover:!text-forest-400 transition-colors"
                  />
                  <span style={{ fontSize: '14px', letterSpacing: '-0.01em', color: isActive ? '#fff' : '#504840' }}
                    className="group-hover:!text-white transition-colors">
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="px-3 pb-5 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.055)', paddingTop: '14px' }}>

          {/* Theme toggle */}
          <button onClick={toggle}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all duration-200 group"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>
            <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: isDark ? 'rgba(252,211,77,0.12)' : 'rgba(31,158,98,0.12)' }}>
              {isDark
                ? <Sun size={15} style={{ color: '#FCD34D' }} className="group-hover:rotate-90 transition-transform duration-500" />
                : <Moon size={15} style={{ color: '#8F8678' }} />}
            </div>
            <span style={{ fontSize: '13px', color: '#504840' }} className="group-hover:text-white transition-colors">
              {isDark ? 'Light mode' : 'Dark mode'}
            </span>
          </button>

          {/* User row */}
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
              style={{ background: 'linear-gradient(145deg,#27B872,#167D4D)', boxShadow: '0 2px 8px rgba(31,158,98,0.4)' }}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate" style={{ fontSize: '13px', color: '#C5BFB5', letterSpacing: '-0.01em' }}>
                {username}
              </p>
              <p className="truncate" style={{ fontSize: '11px', color: '#3A3530' }}>{user?.email}</p>
            </div>
            <button onClick={handleSignOut} title="Sign out"
              className="p-1.5 rounded-xl transition-all"
              style={{ color: '#3A3530' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#D4502A'; e.currentTarget.style.background = 'rgba(212,80,42,0.1)' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#3A3530'; e.currentTarget.style.background = 'transparent' }}>
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
        style={{
          background: isDark ? 'rgba(12,11,9,0.95)' : 'rgba(255,255,255,0.95)',
          borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
        }}>
        <div className="flex items-stretch">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-all duration-200 ` +
                (isActive
                  ? 'text-forest-600 dark:text-forest-400'
                  : 'text-carbon-400 dark:text-carbon-600')
              }>
              {({ isActive }) => (
                <>
                  <div className={`relative p-1.5 rounded-2xl transition-all duration-250 ${isActive ? 'scale-110' : 'scale-100'}`}
                    style={{
                      background: isActive
                        ? isDark ? 'rgba(58,184,125,0.18)' : 'rgba(31,158,98,0.12)'
                        : 'transparent',
                    }}>
                    <Icon size={22} strokeWidth={isActive ? 2.5 : 1.7}
                      style={{ color: isActive ? 'var(--brand)' : 'var(--text-3)' }} />
                    {/* Active dot */}
                    {isActive && (
                      <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                        style={{ background: 'var(--brand)' }} />
                    )}
                  </div>
                  <span className="font-semibold uppercase" style={{ fontSize: '9px', letterSpacing: '0.07em', color: isActive ? 'var(--brand)' : 'var(--text-3)' }}>
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
