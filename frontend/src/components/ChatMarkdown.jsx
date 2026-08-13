import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const markdownComponents = {
  h1: ({ children }) => (
    <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50 mt-4 mb-2 first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mt-4 mb-2 first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 mt-3 mb-1.5 first:mt-0">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="text-[15px] leading-7 text-slate-700 dark:text-slate-200 mb-3 last:mb-0">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc pl-5 mb-3 space-y-1.5 text-[15px] text-slate-700 dark:text-slate-200">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-5 mb-3 space-y-1.5 text-[15px] text-slate-700 dark:text-slate-200">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="leading-7">{children}</li>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-slate-900 dark:text-white">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-slate-600 dark:text-slate-300">{children}</em>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-accent-400 pl-4 my-3 text-slate-600 dark:text-slate-300 italic bg-slate-50 dark:bg-slate-800/50 py-2 rounded-r-lg">
      {children}
    </blockquote>
  ),
  code: ({ inline, className, children }) => {
    if (inline) {
      return (
        <code className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-accent-700 dark:text-accent-300 text-[13px] font-mono">
          {children}
        </code>
      )
    }
    return (
      <code className={`block overflow-x-auto rounded-lg bg-slate-900 text-slate-100 p-4 text-[13px] font-mono my-3 ${className || ''}`}>
        {children}
      </code>
    )
  },
  pre: ({ children }) => (
    <pre className="my-3 overflow-x-auto rounded-lg">{children}</pre>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-3 rounded-lg border border-slate-200 dark:border-slate-700">
      <table className="min-w-full text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="px-3 py-2 text-left font-semibold border-b border-slate-200 dark:border-slate-700">{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-200">{children}</td>
  ),
  hr: () => <hr className="my-4 border-slate-200 dark:border-slate-700" />,
  a: ({ href, children }) => (
    <a href={href} className="text-accent-600 dark:text-accent-400 underline hover:text-accent-700" target="_blank" rel="noreferrer">
      {children}
    </a>
  ),
}

export default function ChatMarkdown({ content }) {
  return (
    <div className="chat-markdown max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content || ''}
      </ReactMarkdown>
    </div>
  )
}
