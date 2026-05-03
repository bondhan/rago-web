import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { chat, Document } from '../api/client'
import { logger } from '../logger'
import './Chat.css'

interface Message {
  role: 'user' | 'assistant'
  text: string
  sources?: Document[]
  error?: boolean
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    logger.debug('send', text)
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', text }])
    setLoading(true)
    try {
      const res = await chat(text)
      logger.debug('chat response', res.answer)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: res.answer, sources: res.sources },
      ])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Request failed'
      logger.error('chat error', msg)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: msg, error: true },
      ])
    } finally {
      setLoading(false)
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="chat-panel">
      <h2 className="panel-title">Ask the Knowledge Base</h2>

      <div className="chat-messages">
        {messages.length === 0 && (
          <p className="chat-empty">
            Upload documents on the left, then ask anything about them.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`bubble bubble--${m.role}${m.error ? ' bubble--error' : ''}`}>
            <p className="bubble-text">{m.text}</p>
            {m.sources && m.sources.length > 0 && (
              <details className="sources">
                <summary>{m.sources.length} source{m.sources.length !== 1 ? 's' : ''}</summary>
                <ul>
                  {m.sources.map((s, j) => (
                    <li key={j}>
                      <span className="source-file">{s.filename}</span>
                      <span className="source-score">{(s.score * 100).toFixed(0)}%</span>
                      <p className="source-chunk">{s.chunk.slice(0, 200)}…</p>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        ))}
        {loading && (
          <div className="bubble bubble--assistant">
            <span className="typing-dots"><span /><span /><span /></span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-row">
        <textarea
          className="chat-input"
          rows={2}
          placeholder="Ask a question… (Enter to send, Shift+Enter for newline)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={loading}
        />
        <button
          className="btn-send"
          onClick={send}
          disabled={!input.trim() || loading}
        >
          Send
        </button>
      </div>
    </div>
  )
}
