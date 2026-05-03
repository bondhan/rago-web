import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import UploadHistory from '../../components/UploadHistory'
import * as clientModule from '../../api/client'

vi.mock('../../api/client')

const mockListUploads = vi.mocked(clientModule.listUploads)

const makeRecord = (id: number, filename = `file${id}.pdf`, size = 1024): clientModule.UploadRecord => ({
  id,
  filename,
  size_bytes: size,
  ingested_at: new Date(2026, 4, id).toISOString(),
})

const emptyPage = (): clientModule.UploadPage => ({
  items: [], total: 0, page: 1, limit: 5,
})

const singlePage = (records: clientModule.UploadRecord[]): clientModule.UploadPage => ({
  items: records, total: records.length, page: 1, limit: 5,
})

describe('UploadHistory', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows empty state when no uploads exist', async () => {
    mockListUploads.mockResolvedValueOnce(emptyPage())
    render(<UploadHistory refreshKey={0} />)
    await waitFor(() => expect(screen.getByText('No files uploaded yet.')).toBeInTheDocument())
  })

  it('renders a list of uploaded files', async () => {
    mockListUploads.mockResolvedValueOnce(singlePage([makeRecord(1, 'doc.pdf', 2048)]))
    render(<UploadHistory refreshKey={0} />)

    await waitFor(() => expect(screen.getByText('doc.pdf')).toBeInTheDocument())
    expect(screen.getByText('2.0 KB')).toBeInTheDocument()
  })

  it('shows total file count in the header', async () => {
    mockListUploads.mockResolvedValueOnce({ items: [makeRecord(1)], total: 10, page: 1, limit: 5 })
    render(<UploadHistory refreshKey={0} />)
    await waitFor(() => expect(screen.getByText('10 files')).toBeInTheDocument())
  })

  it('uses singular "file" for total of 1', async () => {
    mockListUploads.mockResolvedValueOnce(singlePage([makeRecord(1)]))
    render(<UploadHistory refreshKey={0} />)
    await waitFor(() => expect(screen.getByText('1 file')).toBeInTheDocument())
  })

  it('hides Show more when all items are loaded', async () => {
    mockListUploads.mockResolvedValueOnce(singlePage([makeRecord(1), makeRecord(2)]))
    render(<UploadHistory refreshKey={0} />)
    await waitFor(() => screen.getByText('file1.pdf'))
    expect(screen.queryByText(/Show more/)).not.toBeInTheDocument()
  })

  it('shows Show more button with remaining count when more items exist', async () => {
    mockListUploads.mockResolvedValueOnce({ items: [makeRecord(1)], total: 8, page: 1, limit: 5 })
    render(<UploadHistory refreshKey={0} />)
    await waitFor(() => expect(screen.getByText(/Show more \(7 remaining\)/)).toBeInTheDocument())
  })

  it('appends next page when Show more is clicked', async () => {
    mockListUploads
      .mockResolvedValueOnce({ items: [makeRecord(1)], total: 2, page: 1, limit: 5 })
      .mockResolvedValueOnce({ items: [makeRecord(2)], total: 2, page: 2, limit: 5 })

    render(<UploadHistory refreshKey={0} />)
    await waitFor(() => screen.getByText('file1.pdf'))

    fireEvent.click(screen.getByText(/Show more/))

    await waitFor(() => expect(screen.getByText('file2.pdf')).toBeInTheDocument())
    expect(screen.getByText('file1.pdf')).toBeInTheDocument()
  })

  it('hides Show more after all pages are loaded', async () => {
    mockListUploads
      .mockResolvedValueOnce({ items: [makeRecord(1)], total: 2, page: 1, limit: 5 })
      .mockResolvedValueOnce({ items: [makeRecord(2)], total: 2, page: 2, limit: 5 })

    render(<UploadHistory refreshKey={0} />)
    await waitFor(() => screen.getByText(/Show more/))
    fireEvent.click(screen.getByText(/Show more/))

    await waitFor(() => screen.getByText('file2.pdf'))
    expect(screen.queryByText(/Show more/)).not.toBeInTheDocument()
  })

  it('resets to page 1 and replaces items when refreshKey changes', async () => {
    mockListUploads
      .mockResolvedValueOnce(singlePage([makeRecord(1, 'first.pdf')]))
      .mockResolvedValueOnce(singlePage([makeRecord(2, 'second.pdf')]))

    const { rerender } = render(<UploadHistory refreshKey={0} />)
    await waitFor(() => screen.getByText('first.pdf'))

    rerender(<UploadHistory refreshKey={1} />)

    await waitFor(() => expect(screen.getByText('second.pdf')).toBeInTheDocument())
    expect(screen.queryByText('first.pdf')).not.toBeInTheDocument()
  })

  it('shows error message when listUploads fails', async () => {
    mockListUploads.mockRejectedValueOnce(new Error('Network error'))
    render(<UploadHistory refreshKey={0} />)
    await waitFor(() => expect(screen.getByText('Network error')).toBeInTheDocument())
  })

  it('shows generic error for non-Error rejection', async () => {
    mockListUploads.mockRejectedValueOnce('boom')
    render(<UploadHistory refreshKey={0} />)
    await waitFor(() => expect(screen.getByText('Failed to load history')).toBeInTheDocument())
  })

  it('shows error when Show more fails', async () => {
    mockListUploads
      .mockResolvedValueOnce({ items: [makeRecord(1)], total: 3, page: 1, limit: 5 })
      .mockRejectedValueOnce(new Error('Timeout'))

    render(<UploadHistory refreshKey={0} />)
    await waitFor(() => screen.getByText(/Show more/))
    fireEvent.click(screen.getByText(/Show more/))

    await waitFor(() => expect(screen.getByText('Timeout')).toBeInTheDocument())
  })

  it('formats zero-byte size as dash', async () => {
    mockListUploads.mockResolvedValueOnce(singlePage([makeRecord(1, 'empty.txt', 0)]))
    render(<UploadHistory refreshKey={0} />)
    await waitFor(() => screen.getByText('empty.txt'))
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('formats byte sizes correctly', async () => {
    mockListUploads.mockResolvedValueOnce(singlePage([makeRecord(1, 'tiny.txt', 512)]))
    render(<UploadHistory refreshKey={0} />)
    await waitFor(() => screen.getByText('512 B'))
  })

  it('formats megabyte sizes', async () => {
    mockListUploads.mockResolvedValueOnce(singlePage([makeRecord(1, 'big.pdf', 1024 * 1024 * 3)]))
    render(<UploadHistory refreshKey={0} />)
    await waitFor(() => screen.getByText('3.0 MB'))
  })
})
