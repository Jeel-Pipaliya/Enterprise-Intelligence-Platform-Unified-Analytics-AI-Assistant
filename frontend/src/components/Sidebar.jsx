import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ALL_LINKS = {
  dashboard: { to: '/', label: 'Dashboard', icon: '⬛', exact: true, roles: ['customer', 'analyst', 'admin'] },
  backtest: { to: '/backtest', label: 'Backtesting Engine', icon: '📈', roles: ['analyst', 'admin'] },
  datamart: { to: '/datamart', label: 'DataMart Analytics', icon: '🗃️', roles: ['customer', 'analyst', 'admin'] },
  intelligence: { to: '/intelligence', label: 'Intelligence Bridge', icon: '🔗', roles: ['analyst', 'admin'] },
  assistant: { to: '/assistant', label: 'AI Copilot', icon: '🤖', roles: ['customer', 'analyst', 'admin'] },
}

function linksForRole(role) {
  return Object.values(ALL_LINKS).filter(l => l.roles.includes(role))
}

export default function Sidebar() {
  const { user } = useAuth()
  const role = user?.role || 'customer'
  const links = linksForRole(role)

  const overview = links.filter(l => l.to === '/')
  const modules = links.filter(l => l.to !== '/')

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 h-full">
      <div className="px-5 py-5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-accent-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">EI</span>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">Enterprise</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight">Intelligence Platform</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {overview.length > 0 && (
          <div>
            <p className="px-3 mb-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">Overview</p>
            <ul className="space-y-0.5">
              {overview.map(link => (
                <li key={link.to}>
                  <NavLink to={link.to} end={link.exact} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                    <span className="text-base">{link.icon}</span>
                    <span>{link.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        )}

        {modules.length > 0 && (
          <div>
            <p className="px-3 mb-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">Modules</p>
            <ul className="space-y-0.5">
              {modules.map(link => (
                <li key={link.to}>
                  <NavLink to={link.to} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                    <span className="text-base">{link.icon}</span>
                    <span>{link.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>

      {user && (
        <div className="px-4 py-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-200">
                {user.full_name?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{user.full_name}</p>
              <p className="text-xs text-slate-400 capitalize">{user.role} view</p>
            </div>
            <span className={`badge ml-auto ${
              user.role === 'admin' ? 'badge-blue' :
              user.role === 'analyst' ? 'badge-green' : 'badge-slate'
            }`}>
              {user.role}
            </span>
          </div>
        </div>
      )}
    </aside>
  )
}
