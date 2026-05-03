import { describe, it, expect, vi, beforeEach } from 'vitest'
import { uploadFiles, chat, query, listUploads, resetDB } from '../../api/client'

// Helper: build a minimal Response-like object for fetch mocks.
function mockResponse(status: number, body: unknown) {
  const text = typeof body === 'string' ? body : JSON.stringify(body)
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(text),
  } as unknown as Response
}

function stubFetch(status: number, body: unknown) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse(status, body))
}

describe('api/client', () => {
  beforeEach(() => vi.restoreAllMocks())

  // ── uploadFiles ──────────────────────────────────────────────────────────

  describe('uploadFiles', () => {
    it('POSTs to /upload and returns parsed result', async () => {
      const spy = stubFetch(200, { files: ['a.pdf'], ingested: 3 })
      const file = new File(['content'], 'a.pdf', { type: 'application/pdf' })

      const result = await uploadFiles([file])

      expect(spy).toHaveBeenCalledWith(
        '/v1/upload',
        expect.objectContaining({ method: 'POST' }),
      )
      expect(result).toEqual({ files: ['a.pdf'], ingested: 3 })
    })

    it('appends every file to the FormData', async () => {
      stubFetch(200, { files: ['a.pdf', 'b.txt'], ingested: 5 })
      const fileA = new File(['a'], 'a.pdf', { type: 'application/pdf' })
      const fileB = new File(['b'], 'b.txt', { type: 'text/plain' })

      await uploadFiles([fileA, fileB])

      const [, init] = vi.mocked(globalThis.fetch).mock.calls[0]
      const form = (init as RequestInit).body as FormData
      expect(form.getAll('files')).toHaveLength(2)
    })

    it('throws with server message on non-ok response', async () => {
      stubFetch(500, 'disk full')
      const file = new File(['x'], 'a.txt')

      await expect(uploadFiles([file])).rejects.toThrow('disk full')
    })
  })

  // ── chat ─────────────────────────────────────────────────────────────────

  describe('chat', () => {
    it('POSTs to /v1/chat and returns answer + sources', async () => {
      const spy = stubFetch(200, { answer: 'Hello', sources: [] })

      const result = await chat('what is X?')

      expect(spy).toHaveBeenCalledWith(
        '/v1/chat',
        expect.objectContaining({ method: 'POST' }),
      )
      expect(result.answer).toBe('Hello')
      expect(result.sources).toEqual([])
    })

    it('sends custom k value in request body', async () => {
      stubFetch(200, { answer: 'ok', sources: [] })

      await chat('q', 10)

      const [, init] = vi.mocked(globalThis.fetch).mock.calls[0]
      const body = JSON.parse((init as RequestInit).body as string)
      expect(body.k).toBe(10)
    })

    it('defaults k to 5 when not provided', async () => {
      stubFetch(200, { answer: 'ok', sources: [] })

      await chat('q')

      const [, init] = vi.mocked(globalThis.fetch).mock.calls[0]
      const body = JSON.parse((init as RequestInit).body as string)
      expect(body.k).toBe(5)
    })

    it('throws on non-ok response', async () => {
      stubFetch(400, 'message required')

      await expect(chat('q')).rejects.toThrow('message required')
    })
  })

  // ── query ─────────────────────────────────────────────────────────────────

  describe('query', () => {
    it('POSTs to /query and returns documents array', async () => {
      const docs = [{ filename: 'f.pdf', chunk: 'abc', score: 0.9 }]
      stubFetch(200, { results: docs })

      const result = await query('search term')

      expect(result).toEqual(docs)
    })

    it('defaults k to 5', async () => {
      stubFetch(200, { results: [] })

      await query('q')

      const [, init] = vi.mocked(globalThis.fetch).mock.calls[0]
      const body = JSON.parse((init as RequestInit).body as string)
      expect(body.k).toBe(5)
    })

    it('throws on non-ok response', async () => {
      stubFetch(503, 'service unavailable')

      await expect(query('q')).rejects.toThrow('service unavailable')
    })
  })

  // ── listUploads ──────────────────────────────────────────────────────────

  describe('listUploads', () => {
    it('GETs /uploads with page and limit params and returns UploadPage', async () => {
      const page = {
        items: [{ id: 1, filename: 'a.pdf', size_bytes: 1024, ingested_at: '2026-05-03T10:00:00Z' }],
        total: 1, page: 1, limit: 5,
      }
      const spy = stubFetch(200, page)

      const result = await listUploads(1, 5)

      expect(spy).toHaveBeenCalledWith('/v1/uploads?page=1&limit=5')
      expect(result).toEqual(page)
    })

    it('uses defaults page=1 limit=5 when not provided', async () => {
      stubFetch(200, { items: [], total: 0, page: 1, limit: 5 })

      await listUploads()

      expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledWith('/v1/uploads?page=1&limit=5')
    })

    it('throws on non-ok response', async () => {
      stubFetch(500, 'internal error')

      await expect(listUploads()).rejects.toThrow('internal error')
    })
  })

  // ── resetDB ───────────────────────────────────────────────────────────────

  describe('resetDB', () => {
    it('sends DELETE to /v1/reset', async () => {
      const spy = stubFetch(200, { status: 'ok' })

      await resetDB()

      expect(spy).toHaveBeenCalledWith(
        '/v1/reset',
        expect.objectContaining({ method: 'DELETE' }),
      )
    })

    it('throws on non-ok response', async () => {
      stubFetch(500, 'reset failed')

      await expect(resetDB()).rejects.toThrow('reset failed')
    })
  })
})
