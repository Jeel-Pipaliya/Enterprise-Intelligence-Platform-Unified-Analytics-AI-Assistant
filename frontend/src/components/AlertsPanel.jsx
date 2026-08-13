import { useEffect, useState } from 'react'
import api from '../services/api'

const SEVERITY_STYLES = {
  critical: 'border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800',
  warning: 'border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800',
  info: 'border-blue-300 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800',
}

export default function AlertsPanel({ compact = false }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/dashboard/alerts')
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="card animate-pulse h-24" />
  }

  const alerts = data?.alerts || []
  if (alerts.length === 0) {
    return (
      <div className="card border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800">
        <p className="text-sm text-emerald-700 dark:text-emerald-300">✅ No active alerts — all systems healthy</p>
      </div>
    )
  }

  const shown = compact ? alerts.slice(0, 3) : alerts

  return (
    <div className="space-y-3">
      {!compact && (
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">Smart Alerts & AI Recommendations</h3>
          <span className="badge badge-amber">{data.summary.total} active</span>
        </div>
      )}
      {shown.map(alert => (
        <div key={alert.id} className={`rounded-lg border p-4 ${SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.info}`}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-sm text-slate-800 dark:text-slate-100">{alert.title}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{alert.message}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 italic">💡 {alert.recommendation}</p>
            </div>
            <span className={`badge shrink-0 ${alert.severity === 'critical' ? 'badge-red' : alert.severity === 'warning' ? 'badge-amber' : 'badge-blue'}`}>
              {alert.severity}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
