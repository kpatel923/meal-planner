import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { ThemeProvider, useTheme } from './hooks/useTheme'
import { PlanProvider } from './hooks/usePlanStore'

import AuthPage      from './pages/AuthPage'
import PlannerPage   from './pages/PlannerPage'
import RecipesPage   from './pages/RecipesPage'
import GroceryPage   from './pages/GroceryPage'
import SavedPage     from './pages/SavedPage'
import ProfilePage   from './pages/ProfilePage'
import AppLayout     from './components/layout/AppLayout'
import LoadingScreen from './components/layout/LoadingScreen'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user)   return <Navigate to="/auth" replace />
  return children
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (user)    return <Navigate to="/planner" replace />
  return children
}

function ToastWrapper() {
  const { isDark } = useTheme()
  return (
    <Toaster position="top-center" toastOptions={{
      duration: 3000,
      style: {
        background: isDark ? '#242018' : '#fff',
        color: isDark ? '#F7F6F3' : '#0F0E0C',
        borderRadius: '14px',
        border: `1px solid ${isDark ? '#3A3530' : '#E0DDD6'}`,
        boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.10)',
        fontSize: '14px',
        fontFamily: 'Inter, sans-serif',
        padding: '12px 18px',
      },
      success: { iconTheme: { primary: '#1F9E62', secondary: '#fff' } },
      error:   { iconTheme: { primary: '#D4502A', secondary: '#fff' } },
    }} />
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <PlanProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<PublicRoute><AuthPage /></PublicRoute>} />
              <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route index element={<Navigate to="/planner" replace />} />
                <Route path="planner" element={<PlannerPage />} />
                <Route path="grocery" element={<GroceryPage />} />
                <Route path="saved"   element={<SavedPage />} />
                <Route path="recipes" element={<RecipesPage />} />
                <Route path="profile" element={<ProfilePage />} />
              </Route>
              <Route path="*" element={<Navigate to="/planner" replace />} />
            </Routes>
            <ToastWrapper />
          </BrowserRouter>
        </PlanProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
