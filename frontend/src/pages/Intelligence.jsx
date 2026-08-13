import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from 'recharts'
import api from '../services/api'
import MetricCard from '../components/MetricCard'

export default function Intelligence() {
  const [insights, setInsights] = useState(null)
  const [mappings, setMappings] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [loading, setLoading] = useState(true)
  const [nlQuery, setNlQuery] = useState('')
  const [nlResult, setNlResult] = useState(null)
  const [nlLoading, setNlLoading] = useState(false)

  const loadInsights = async (category) => {
    setLoading(true)
    try {
      const [insightRes, mapRes] = await Promise.all([
        api.get('/intelligence/category-ticker', { params: category ? { category } : {} }),
        api.get('/intelligence/mappings'),
      ])
      setInsights(insightRes.data)
      setMappings(mapRes.data)
      setSelectedCategory(insightRes.data.category)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInsights()
  }, [])

  const runNlQuery = async (queryOverride) => {
    const q = queryOverride || nlQuery
    if (!q.trim()) return
    setNlLoading(true)
    try {
      const res = await api.post('/intelligence/nl-query', { query: q })
      setNlResult(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setNlLoading(false)
    }
  }

  if (loading && !insights) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner w-8 h-8" />
      </div>
    )
  }

  const chartData = nlResult?.data || []
  const chartType = nlResult?.chart_type

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="card bg-gradient-to-r from-indigo-600 to-accent-600 text-white border-0">
        <h2 className="text-xl font-bold">Intelligence Bridge</h2>
        <p className="text-indigo-100 text-sm mt-1">
          Connect retail category performance to market tickers and hedge strategies
        </p>
      </div>

      <div className="card">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Category ↔ Ticker Mappings</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {mappings.map(m => (
            <button
              key={m.category}
              onClick={() => loadInsights(m.category)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === m.category
                  ? 'bg-accent-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {m.category}
            </button>
          ))}
        </div>

        {insights && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">{insights.insight}</p>
            <div className="grid md:grid-cols-3 gap-4">
              <MetricCard label="Category Revenue" value={`$${(insights.category_metrics?.revenue || 0).toLocaleString()}`} icon="💰" color="green" />
              <MetricCard label="Market Share" value={`${insights.category_metrics?.share_pct || 0}%`} icon="📊" color="blue" />
              <MetricCard label="Related Tickers" value={insights.related_tickers?.slice(0, 2).join(', ') || '—'} icon="📈" color="purple" />
            </div>

            {insights.backtest_summaries?.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800">
                    <tr>
                      <th className="px-4 py-2 text-left">Ticker</th>
                      <th className="px-4 py-2 text-right">Return</th>
                      <th className="px-4 py-2 text-right">Sharpe</th>
                      <th className="px-4 py-2 text-right">Max DD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insights.backtest_summaries.map(row => (
                      <tr key={row.ticker} className="border-t border-slate-100 dark:border-slate-700">
                        <td className="px-4 py-2 font-medium">{row.ticker}</td>
                        <td className="px-4 py-2 text-right">{row.total_return_pct?.toFixed(1)}%</td>
                        <td className="px-4 py-2 text-right">{row.sharpe_ratio?.toFixed(2)}</td>
                        <td className="px-4 py-2 text-right">{row.max_drawdown_pct?.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Natural Language Analytics</h3>
        <div className="flex gap-2 mb-4">
          <input
            className="input flex-1"
            placeholder='Try: "Top products in Electronics" or "Revenue trend"'
            value={nlQuery}
            onChange={e => setNlQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && runNlQuery()}
          />
          <button className="btn-primary" onClick={() => runNlQuery()} disabled={nlLoading}>
            {nlLoading ? 'Analyzing…' : 'Ask'}
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {['Top products in Electronics', 'Revenue trend', 'Category breakdown', 'Customer segments'].map(q => (
            <button key={q} onClick={() => { setNlQuery(q); runNlQuery(q) }} className="text-xs px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-accent-50">
              {q}
            </button>
          ))}
        </div>

        {nlResult && (
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-3">{nlResult.interpretation}</p>
            {chartType === 'line' && chartData.length > 0 && (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
            {chartType === 'bar' && chartData.length > 0 && (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey={chartData[0].category ? 'category' : 'name'} tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey={chartData[0].revenue_generated != null ? 'revenue_generated' : 'revenue'} fill="#2563eb" />
                </BarChart>
              </ResponsiveContainer>
            )}
            {(chartType === 'table' || chartType === 'metrics') && (
              <pre className="text-xs bg-slate-50 dark:bg-slate-900 p-3 rounded-lg overflow-x-auto border border-slate-200 dark:border-slate-700">
                {JSON.stringify(chartData, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
