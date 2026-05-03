import { useState, useRef, DragEvent, ChangeEvent } from 'react'
import { uploadFiles, UploadResponse } from '../api/client'
import { logger } from '../logger'
import './FileUpload.css'

interface UploadedFile {
  name: string
  size: number
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
}

interface Props {
  onUploaded?: () => void
}

export default function FileUpload({ onUploaded }: Props) {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [dragging, setDragging] = useState(false)
  const [lastResult, setLastResult] = useState<UploadResponse | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function accept(raw: FileList | null) {
    if (!raw) return
    const valid = Array.from(raw).filter(
      (f) => f.name.endsWith('.pdf') || f.name.endsWith('.txt'),
    )
    if (valid.length === 0) return
    setFiles((prev) => [
      ...prev,
      ...valid.map((f) => ({ name: f.name, size: f.size, status: 'pending' as const })),
    ])
    upload(valid)
  }

  async function upload(raw: File[]) {
    logger.info('uploading', raw.map((f) => f.name))
    setFiles((prev) =>
      prev.map((f) =>
        raw.some((r) => r.name === f.name) ? { ...f, status: 'uploading' } : f,
      ),
    )
    try {
      const result = await uploadFiles(raw)
      logger.info('upload done', result)
      setLastResult(result)
      onUploaded?.()
      setFiles((prev) =>
        prev.map((f) =>
          raw.some((r) => r.name === f.name) ? { ...f, status: 'done' } : f,
        ),
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      logger.error('upload error', msg)
      setFiles((prev) =>
        prev.map((f) =>
          raw.some((r) => r.name === f.name)
            ? { ...f, status: 'error', error: msg }
            : f,
        ),
      )
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragging(false)
    accept(e.dataTransfer.files)
  }

  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragging(true)
  }

  function onInputChange(e: ChangeEvent<HTMLInputElement>) {
    accept(e.target.files)
    e.target.value = ''
  }

  function clearAll() {
    setFiles([])
    setLastResult(null)
  }

  return (
    <div className="upload-panel">
      <h2 className="panel-title">Upload Documents</h2>
      <p className="panel-subtitle">PDF and TXT files are ingested into the knowledge base.</p>

      <div
        className={`dropzone${dragging ? ' dropzone--active' : ''}`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={() => setDragging(false)}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt"
          multiple
          hidden
          onChange={onInputChange}
        />
        <span className="dropzone-icon">📂</span>
        <p className="dropzone-label">Drop files here or <u>browse</u></p>
        <p className="dropzone-hint">Accepts .pdf and .txt</p>
      </div>

      {files.length > 0 && (
        <ul className="file-list">
          {files.map((f) => (
            <li key={f.name} className={`file-item file-item--${f.status}`}>
              <span className="file-name">{f.name}</span>
              <span className="file-meta">{formatBytes(f.size)}</span>
              <span className="file-badge">
                {f.status === 'pending' && '⏳ queued'}
                {f.status === 'uploading' && '⬆ uploading…'}
                {f.status === 'done' && '✓ ingested'}
                {f.status === 'error' && `✗ ${f.error}`}
              </span>
            </li>
          ))}
        </ul>
      )}

      {lastResult && (
        <p className="ingest-summary">
          ✓ {lastResult.ingested} chunk{lastResult.ingested !== 1 ? 's' : ''} ingested from {lastResult.files.length} file{lastResult.files.length !== 1 ? 's' : ''}
        </p>
      )}

      {files.length > 0 && (
        <button className="btn-ghost" onClick={clearAll}>
          Clear list
        </button>
      )}
    </div>
  )
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
