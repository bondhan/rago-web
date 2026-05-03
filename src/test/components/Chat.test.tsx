import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Chat from '../../components/Chat'
import * as clientModule from '../../api/client'

vi.mock('../../api/client')

const mockChat = vi.mocked(clientModule.chat)

describe('Chat', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders title and empty-state hint', () => {
    render(<Chat />)
    expect(screen.getByText('Ask the Knowledge Base')).toBeInTheDocument()
    expect(screen.getByText(/Upload documents on the left/)).toBeInTheDocument()
  })

  it('Send button is disabled when input is empty', () => {
    render(<Chat />)
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
  })

  it('Send button becomes enabled when text is typed', async () => {
    const user = userEvent.setup()
    render(<Chat />)
    await user.type(screen.getByRole('textbox'), 'hello')
    expect(screen.getByRole('button', { name: 'Send' })).toBeEnabled()
  })

  it('sends message via button click and displays response', async () => {
    mockChat.mockResolvedValueOnce({ answer: 'The answer is 42', sources: [] })
    const user = userEvent.setup()
    render(<Chat />)

    await user.type(screen.getByRole('textbox'), 'What is the answer?')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(screen.getByText('What is the answer?')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('The answer is 42')).toBeInTheDocument())
    expect(mockChat).toHaveBeenCalledWith('What is the answer?')
  })

  it('clears input after sending', async () => {
    mockChat.mockResolvedValueOnce({ answer: 'ok', sources: [] })
    const user = userEvent.setup()
    render(<Chat />)
    const textarea = screen.getByRole('textbox')

    await user.type(textarea, 'hello')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() => expect(textarea).toHaveValue(''))
  })

  it('sends message via Enter key', async () => {
    mockChat.mockResolvedValueOnce({ answer: 'via enter', sources: [] })
    const user = userEvent.setup()
    render(<Chat />)

    await user.type(screen.getByRole('textbox'), 'enter question')
    await user.keyboard('{Enter}')

    await waitFor(() => expect(screen.getByText('via enter')).toBeInTheDocument())
  })

  it('does not send on Shift+Enter', async () => {
    const user = userEvent.setup()
    render(<Chat />)

    await user.type(screen.getByRole('textbox'), 'first line')
    await user.keyboard('{Shift>}{Enter}{/Shift}')

    expect(mockChat).not.toHaveBeenCalled()
  })

  it('does not send empty-only whitespace input', async () => {
    const user = userEvent.setup()
    render(<Chat />)

    // type spaces only — button stays disabled, Enter should not fire
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '   ' } })
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' })

    expect(mockChat).not.toHaveBeenCalled()
  })

  it('renders sources when response includes them', async () => {
    mockChat.mockResolvedValueOnce({
      answer: 'See sources',
      sources: [
        { filename: 'doc.pdf', chunk: 'relevant text here', score: 0.92 },
      ],
    })
    const user = userEvent.setup()
    render(<Chat />)

    await user.type(screen.getByRole('textbox'), 'q')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() => screen.getByText('1 source'))
    expect(screen.getByText('doc.pdf')).toBeInTheDocument()
    expect(screen.getByText('92%')).toBeInTheDocument()
  })

  it('uses plural "sources" label for multiple sources', async () => {
    mockChat.mockResolvedValueOnce({
      answer: 'answer',
      sources: [
        { filename: 'a.pdf', chunk: 'chunk a', score: 0.8 },
        { filename: 'b.pdf', chunk: 'chunk b', score: 0.7 },
      ],
    })
    const user = userEvent.setup()
    render(<Chat />)

    await user.type(screen.getByRole('textbox'), 'q')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() => screen.getByText('2 sources'))
  })

  it('shows error bubble on API failure', async () => {
    mockChat.mockRejectedValueOnce(new Error('LM Studio offline'))
    const user = userEvent.setup()
    render(<Chat />)

    await user.type(screen.getByRole('textbox'), 'q')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() => expect(screen.getByText('LM Studio offline')).toBeInTheDocument())
  })

  it('uses generic message for non-Error rejections', async () => {
    mockChat.mockRejectedValueOnce('raw string error')
    const user = userEvent.setup()
    render(<Chat />)

    await user.type(screen.getByRole('textbox'), 'q')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() => expect(screen.getByText('Request failed')).toBeInTheDocument())
  })

  it('disables textarea and button while loading', async () => {
    let resolveChat!: (v: clientModule.ChatResponse) => void
    mockChat.mockImplementationOnce(
      () => new Promise<clientModule.ChatResponse>((r) => { resolveChat = r }),
    )
    const user = userEvent.setup()
    render(<Chat />)

    await user.type(screen.getByRole('textbox'), 'question')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(screen.getByRole('textbox')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()

    // Resolve to clean up
    resolveChat({ answer: 'done', sources: [] })
    await waitFor(() => expect(screen.getByRole('textbox')).toBeEnabled())
  })

  it('shows typing dots while loading', async () => {
    let resolveChat!: (v: clientModule.ChatResponse) => void
    mockChat.mockImplementationOnce(
      () => new Promise<clientModule.ChatResponse>((r) => { resolveChat = r }),
    )
    const user = userEvent.setup()
    const { container } = render(<Chat />)

    await user.type(screen.getByRole('textbox'), 'q')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(container.querySelector('.typing-dots')).toBeInTheDocument()

    resolveChat({ answer: 'done', sources: [] })
    await waitFor(() => expect(container.querySelector('.typing-dots')).not.toBeInTheDocument())
  })

  it('hides empty-state hint once messages exist', async () => {
    mockChat.mockResolvedValueOnce({ answer: 'hi', sources: [] })
    const user = userEvent.setup()
    render(<Chat />)

    await user.type(screen.getByRole('textbox'), 'hey')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() => expect(screen.queryByText(/Upload documents on the left/)).not.toBeInTheDocument())
  })
})
