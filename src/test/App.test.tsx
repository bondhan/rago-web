import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import * as clientModule from '../api/client'

// Stub out child components so we test App in isolation.
vi.mock('../components/FileUpload', () => ({
  default: () => <div data-testid="file-upload" />,
}))
vi.mock('../components/Chat', () => ({
  default: () => <div data-testid="chat" />,
}))
vi.mock('../api/client')

const mockResetDB = vi.mocked(clientModule.resetDB)

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  afterEach(() => vi.restoreAllMocks())

  it('renders the header, FileUpload panel and Chat panel', () => {
    render(<App />)
    expect(screen.getByText('⚡ RAGO')).toBeInTheDocument()
    expect(screen.getByText('Retrieval-Augmented Generation')).toBeInTheDocument()
    expect(screen.getByTestId('file-upload')).toBeInTheDocument()
    expect(screen.getByTestId('chat')).toBeInTheDocument()
  })

  it('shows Reset KB button in the header', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: 'Reset KB' })).toBeInTheDocument()
  })

  it('shows success message after successful reset', async () => {
    mockResetDB.mockResolvedValueOnce()
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Reset KB' }))

    await waitFor(() =>
      expect(screen.getByText('Knowledge base cleared.')).toBeInTheDocument(),
    )
  })

  it('shows error message when reset fails', async () => {
    mockResetDB.mockRejectedValueOnce(new Error('DB connection lost'))
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Reset KB' }))

    await waitFor(() =>
      expect(screen.getByText('DB connection lost')).toBeInTheDocument(),
    )
  })

  it('shows generic error message for non-Error rejections', async () => {
    mockResetDB.mockRejectedValueOnce('boom')
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Reset KB' }))

    await waitFor(() => expect(screen.getByText('Reset failed')).toBeInTheDocument())
  })

  it('does nothing when confirm is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Reset KB' }))

    expect(mockResetDB).not.toHaveBeenCalled()
  })

  it('disables button and shows Resetting… while in flight', async () => {
    let resolveReset!: () => void
    mockResetDB.mockImplementationOnce(
      () => new Promise<void>((r) => { resolveReset = r }),
    )
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Reset KB' }))

    expect(screen.getByRole('button', { name: 'Resetting…' })).toBeDisabled()

    resolveReset()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Reset KB' })).toBeEnabled(),
    )
  })
})
