export default function MetricCard({ label, value, suffix = '', delta, color = 'blue', icon }) {
  const colorMap = {
    blue:   'text-accent-600 bg-accent-50',
    green:  'text-emerald-600 bg-emerald-50',
    amber:  'text-amber-600 bg-amber-50',
    red:    'text-red-600 bg-red-50',
    purple: 'text-purple-600 bg-purple-50',
    slate:  'text-slate-600 bg-slate-100',
  }
  const iconBg = colorMap[color] || colorMap.blue

  return (
    <div className="metric-card">
      <div className="flex items-start justify-between">
        <p className="metric-label">{label}</p>
        {icon && (
          <span className={`text-lg w-9 h-9 flex items-center justify-center rounded-lg ${iconBg}`}>
            {icon}
          </span>
        )}
      </div>
      <div className="flex items-end gap-2 mt-1">
        <span className="metric-value">{value}{suffix}</span>
        {delta !== undefined && (
          <span className={`text-xs font-medium mb-0.5 ${
            delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-red-500' : 'text-slate-400'
          }`}>
            {delta > 0 ? '▲' : delta < 0 ? '▼' : '—'} {Math.abs(delta)}%
          </span>
        )}
      </div>
    </div>
  )
}
