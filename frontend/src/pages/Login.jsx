import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { DEFAULT_CREDENTIALS } from '../config/defaultCredentials'

export default function Login() {
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form.email, form.password)
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (role) => {
    const { email, password } = DEFAULT_CREDENTIALS[role]
    setForm({ email, password })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-accent-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 bg-accent-600 rounded-2xl items-center justify-center mb-4 shadow-lg">
            <span className="text-white text-xl font-bold">EI</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Enterprise Intelligence</h1>
          <p className="text-slate-500 text-sm mt-1">Backtesting · DataMart · AI Assistant</p>
        </div>

        {/* Card */}
        <div className="card">
          <h2 className="text-lg font-semibold text-slate-800 mb-1">Sign in</h2>
          <p className="text-sm text-slate-500 mb-6">Access all three platform modules</p>

          {/* Demo quick-fill */}
          <div className="mb-5 bg-slate-50 border border-slate-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-slate-500 mb-2">Default Demo Accounts</p>
            <div className="flex gap-2 flex-wrap mb-3">
              {Object.entries(DEFAULT_CREDENTIALS).map(([role, { label }]) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => fillDemo(role)}
                  className="text-xs px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-600 hover:border-accent-300 hover:text-accent-700 transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="label">Email</label>
              <input
                id="login-email"
                type="email"
                className="input"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
              />
            </div>
            <div>
              <label htmlFor="login-password" className="label">Password</label>
              <input
                id="login-password"
                type="password"
                className="input"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
                {error}
              </div>
            )}

            <button
              id="login-submit"
              type="submit"
              className="btn-primary w-full justify-center flex items-center gap-2"
              disabled={loading}
            >
              {loading && <span className="spinner w-4 h-4" />}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-5">
            No account?{' '}
            <Link to="/register" className="text-accent-600 hover:text-accent-700 font-medium">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
