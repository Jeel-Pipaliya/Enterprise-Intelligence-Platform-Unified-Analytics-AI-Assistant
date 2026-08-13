import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RoleGuard({ children, allowed = [] }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner w-8 h-8" />
      </div>
    )
  }

  if (!user || (allowed.length > 0 && !allowed.includes(user.role))) {
    return <Navigate to="/" replace />
  }

  return children
}
