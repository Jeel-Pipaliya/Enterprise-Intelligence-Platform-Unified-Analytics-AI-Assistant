import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import api from '../services/api'
import MetricCard from '../components/MetricCard'
import AlertsPanel from '../components/AlertsPanel'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const { user } = useAuth()
  const [snap, setSnap] = useState(null)
  const [trend, setTrend] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/snapshot'),
      api.get('/datamart/revenue-trend'),
    ]).then(([snapRes, trendRes]) => {
      setSnap(snapRes.data)
      // Sample every 7th point for dashboard mini-chart
      const all = trendRes.data || []
      setTrend(all.filter((_, i) => i % 7 === 0).slice(-24))
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="spinner w-8 h-8" />
    </div>
  )

  const dm = snap?.datamart_snapshot || {}
  const bt = snap?.backtest_snapshot || {}
  const ai = snap?.ai_snapshot || {}

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-accent-600 to-accent-700 rounded-xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-accent-200 text-sm font-medium mb-1">Welcome back, {snap?.user?.full_name || 'User'}</p>
            <h2 className="text-2xl font-bold">Enterprise Intelligence Platform</h2>
            <p className="text-accent-200 text-sm mt-1">
              {user?.role === 'customer'
                ? 'Your orders · Recommendations · AI support'
                : 'One platform · Three modules · Intelligence Bridge'}
            </p>
          </div>
          <div className="hidden md:flex gap-2 flex-wrap justify-end">
            {['Backtesting', 'DataMart', 'AI Assistant'].map(m => (
              <span key={m} className="px-3 py-1 bg-white/15 text-white text-xs rounded-full font-medium border border-white/20">{m}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Smart Alerts */}
      {(user?.role === 'analyst' || user?.role === 'admin') && (
        <AlertsPanel compact={false} />
      )}

      {/* DataMart KPI row */}
      <div>
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
          📊 Module 2 — DataMart Analytics Snapshot
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="Total Revenue"    value={`$${(dm.total_revenue||0).toLocaleString('en-US', {maximumFractionDigits:0})}`} icon="💰" color="green" delta={dm.revenue_growth_pct} />
          <MetricCard label="Total Orders"     value={(dm.total_orders||0).toLocaleString()} icon="📦" color="blue" />
          <MetricCard label="Avg Order Value"  value={`$${(dm.avg_order_value||0).toFixed(2)}`} icon="🧾" color="amber" />
          <MetricCard label="Active Customers" value={(dm.total_customers||0).toLocaleString()} icon="👥" color="purple" />
        </div>
      </div>

      {/* Revenue trend mini-chart */}
      {trend.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-800">Revenue Trend</h3>
              <p className="text-xs text-slate-500 mt-0.5">Weekly sampling — full view in DataMart module</p>
            </div>
            <Link to="/datamart" className="text-xs text-accent-600 hover:text-accent-700 font-medium">
              View full analytics →
            </Link>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={v => [`$${Number(v).toLocaleString()}`, 'Revenue']} />
              <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Module 1 + Module 3 in a 2-col grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Backtesting snapshot */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">📈</span>
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">Module 1 — Backtesting Engine</h3>
              <p className="text-xs text-slate-400">Latest simulation result</p>
            </div>
          </div>
          {bt.total_return_pct !== 0 ? (
            <div className="space-y-2">
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">Ticker</span>
                <span className="font-semibold text-slate-800">{bt.ticker}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">Strategy</span>
                <span className="text-sm font-medium text-slate-700">{bt.strategy_name}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">Total Return</span>
                <span className={`font-bold text-sm ${bt.total_return_pct >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {bt.total_return_pct >= 0 ? '+' : ''}{bt.total_return_pct?.toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-slate-500">Sharpe Ratio</span>
                <span className="font-semibold text-slate-800">{bt.sharpe_ratio?.toFixed(2)}</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400">
              <div className="text-3xl mb-2">📊</div>
              <p className="text-sm">No backtests run yet</p>
            </div>
          )}
          <Link to="/backtest" className="mt-4 btn-primary w-full text-center text-sm flex justify-center">
            {bt.total_return_pct !== 0 ? 'Run Another Backtest' : 'Run First Backtest →'}
          </Link>
        </div>

        {/* AI Assistant snapshot */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🤖</span>
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">Module 3 — AI Assistant</h3>
              <p className="text-xs text-slate-400">Powered by Claude · Grounded in DataMart</p>
            </div>
            <span className="badge badge-green ml-auto">{ai.status}</span>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-slate-500 font-medium">Suggested queries:</p>
            {(ai.suggested_queries || []).map((q, i) => (
              <Link to="/assistant" key={i}
                className="block text-sm text-slate-600 bg-slate-50 hover:bg-accent-50 hover:text-accent-700 border border-slate-200 hover:border-accent-200 rounded-lg px-3 py-2 transition-all duration-150">
                💬 {q}
              </Link>
            ))}
          </div>
          <Link to="/assistant" className="mt-4 btn-secondary w-full text-center text-sm flex justify-center">
            Open AI Assistant →
          </Link>
        </div>
      </div>

      {/* Integration callout */}
      <div className="bg-slate-800 dark:bg-slate-900 rounded-xl p-5 text-white border border-slate-700">
        <div className="flex items-start gap-4">
          <span className="text-2xl mt-0.5">🔗</span>
          <div>
            <h3 className="font-semibold text-sm">Intelligence Bridge — Ask → Analyze → Act</h3>
            <p className="text-slate-400 text-xs mt-1">
              AI Copilot connects DataMart analytics, smart alerts, and backtesting hedges in one workflow.
              {(user?.role === 'analyst' || user?.role === 'admin') && (
                <> Try the <Link to="/intelligence" className="text-accent-300 hover:underline">Intelligence Bridge</Link> module.</>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
