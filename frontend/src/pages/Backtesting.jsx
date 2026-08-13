import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine, AreaChart, Area, Legend
} from 'recharts'
import api from '../services/api'
import MetricCard from '../components/MetricCard'

const STRATEGIES = [
  { value: 'ma_crossover',  label: 'Moving Average Crossover' },
  { value: 'rsi_threshold', label: 'RSI Mean Reversion' },
  { value: 'buy_and_hold',  label: 'Buy & Hold Baseline' },
]

const TICKERS = ['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'TSLA', 'SPY', 'AMZN', 'META']

const DEFAULT_FORM = {
  ticker: 'AAPL',
  strategy: 'ma_crossover',
  start_date: '2023-01-01',
  end_date: '2024-01-01',
  initial_capital: 100000,
  slippage_pct: 0.001,
  short_window: 20,
  long_window: 50,
  rsi_period: 14,
  rsi_oversold: 30,
  rsi_overbought: 70,
}

export default function Backtesting() {
  const [form, setForm] = useState(DEFAULT_FORM)
  const [result, setResult] = useState(null)
  const [compareResult, setCompareResult] = useState(null)
  const [mode, setMode] = useState('single')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showMethodology, setShowMethodology] = useState(false)

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const runBacktest = async () => {
    setError('')
    setLoading(true)
    setResult(null)
    try {
      const res = await api.post('/backtest/run', {
        ...form,
        initial_capital: Number(form.initial_capital),
        slippage_pct: Number(form.slippage_pct),
        short_window: Number(form.short_window),
        long_window: Number(form.long_window),
        rsi_period: Number(form.rsi_period),
        rsi_oversold: Number(form.rsi_oversold),
        rsi_overbought: Number(form.rsi_overbought),
      })
      setResult(res.data)
    } catch (e) {
      setError(e.response?.data?.detail || 'Backtest failed. Check server logs.')
    } finally {
      setLoading(false)
    }
  }

  const runCompare = async () => {
    setError('')
    setLoading(true)
    setCompareResult(null)
    setResult(null)
    try {
      const res = await api.post('/backtest/compare', {
        ticker: form.ticker,
        strategies: STRATEGIES.map(s => s.value),
        start_date: form.start_date,
        end_date: form.end_date,
        initial_capital: Number(form.initial_capital),
        slippage_pct: Number(form.slippage_pct),
        short_window: Number(form.short_window),
        long_window: Number(form.long_window),
        rsi_period: Number(form.rsi_period),
        rsi_oversold: Number(form.rsi_oversold),
        rsi_overbought: Number(form.rsi_overbought),
      })
      setCompareResult(res.data)
      setMode('compare')
    } catch (e) {
      setError(e.response?.data?.detail || 'Compare failed.')
    } finally {
      setLoading(false)
    }
  }

  const m = result?.metrics
  const metricColor = (v, pos = true) => pos ? (v >= 0 ? 'green' : 'red') : (v <= 0 ? 'green' : 'red')

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Config form */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-semibold text-slate-800">Strategy Configuration</h2>
            <p className="text-xs text-slate-500 mt-0.5">Configure and simulate trading strategies on historical market data</p>
          </div>
          <button
            onClick={() => setShowMethodology(o => !o)}
            className="btn-ghost text-xs flex items-center gap-1.5"
          >
            📖 Methodology
          </button>
        </div>

        {/* Methodology panel */}
        {showMethodology && result?.methodology && (
          <div className="mb-5 bg-accent-50 border border-accent-100 rounded-xl p-4 text-sm">
            <h4 className="font-semibold text-accent-800 mb-2">{result.methodology.title}</h4>
            <p className="text-accent-700 text-xs mb-3">{result.methodology.description}</p>
            <div className="space-y-1.5">
              {['rule_1','rule_2','rule_3','rule_4'].map(k => result.methodology[k] && (
                <div key={k} className="flex items-start gap-2 text-xs text-accent-800">
                  <span className="mt-0.5 text-accent-500">•</span>
                  <span>{result.methodology[k]}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="col-span-2 md:col-span-1">
            <label className="label">Ticker</label>
            <select className="select" value={form.ticker} onChange={e => set('ticker', e.target.value)} id="bt-ticker">
              {TICKERS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="col-span-2 md:col-span-1">
            <label className="label">Strategy</label>
            <select className="select" value={form.strategy} onChange={e => set('strategy', e.target.value)} id="bt-strategy">
              {STRATEGIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Start Date</label>
            <input type="date" className="input" value={form.start_date} onChange={e => set('start_date', e.target.value)} id="bt-start" />
          </div>
          <div>
            <label className="label">End Date</label>
            <input type="date" className="input" value={form.end_date} onChange={e => set('end_date', e.target.value)} id="bt-end" />
          </div>
          <div>
            <label className="label">Initial Capital ($)</label>
            <input type="number" className="input" value={form.initial_capital} onChange={e => set('initial_capital', e.target.value)} id="bt-capital" />
          </div>
          <div>
            <label className="label">Slippage (%)</label>
            <input type="number" step="0.0001" min="0" max="0.05" className="input"
              value={form.slippage_pct} onChange={e => set('slippage_pct', e.target.value)} id="bt-slippage" />
          </div>

          {form.strategy === 'ma_crossover' && <>
            <div>
              <label className="label">Short MA Window</label>
              <input type="number" className="input" value={form.short_window} onChange={e => set('short_window', e.target.value)} />
            </div>
            <div>
              <label className="label">Long MA Window</label>
              <input type="number" className="input" value={form.long_window} onChange={e => set('long_window', e.target.value)} />
            </div>
          </>}

          {form.strategy === 'rsi_threshold' && <>
            <div>
              <label className="label">RSI Period</label>
              <input type="number" className="input" value={form.rsi_period} onChange={e => set('rsi_period', e.target.value)} />
            </div>
            <div>
              <label className="label">Oversold / Overbought</label>
              <div className="flex gap-2">
                <input type="number" className="input" value={form.rsi_oversold} onChange={e => set('rsi_oversold', e.target.value)} placeholder="30" />
                <input type="number" className="input" value={form.rsi_overbought} onChange={e => set('rsi_overbought', e.target.value)} placeholder="70" />
              </div>
            </div>
          </>}
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={runCompare}
            disabled={loading}
            className="btn-secondary flex items-center gap-2 px-4"
          >
            Compare All Strategies
          </button>
          <button
            id="run-backtest-btn"
            onClick={runBacktest}
            disabled={loading}
            className="btn-primary flex items-center gap-2 px-6"
          >
            {loading && <span className="spinner w-4 h-4" />}
            {loading ? 'Running…' : '▶ Run Backtest'}
          </button>
        </div>
      </div>

      {/* Compare results */}
      {compareResult && (
        <div className="card">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">Strategy Comparison — {compareResult.ticker}</h3>
          <p className="text-xs text-slate-500 mb-4">
            Winner by Sharpe: <strong>{compareResult.winner.strategy_name}</strong>
            ({compareResult.winner.sharpe_ratio?.toFixed(2)} Sharpe, {compareResult.winner.total_return_pct?.toFixed(1)}% return)
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="px-4 py-2 text-left">Strategy</th>
                  <th className="px-4 py-2 text-right">Return</th>
                  <th className="px-4 py-2 text-right">Sharpe</th>
                  <th className="px-4 py-2 text-right">Max DD</th>
                  <th className="px-4 py-2 text-right">Win Rate</th>
                </tr>
              </thead>
              <tbody>
                {compareResult.results.map(row => (
                  <tr key={row.strategy} className={`border-t border-slate-100 dark:border-slate-700 ${row.strategy === compareResult.winner.strategy ? 'bg-emerald-50 dark:bg-emerald-950/20' : ''}`}>
                    <td className="px-4 py-2 font-medium">{row.strategy_name}</td>
                    <td className="px-4 py-2 text-right">{row.metrics.total_return_pct?.toFixed(2)}%</td>
                    <td className="px-4 py-2 text-right">{row.metrics.sharpe_ratio?.toFixed(2)}</td>
                    <td className="px-4 py-2 text-right">{row.metrics.max_drawdown_pct?.toFixed(2)}%</td>
                    <td className="px-4 py-2 text-right">{row.metrics.win_rate_pct?.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Metrics */}
          <div>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Performance Metrics</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              <MetricCard label="Total Return"      value={`${m.total_return_pct >= 0 ? '+' : ''}${m.total_return_pct?.toFixed(2)}`} suffix="%" icon="📈" color={m.total_return_pct >= 0 ? 'green' : 'red'} />
              <MetricCard label="Annualized Return" value={`${m.annualized_return_pct >= 0 ? '+' : ''}${m.annualized_return_pct?.toFixed(2)}`} suffix="%" icon="📅" color={m.annualized_return_pct >= 0 ? 'green' : 'red'} />
              <MetricCard label="Sharpe Ratio"      value={m.sharpe_ratio?.toFixed(2)} icon="⚖️" color={m.sharpe_ratio >= 1 ? 'green' : m.sharpe_ratio >= 0 ? 'amber' : 'red'} />
              <MetricCard label="Sortino Ratio"     value={m.sortino_ratio?.toFixed(2)} icon="📉" color={m.sortino_ratio >= 1 ? 'green' : 'amber'} />
              <MetricCard label="Max Drawdown"      value={`-${m.max_drawdown_pct?.toFixed(2)}`} suffix="%" icon="🔻" color="red" />
              <MetricCard label="Win Rate"          value={m.win_rate_pct?.toFixed(1)} suffix="%" icon="🏆" color={m.win_rate_pct >= 50 ? 'green' : 'amber'} />
              <MetricCard label="Volatility"        value={m.volatility_pct?.toFixed(2)} suffix="%" icon="〰️" color="slate" />
              <MetricCard label="vs Benchmark"      value={`${(m.total_return_pct - m.benchmark_return_pct) >= 0 ? '+' : ''}${(m.total_return_pct - m.benchmark_return_pct).toFixed(2)}`} suffix="%" icon="📊" color={(m.total_return_pct - m.benchmark_return_pct) >= 0 ? 'green' : 'red'} />
            </div>
          </div>

          {/* Equity curve */}
          <div className="card">
            <h3 className="font-semibold text-slate-800 mb-1">Equity Curve</h3>
            <p className="text-xs text-slate-500 mb-4">Strategy portfolio value vs Buy & Hold benchmark</p>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={result.equity_curve}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(2, 10)} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v, n) => [`$${Number(v).toLocaleString('en-US', {maximumFractionDigits: 0})}`, n]} />
                <Legend />
                <Line type="monotone" dataKey="portfolio_value" name="Strategy" stroke="#2563eb" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="benchmark_value" name="Buy & Hold" stroke="#94a3b8" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Drawdown chart */}
          <div className="card">
            <h3 className="font-semibold text-slate-800 mb-1">Drawdown</h3>
            <p className="text-xs text-slate-500 mb-4">Percentage decline from peak portfolio value</p>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={result.equity_curve}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(2, 10)} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${v.toFixed(1)}%`} />
                <Tooltip formatter={(v) => [`${v.toFixed(2)}%`, 'Drawdown']} />
                <ReferenceLine y={0} stroke="#94a3b8" />
                <Area type="monotone" dataKey="drawdown_pct" fill="#fee2e2" stroke="#ef4444" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Trade log */}
          <div className="card">
            <h3 className="font-semibold text-slate-800 mb-1">Trade Log</h3>
            <p className="text-xs text-slate-500 mb-4">
              {result.trade_log.length} trade{result.trade_log.length !== 1 ? 's' : ''} executed ·
              {result.metrics.winning_trades} winning · {result.metrics.losing_trades} losing
            </p>
            <div className="overflow-x-auto rounded-lg border border-slate-100">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {['#', 'Entry Date', 'Entry Price', 'Exit Date', 'Exit Price', 'Direction', 'Qty', 'P&L', 'Return'].map(h => (
                      <th key={h} className="table-header whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.trade_log.map((t, i) => (
                    <tr key={i} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="table-cell text-slate-400">{t.id}</td>
                      <td className="table-cell font-mono text-xs">{t.entry_date}</td>
                      <td className="table-cell">${t.entry_price.toFixed(2)}</td>
                      <td className="table-cell font-mono text-xs">{t.exit_date}</td>
                      <td className="table-cell">${t.exit_price.toFixed(2)}</td>
                      <td className="table-cell"><span className="badge badge-blue">{t.direction}</span></td>
                      <td className="table-cell">{t.quantity}</td>
                      <td className={`table-cell font-semibold ${t.pnl >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}
                      </td>
                      <td className={`table-cell font-semibold ${t.return_pct >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {t.return_pct >= 0 ? '+' : ''}{t.return_pct.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                  {result.trade_log.length === 0 && (
                    <tr>
                      <td colSpan={9} className="table-cell text-center text-slate-400 py-6">
                        No trades executed in this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Methodology */}
          {result.methodology && (
            <div className="card bg-slate-50 border border-slate-200">
              <h3 className="font-semibold text-slate-800 mb-3">📖 Anti-Look-Ahead Bias Methodology</h3>
              <div className="grid md:grid-cols-2 gap-3">
                {['rule_1','rule_2','rule_3','rule_4'].map(k => result.methodology[k] && (
                  <div key={k} className="bg-white border border-slate-200 rounded-lg p-3">
                    <p className="text-xs text-slate-600">{result.methodology[k]}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
