import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { register } = useAuth()
  const [form, setForm] = useState({ email: '', password: '', full_name: '', role: 'customer' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(form.email, form.password, form.full_name, form.role)
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-accent-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 bg-accent-600 rounded-2xl items-center justify-center mb-4 shadow-lg">
            <span className="text-white text-xl font-bold">EI</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Enterprise Intelligence</h1>
          <p className="text-slate-500 text-sm mt-1">Create your account</p>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-slate-800 mb-1">Sign up</h2>
          <p className="text-sm text-slate-500 mb-6">Get access to all platform modules</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="reg-name" className="label">Full Name</label>
              <input id="reg-name" type="text" className="input" placeholder="Jane Smith"
                value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required />
            </div>
            <div>
              <label htmlFor="reg-email" className="label">Email</label>
              <input id="reg-email" type="email" className="input" placeholder="you@example.com"
                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div>
              <label htmlFor="reg-password" className="label">Password</label>
              <input id="reg-password" type="password" className="input" placeholder="Min. 8 characters"
                value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
            </div>
            <div>
              <label htmlFor="reg-role" className="label">Role</label>
              <select id="reg-role" className="select"
                value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                <option value="customer">Customer</option>
                <option value="analyst">Analyst</option>
              </select>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
                {error}
              </div>
            )}

            <button id="reg-submit" type="submit"
              className="btn-primary w-full justify-center flex items-center gap-2"
              disabled={loading}>
              {loading && <span className="spinner w-4 h-4" />}
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-5">
            Have an account?{' '}
            <Link to="/login" className="text-accent-600 hover:text-accent-700 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
