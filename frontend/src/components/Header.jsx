import { useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useDemo } from '../context/DemoContext'
import api from '../services/api'

const PAGE_TITLES = {
  '/':            { title: 'Executive Dashboard', subtitle: 'Unified view with smart alerts & cross-module insights' },
  '/backtest':    { title: 'Backtesting Engine', subtitle: 'Run & compare strategies with anti-look-ahead guarantee' },
  '/datamart':    { title: 'DataMart Analytics', subtitle: 'Star-schema OLAP · NL queries · CSV import' },
  '/assistant':   { title: 'AI Copilot', subtitle: 'Cross-module intelligence — DataMart · Backtest · Alerts' },
  '/intelligence': { title: 'Intelligence Bridge', subtitle: 'Retail categories ↔ market tickers ↔ hedge strategies' },
}

export default function Header() {
  const { pathname } = useLocation()
  const { logout, user } = useAuth()
  const { dark, toggle } = useTheme()
  const { runDemo } = useDemo()
  const page = PAGE_TITLES[pathname] || { title: 'Enterprise Intelligence Platform', subtitle: '' }

  const exportReport = async () => {
    try {
      const res = await api.get('/reports/executive', { responseType: 'blob' })
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `executive-report-${new Date().toISOString().slice(0, 10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('Failed to export report')
    }
  }

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
      <div>
        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">{page.title}</h1>
        {page.subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{page.subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-medium border border-emerald-200 dark:border-emerald-800">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse inline-block" />
          Live
        </div>

        {(user?.role === 'analyst' || user?.role === 'admin') && (
          <>
            <button onClick={runDemo} className="btn-secondary text-xs py-1.5 px-3 hidden md:inline-flex">
              🎬 Demo Mode
            </button>
            <button onClick={exportReport} className="btn-secondary text-xs py-1.5 px-3 hidden md:inline-flex">
              📊 Export Report
            </button>
          </>
        )}

        <button onClick={toggle} className="btn-ghost text-xs py-1.5 px-2" title="Toggle theme">
          {dark ? '☀️' : '🌙'}
        </button>

        <button onClick={logout} className="btn-secondary text-xs py-1.5 px-3" id="logout-button">
          Sign Out
        </button>
      </div>
    </header>
  )
}
