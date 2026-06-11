import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './hooks/useAuth'

import AuthPage     from './pages/AuthPage'
import PlannerPage  from './pages/PlannerPage'
import RecipesPage  from './pages/RecipesPage'
import GroceryPage  from './pages/GroceryPage'
import SavedPage    from './pages/SavedPage'
import ProfilePage  from './pages/ProfilePage'
import AppLayout    from './components/layout/AppLayout'
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

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/auth" element={
            <PublicRoute><AuthPage /></PublicRoute>
          } />

          {/* Protected — all wrapped in AppLayout (nav + shell) */}
          <Route path="/" element={
            <ProtectedRoute><AppLayout /></ProtectedRoute>
          }>
            <Route index element={<Navigate to="/planner" replace />} />
            <Route path="planner" element={<PlannerPage />} />
            <Route path="recipes" element={<RecipesPage />} />
            <Route path="grocery" element={<GroceryPage />} />
            <Route path="saved"   element={<SavedPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/planner" replace />} />
        </Routes>
      </BrowserRouter>

      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#fff',
            color: '#1a1a1a',
            borderRadius: '12px',
            border: '1px solid #e8e4da',
            boxShadow: '0 4px 32px rgba(0,0,0,0.08)',
          },
          success: { iconTheme: { primary: '#466646', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#cc6040', secondary: '#fff' } },
        }}
      />
    </AuthProvider>
  )
}
