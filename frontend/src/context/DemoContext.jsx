import React, { createContext, useContext } from 'react'
import { useNavigate } from 'react-router-dom'

const DemoContext = createContext(null)

const DEMO_SCRIPT = {
  message: 'Demo mode: Electronics revenue insight → hedge simulation',
  steps: [
    { path: '/', label: 'Dashboard with alerts' },
    { path: '/datamart', label: 'DataMart analytics' },
    { path: '/intelligence', label: 'Category ↔ Ticker bridge' },
    { path: '/assistant', label: 'AI Copilot query', query: 'Why is Electronics revenue important and what hedge should we use for NVDA?' },
    { path: '/backtest', label: 'Strategy comparison' },
  ],
}

export function DemoProvider({ children }) {
  const navigate = useNavigate()

  const runDemo = async () => {
    localStorage.setItem('eip_demo_mode', 'true')
    navigate('/')
    window.dispatchEvent(new CustomEvent('eip-demo-start'))
  }

  return (
    <DemoContext.Provider value={{ runDemo, demoScript: DEMO_SCRIPT }}>
      {children}
    </DemoContext.Provider>
  )
}

export const useDemo = () => useContext(DemoContext)
