import { logger } from '../logger'

const BASE = ''  // proxied by Vite in dev; same origin in prod

export interface Document {
  filename: string
  chunk: string
  score: number
}

export interface ChatResponse {
  answer: string
  sources: Document[]
}

export interface UploadResponse {
  files: string[]
  ingested: number
}

export async function uploadFiles(files: File[]): Promise<UploadResponse> {
  logger.info('uploadFiles', files.map((f) => f.name))
  const form = new FormData()
  for (const f of files) form.append('files', f)

  const res = await fetch(`${BASE}/upload`, { method: 'POST', body: form })
  if (!res.ok) {
    const msg = await res.text()
    logger.error('uploadFiles failed', msg)
    throw new Error(msg)
  }
  return res.json()
}

export async function chat(message: string, k = 5): Promise<ChatResponse> {
  logger.debug('chat', { message, k })
  const res = await fetch(`${BASE}/v1/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, k }),
  })
  if (!res.ok) {
    const msg = await res.text()
    logger.error('chat failed', msg)
    throw new Error(msg)
  }
  return res.json()
}

export async function query(q: string, k = 5): Promise<Document[]> {
  logger.debug('query', { q, k })
  const res = await fetch(`${BASE}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q, k }),
  })
  if (!res.ok) {
    const msg = await res.text()
    logger.error('query failed', msg)
    throw new Error(msg)
  }
  const data = await res.json()
  return data.results as Document[]
}

export async function resetDB(): Promise<void> {
  logger.info('resetDB')
  const res = await fetch(`${BASE}/v1/reset`, { method: 'DELETE' })
  if (!res.ok) {
    const msg = await res.text()
    logger.error('resetDB failed', msg)
    throw new Error(msg)
  }
}
