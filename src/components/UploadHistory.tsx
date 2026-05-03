import { useState, useEffect } from 'react'
import { listUploads, UploadRecord } from '../api/client'
import { logger } from '../logger'
import './UploadHistory.css'

const PAGE_SIZE = 5

interface Props {
  refreshKey: number
}

export default function UploadHistory({ refreshKey }: Props) {
  const [items, setItems] = useState<UploadRecord[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Whenever a new upload completes (refreshKey bumps), reset to page 1.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    listUploads(1, PAGE_SIZE)
      .then((data) => {
        if (cancelled) return
        setItems(data.items)
        setTotal(data.total)
        setPage(1)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const msg = err instanceof Error ? err.message : 'Failed to load history'
        logger.error('UploadHistory fetch failed', msg)
        setError(msg)
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [refreshKey])

  async function loadMore() {
    const nextPage = page + 1
    setLoading(true)
    setError('')
    try {
      const data = await listUploads(nextPage, PAGE_SIZE)
      setItems((prev) => [...prev, ...data.items])
      setTotal(data.total)
      setPage(nextPage)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load more'
      logger.error('UploadHistory loadMore failed', msg)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const hasMore = items.length < total

  return (
    <div className="upload-history">
      <div className="upload-history-header">
        <h3 className="upload-history-title">Upload History</h3>
        {total > 0 && <span className="upload-history-count">{total} file{total !== 1 ? 's' : ''}</span>}
      </div>

      {error && <p className="upload-history-error">{error}</p>}

      {!loading && items.length === 0 && !error && (
        <p className="upload-history-empty">No files uploaded yet.</p>
      )}

      {items.length > 0 && (
        <ul className="history-list">
          {items.map((item) => (
            <li key={item.id} className="history-item">
              <div className="history-item-name" title={item.filename}>
                {item.filename}
              </div>
              <div className="history-item-meta">
                <span className="history-size">{formatBytes(item.size_bytes)}</span>
                <span className="history-date">{formatDate(item.ingested_at)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {hasMore && (
        <button className="btn-show-more" onClick={loadMore} disabled={loading}>
          {loading ? 'Loading…' : `Show more (${total - items.length} remaining)`}
        </button>
      )}

      {loading && items.length === 0 && (
        <p className="upload-history-loading">Loading…</p>
      )}
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
