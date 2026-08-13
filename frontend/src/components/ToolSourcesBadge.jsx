import { useState } from 'react'

export default function ToolSourcesBadge({ sources = [] }) {
  const [open, setOpen] = useState(false)
  if (!sources?.length) return null

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-xs text-accent-600 hover:text-accent-700 font-medium transition-colors"
        id="tool-sources-toggle"
      >
        <span className="w-4 h-4 bg-accent-100 rounded-full flex items-center justify-center text-accent-600 text-xs">🔍</span>
        {sources.length} DataMart tool call{sources.length !== 1 ? 's' : ''} — grounded answer
        <span className="ml-1">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          {sources.map((src, i) => (
            <div key={i} className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs font-mono">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="badge badge-blue">{src.tool_name}</span>
                <span className="text-slate-400">{src.timestamp}</span>
              </div>
              <div className="text-slate-600 mb-1">
                <span className="text-slate-400">args: </span>
                {JSON.stringify(src.arguments)}
              </div>
              <div className="text-slate-700 break-all">
                <span className="text-slate-400">result: </span>
                {typeof src.result === 'object'
                  ? JSON.stringify(src.result).slice(0, 300) + (JSON.stringify(src.result).length > 300 ? '…' : '')
                  : String(src.result).slice(0, 300)
                }
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
