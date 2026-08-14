import { useEffect, useState, useRef } from 'react'
import api from '../services/api'
import ChatMarkdown from '../components/ChatMarkdown'

function AssistantAvatar() {
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
      <span className="text-white text-xs font-bold">AI</span>
    </div>
  )
}

function UserAvatar() {
  return (
    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
      <span className="text-slate-600 dark:text-slate-200 text-xs font-bold">You</span>
    </div>
  )
}

function SourcePanel({ sources, expanded, onToggle }) {
  if (!sources?.length) return null
  return (
    <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-accent-600 dark:hover:text-accent-400 transition-colors"
      >
        <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-accent-100 dark:bg-accent-900 text-accent-700 dark:text-accent-300 text-[10px] font-bold">
          {sources.length}
        </span>
        Grounded data sources {expanded ? '▾' : '▸'}
      </button>
      {expanded && (
        <div className="mt-3 space-y-2">
          {sources.map((src, i) => (
            <div key={i} className="rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 p-3">
              <p className="text-xs font-semibold text-accent-700 dark:text-accent-300 mb-1">
                {src.tool_name}
              </p>
              <pre className="text-[11px] text-slate-600 dark:text-slate-400 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
                {JSON.stringify(src.result, null, 2).slice(0, 600)}
                {(JSON.stringify(src.result)?.length || 0) > 600 ? '…' : ''}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AIAssistant() {
  const isAuthError = (err) => err.response?.status === 401 || err.response?.data?.detail === 'Invalid token'
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [expandedSource, setExpandedSource] = useState(null)
  const [conversations, setConversations] = useState([])
  const [activeConvId, setActiveConvId] = useState(null)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    loadConversations()
    const handler = () => {
      setInput('Show smart alerts and recommend a hedge for Electronics using NVDA')
    }
    window.addEventListener('eip-demo-start', handler)
    return () => window.removeEventListener('eip-demo-start', handler)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const loadConversations = async () => {
    try {
      const res = await api.get('/assistant/conversations')
      setConversations(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  const saveConversation = async (updatedMessages, convId) => {
    const title = updatedMessages.find(m => m.role === 'user')?.content?.slice(0, 40) || 'New Chat'
    try {
      if (convId) {
        await api.put(`/assistant/conversations/${convId}`, { messages: updatedMessages, title })
      } else {
        const res = await api.post('/assistant/conversations', { title, messages: updatedMessages })
        setActiveConvId(res.data.id)
      }
      loadConversations()
    } catch (err) {
      console.error(err)
    }
  }

  const loadConversation = async (id) => {
    try {
      const res = await api.get(`/assistant/conversations/${id}`)
      setMessages(res.data.messages || [])
      setActiveConvId(id)
      setExpandedSource(null)
    } catch (err) {
      console.error(err)
    }
  }

  const newChat = () => {
    setMessages([])
    setActiveConvId(null)
    setInput('')
    setExpandedSource(null)
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMsg = { role: 'user', content: input }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await api.post('/assistant/chat', {
        messages: nextMessages,
        customer_id: null,
      })

      const assistantMsg = {
        role: 'assistant',
        content: res.data.reply,
        sources: res.data.sources || [],
      }
      const finalMessages = [...nextMessages, assistantMsg]
      setMessages(finalMessages)
      await saveConversation(finalMessages, activeConvId)
    } catch (err) {
      if (isAuthError(err)) {
        setMessages(m => [...m, {
          role: 'assistant',
          content: '**Session expired**\n\nPlease sign in again to keep chatting.',
          sources: [],
        }])
        return
      }
      setMessages(m => [...m, {
        role: 'assistant',
        content: `**Something went wrong**\n\n${err.response?.data?.detail || err.message}`,
        sources: [],
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const quickQueries = [
    'Hi, what can you help me with?',
    'Show smart alerts and recommendations',
    'Why is Electronics important? Suggest NVDA hedge',
    'Run backtest on AAPL with moving average',
    'Top products in Electronics',
    'What is our total revenue?',
    'Show order ORD-1001 status',
  ]

  return (
    <div className="flex h-[calc(100vh-8rem)] max-w-5xl mx-auto gap-4">
      <div className="hidden md:flex flex-col w-52 shrink-0">
        <button onClick={newChat} className="btn-primary text-sm mb-3">+ New chat</button>
        <div className="flex-1 overflow-y-auto space-y-1">
          {conversations.map(c => (
            <button
              key={c.id}
              onClick={() => loadConversation(c.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs truncate transition-colors ${
                activeConvId === c.id
                  ? 'bg-accent-100 dark:bg-accent-900 text-accent-700 dark:text-accent-300'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              {c.title}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col flex-1 min-w-0 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Enterprise AI Copilot</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Grounded answers from DataMart, alerts & backtesting</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-6 py-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-500 to-indigo-600 flex items-center justify-center mb-5 shadow-lg">
                <span className="text-white text-xl">✦</span>
              </div>
              <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">How can I help you today?</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 mb-8 max-w-md leading-relaxed">
                Ask about revenue, inventory alerts, product recommendations, or run a hedge backtest — I'll respond with structured, data-backed answers.
              </p>
              <div className="grid sm:grid-cols-2 gap-2 w-full max-w-lg">
                {quickQueries.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(q)}
                    className="text-left px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-accent-300 dark:hover:border-accent-700 hover:bg-accent-50 dark:hover:bg-accent-900/20 text-sm text-slate-700 dark:text-slate-200 transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`px-4 sm:px-6 py-6 ${
                    msg.role === 'assistant'
                      ? 'bg-slate-50/50 dark:bg-slate-950/30'
                      : 'bg-white dark:bg-slate-900'
                  }`}
                >
                  <div className="flex gap-4 max-w-3xl mx-auto">
                    {msg.role === 'assistant' ? <AssistantAvatar /> : <UserAvatar />}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                        {msg.role === 'assistant' ? 'Copilot' : 'You'}
                      </p>
                      {msg.role === 'user' ? (
                        <p className="text-[15px] leading-7 text-slate-800 dark:text-slate-100 whitespace-pre-wrap">
                          {msg.content}
                        </p>
                      ) : (
                        <>
                          <ChatMarkdown content={msg.content} />
                          <SourcePanel
                            sources={msg.sources}
                            expanded={expandedSource === idx}
                            onToggle={() => setExpandedSource(expandedSource === idx ? null : idx)}
                          />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="px-4 sm:px-6 py-6 bg-slate-50/50 dark:bg-slate-950/30">
                  <div className="flex gap-4 max-w-3xl mx-auto">
                    <AssistantAvatar />
                    <div className="flex-1 pt-1">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Copilot</p>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="max-w-3xl mx-auto relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message Copilot…"
              rows="1"
              className="w-full resize-none rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-3 pr-14 text-[15px] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-500/40 focus:border-accent-500 shadow-sm"
              disabled={loading}
              style={{ minHeight: '48px', maxHeight: '160px' }}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="absolute right-2 bottom-2 w-9 h-9 rounded-xl bg-accent-600 hover:bg-accent-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white flex items-center justify-center transition-colors"
              aria-label="Send message"
            >
              ↑
            </button>
          </div>
          <p className="text-center text-[11px] text-slate-400 mt-2">Copilot may make mistakes. Verify important data with DataMart.</p>
        </div>
      </div>
    </div>
  )
}
