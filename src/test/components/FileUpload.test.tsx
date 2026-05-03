import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import FileUpload from '../../components/FileUpload'
import * as clientModule from '../../api/client'

vi.mock('../../api/client')

const mockUpload = vi.mocked(clientModule.uploadFiles)

// Build a FileList-compatible object that Array.from() can consume.
function makeFileList(files: File[]): FileList {
  return Object.assign(files.slice(), {
    item: (i: number) => files[i] ?? null,
  }) as unknown as FileList
}

function selectFiles(container: HTMLElement, files: File[]) {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]')!
  Object.defineProperty(input, 'files', {
    value: makeFileList(files),
    configurable: true,
  })
  fireEvent.change(input)
}

describe('FileUpload', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders title, subtitle and dropzone', () => {
    render(<FileUpload />)
    expect(screen.getByText('Upload Documents')).toBeInTheDocument()
    expect(screen.getByText(/PDF and TXT files/)).toBeInTheDocument()
    expect(screen.getByText(/Drop files here/)).toBeInTheDocument()
  })

  it('does not show file list or clear button when empty', () => {
    render(<FileUpload />)
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    expect(screen.queryByText('Clear list')).not.toBeInTheDocument()
  })

  it('shows file as done and ingest summary on successful upload', async () => {
    mockUpload.mockResolvedValueOnce({ files: ['report.pdf'], ingested: 7 })
    const { container } = render(<FileUpload />)

    selectFiles(container, [new File(['x'], 'report.pdf', { type: 'application/pdf' })])

    await waitFor(() => expect(screen.getByText(/✓ ingested/)).toBeInTheDocument())
    expect(screen.getByText('report.pdf')).toBeInTheDocument()
    expect(screen.getByText(/7 chunks ingested from 1 file/)).toBeInTheDocument()
  })

  it('uses plural "chunks" / "files" for counts > 1', async () => {
    mockUpload.mockResolvedValueOnce({ files: ['a.pdf', 'b.txt'], ingested: 2 })
    const { container } = render(<FileUpload />)

    selectFiles(container, [
      new File(['a'], 'a.pdf', { type: 'application/pdf' }),
      new File(['b'], 'b.txt', { type: 'text/plain' }),
    ])

    await waitFor(() => screen.getAllByText(/✓ ingested/))
    expect(screen.getByText(/2 chunks ingested from 2 files/)).toBeInTheDocument()
  })

  it('shows error badge with message on failed upload', async () => {
    mockUpload.mockRejectedValueOnce(new Error('Server unreachable'))
    const { container } = render(<FileUpload />)

    selectFiles(container, [new File(['x'], 'bad.pdf', { type: 'application/pdf' })])

    await waitFor(() => expect(screen.getByText(/Server unreachable/)).toBeInTheDocument())
  })

  it('shows generic error message when error is not an Error instance', async () => {
    mockUpload.mockRejectedValueOnce('string error')
    const { container } = render(<FileUpload />)

    selectFiles(container, [new File(['x'], 'bad.pdf')])

    await waitFor(() => expect(screen.getByText(/Upload failed/)).toBeInTheDocument())
  })

  it('ignores unsupported file types silently', () => {
    const { container } = render(<FileUpload />)

    selectFiles(container, [new File(['x'], 'photo.png', { type: 'image/png' })])

    expect(mockUpload).not.toHaveBeenCalled()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('clears file list and ingest summary when Clear list is clicked', async () => {
    mockUpload.mockResolvedValueOnce({ files: ['a.pdf'], ingested: 1 })
    const { container } = render(<FileUpload />)

    selectFiles(container, [new File(['a'], 'a.pdf')])
    await waitFor(() => screen.getByText('Clear list'))

    fireEvent.click(screen.getByText('Clear list'))

    expect(screen.queryByText('a.pdf')).not.toBeInTheDocument()
    expect(screen.queryByText(/chunks ingested/)).not.toBeInTheDocument()
  })

  it('adds dropzone--active class on dragover and removes on dragleave', () => {
    const { container } = render(<FileUpload />)
    const dropzone = container.querySelector('.dropzone')!

    fireEvent.dragOver(dropzone)
    expect(dropzone).toHaveClass('dropzone--active')

    fireEvent.dragLeave(dropzone)
    expect(dropzone).not.toHaveClass('dropzone--active')
  })

  it('triggers file input click when dropzone is clicked', () => {
    const { container } = render(<FileUpload />)
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!
    const clickSpy = vi.spyOn(input, 'click').mockImplementation(() => {})

    fireEvent.click(container.querySelector('.dropzone')!)

    expect(clickSpy).toHaveBeenCalledOnce()
  })

  it('formats file sizes correctly', async () => {
    mockUpload.mockResolvedValueOnce({ files: ['tiny.txt'], ingested: 1 })
    const { container } = render(<FileUpload />)
    // 500 B
    selectFiles(container, [new File([new Uint8Array(500)], 'tiny.txt')])
    await waitFor(() => screen.getByText(/✓ ingested/))
    expect(screen.getByText('500 B')).toBeInTheDocument()
  })

  it('formats kilobyte sizes', async () => {
    mockUpload.mockResolvedValueOnce({ files: ['mid.txt'], ingested: 1 })
    const { container } = render(<FileUpload />)
    selectFiles(container, [new File([new Uint8Array(2048)], 'mid.txt')])
    await waitFor(() => screen.getByText(/✓ ingested/))
    expect(screen.getByText('2.0 KB')).toBeInTheDocument()
  })

  it('formats megabyte sizes', async () => {
    mockUpload.mockResolvedValueOnce({ files: ['big.pdf'], ingested: 1 })
    const { container } = render(<FileUpload />)
    selectFiles(container, [new File([new Uint8Array(1024 * 1024 * 2)], 'big.pdf')])
    await waitFor(() => screen.getByText(/✓ ingested/))
    expect(screen.getByText('2.0 MB')).toBeInTheDocument()
  })
})
