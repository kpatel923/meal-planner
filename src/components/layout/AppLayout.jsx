import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import {
  CalendarDays, BookOpen, ShoppingCart,
  Bookmark, User, LogOut, ChefHat
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/planner',  label: 'Planner',  icon: CalendarDays },
  { to: '/recipes',  label: 'Recipes',  icon: BookOpen     },
  { to: '/grocery',  label: 'Grocery',  icon: ShoppingCart },
  { to: '/saved',    label: 'Saved',    icon: Bookmark     },
  { to: '/profile',  label: 'Profile',  icon: User         },
]

export default function AppLayout() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/auth')
  }

  const initials = (profile?.username || user?.email || 'U')
    .charAt(0).toUpperCase()

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-cream-50">

      {/* ── Desktop Sidebar ─────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-60 xl:w-64 shrink-0 bg-white border-r border-cream-200 h-screen sticky top-0">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-cream-200">
          <div className="w-9 h-9 rounded-xl bg-sage-600 flex items-center justify-center shadow-soft">
            <ChefHat size={18} className="text-white" />
          </div>
          <span className="font-display font-semibold text-sage-900 text-lg tracking-tight">
            MealPlan
          </span>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ` +
                (isActive
                  ? 'bg-sage-600 text-white shadow-soft'
                  : 'text-sage-600 hover:bg-sage-50 hover:text-sage-800')
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User + Sign Out */}
        <div className="px-4 py-4 border-t border-cream-200">
          <div className="flex items-center gap-3 mb-3 px-1">
            <div className="w-8 h-8 rounded-full bg-sage-100 border border-sage-200 flex items-center justify-center text-sage-700 font-semibold text-sm">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sage-900 truncate">
                {profile?.username || 'User'}
              </p>
              <p className="text-xs text-sage-400 truncate">
                {user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="btn-ghost btn-sm w-full text-clay-600 hover:bg-clay-50 hover:text-clay-700"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main Content ──────────────────────────────────────── */}
      <main className="flex-1 min-w-0 pb-24 lg:pb-0 lg:overflow-y-auto">
        <Outlet />
      </main>

      {/* ── Mobile Bottom Nav ─────────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-cream-200 safe-bottom">
        <div className="flex items-stretch">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors ` +
                (isActive ? 'text-sage-600' : 'text-sage-400')
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`p-1 rounded-lg transition-all ${isActive ? 'bg-sage-100' : ''}`}>
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                  </div>
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
