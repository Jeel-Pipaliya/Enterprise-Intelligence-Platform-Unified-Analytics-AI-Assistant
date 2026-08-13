import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts'
import api from '../services/api'
import MetricCard from '../components/MetricCard'
import { useAuth } from '../context/AuthContext'

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

function formatCurrency(value) {
  return `$${Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

function NaturalLanguageResult({ result }) {
  const data = Array.isArray(result?.data) ? result.data.slice(0, 6) : []
  if (!result) return null

  return (
    <div className="mt-3 text-sm">
      <p className="font-medium text-slate-700 dark:text-slate-200">{result.interpretation}</p>
      {data.length > 0 ? (
        <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Name</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Category</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-600 dark:text-slate-300">Revenue</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-600 dark:text-slate-300">Units</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr key={row.id || row.name || row.category || index} className="border-t border-slate-100 dark:border-slate-700">
                  <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-100">{row.name || row.category || row.date || row.segment}</td>
                  <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{row.category || row.segment || '-'}</td>
                  <td className="px-3 py-2 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(row.revenue_generated ?? row.revenue ?? row.total_revenue)}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-300">
                    {(row.units_sold ?? row.customer_count ?? '').toLocaleString?.() || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">No matching data found.</p>
      )}
    </div>
  )
}

export default function DataMart() {
  const { user } = useAuth()
  const [kpis, setKpis] = useState(null)
  const [revenueTrend, setRevenueTrend] = useState([])
  const [categoryBreakdown, setCategoryBreakdown] = useState([])
  const [segments, setSegments] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [categoryDrilldown, setCategoryDrilldown] = useState([])
  const [loading, setLoading] = useState(true)
  const [drilldownLoading, setDrilldownLoading] = useState(false)
  const [filters, setFilters] = useState({ startDate: '', endDate: '', region: '', segment: '' })
  const [nlQuery, setNlQuery] = useState('')
  const [nlResult, setNlResult] = useState(null)
  const [uploadMsg, setUploadMsg] = useState('')
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [kpiRes, trendRes, catRes, segRes] = await Promise.all([
        api.get('/datamart/kpis'),
        api.get('/datamart/revenue-trend'),
        api.get('/datamart/category-breakdown'),
        api.get('/datamart/segments'),
      ])
      setKpis(kpiRes.data)
      setRevenueTrend(trendRes.data || [])
      setCategoryBreakdown(catRes.data || [])
      setSegments(segRes.data || [])
    } catch (err) {
      console.error('Error fetching DataMart data:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategoryDrilldown = async (category) => {
    if (selectedCategory === category) {
      setSelectedCategory(null)
      return
    }
    setDrilldownLoading(true)
    try {
      const res = await api.get(`/datamart/drilldown/${category}`)
      setCategoryDrilldown(res.data || [])
      setSelectedCategory(category)
    } catch (err) {
      console.error('Error fetching category drilldown:', err)
    } finally {
      setDrilldownLoading(false)
    }
  }

  const runNlQuery = async () => {
    if (!nlQuery.trim()) return
    try {
      const res = await api.post('/datamart/nl-query', { query: nlQuery })
      setNlResult(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  const handleCsvUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadMsg('')
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await api.post('/datamart/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setUploadMsg(res.data.message)
      fetchData()
    } catch (err) {
      setUploadMsg(err.response?.data?.detail || 'Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="spinner w-8 h-8" />
    </div>
  )

  return (
    <div className="space-y-6 max-w-7xl">
      {/* NL Analytics + CSV Upload */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Natural Language Analytics</h3>
          <div className="flex gap-2">
            <input
              className="input flex-1 text-sm"
              placeholder='e.g. "Top products in Fitness"'
              value={nlQuery}
              onChange={e => setNlQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && runNlQuery()}
            />
            <button className="btn-primary text-sm" onClick={runNlQuery}>Ask</button>
          </div>
          <NaturalLanguageResult result={nlResult} />
        </div>

        {(user?.role === 'analyst' || user?.role === 'admin') && (
          <div className="card">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Import Products (CSV)</h3>
            <p className="text-xs text-slate-500 mb-3">Required columns: name, category, price (optional: subcategory, cost, stock_level)</p>
            <input type="file" accept=".csv" onChange={handleCsvUpload} disabled={uploading} className="text-sm" />
            {uploadMsg && <p className="text-sm mt-2 text-emerald-600 dark:text-emerald-400">{uploadMsg}</p>}
          </div>
        )}
      </div>

      {/* KPIs */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Executive KPIs</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="Total Revenue" value={`$${(kpis?.total_revenue || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`} icon="💰" color="green" delta={kpis?.revenue_growth_pct} />
          <MetricCard label="Total Orders" value={(kpis?.total_orders || 0).toLocaleString()} icon="📦" color="blue" />
          <MetricCard label="AOV" value={`$${(kpis?.avg_order_value || 0).toFixed(2)}`} icon="🧾" color="amber" />
          <MetricCard label="Customers" value={(kpis?.total_customers || 0).toLocaleString()} icon="👥" color="purple" />
        </div>
      </div>

      {/* Revenue Trend */}
      {revenueTrend.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-slate-800 mb-4">Daily Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={revenueTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={v => [`$${Number(v).toLocaleString()}`, 'Revenue']} />
              <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Category breakdown — two cols */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Bar chart */}
        {categoryBreakdown.length > 0 && (
          <div className="card">
            <h3 className="font-semibold text-slate-800 mb-4">Revenue by Category</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={categoryBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="category" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={v => [`$${Number(v).toLocaleString()}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Pie chart */}
        {categoryBreakdown.length > 0 && (
          <div className="card">
            <h3 className="font-semibold text-slate-800 mb-4">Category Market Share</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={categoryBreakdown} dataKey="revenue" nameKey="category" cx="50%" cy="50%" outerRadius={80} label={(entry) => `${entry.category} ${entry.share_pct}%`}>
                  {categoryBreakdown.map((_, i) => (
                    <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={v => [`$${Number(v).toLocaleString()}`, 'Revenue']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Category Drill-down */}
      <div className="card">
        <h3 className="font-semibold text-slate-800 mb-4">Category Deep Dive</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {categoryBreakdown.map(cat => (
            <button
              key={cat.category}
              onClick={() => fetchCategoryDrilldown(cat.category)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                selectedCategory === cat.category
                  ? 'bg-accent-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {cat.category}
            </button>
          ))}
        </div>

        {drilldownLoading && <div className="flex items-center justify-center h-40"><div className="spinner w-6 h-6" /></div>}

        {selectedCategory && categoryDrilldown.length > 0 && !drilldownLoading && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Product</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Subcategory</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Price</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Units Sold</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {categoryDrilldown.map(p => (
                  <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">{p.name}</td>
                    <td className="px-4 py-3 text-slate-600">{p.subcategory}</td>
                    <td className="px-4 py-3 text-right">${p.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-right font-medium">{p.units_sold.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-600">${p.revenue_generated.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Customer Segmentation */}
      {segments.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-slate-800 mb-4">Customer Segmentation Analysis</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Segment</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Customers</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Total Revenue</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Avg Spend/Customer</th>
                </tr>
              </thead>
              <tbody>
                {segments.map(seg => (
                  <tr key={seg.segment} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium">{seg.segment}</td>
                    <td className="px-4 py-3 text-right">{seg.customer_count.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-600">${seg.total_revenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                    <td className="px-4 py-3 text-right">${seg.avg_spend_per_customer.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
