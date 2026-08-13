import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import RoleGuard from './components/RoleGuard'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Backtesting from './pages/Backtesting'
import DataMart from './pages/DataMart'
import AIAssistant from './pages/AIAssistant'
import Intelligence from './pages/Intelligence'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="spinner w-8 h-8" />
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login"    element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="backtest" element={
          <RoleGuard allowed={['analyst', 'admin']}>
            <Backtesting />
          </RoleGuard>
        } />
        <Route path="datamart" element={<DataMart />} />
        <Route path="assistant" element={<AIAssistant />} />
        <Route path="intelligence" element={
          <RoleGuard allowed={['analyst', 'admin']}>
            <Intelligence />
          </RoleGuard>
        } />
      </Route>
    </Routes>
  )
}
