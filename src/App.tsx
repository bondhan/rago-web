import { useState } from 'react'
import FileUpload from './components/FileUpload'
import Chat from './components/Chat'
import UploadHistory from './components/UploadHistory'
import { resetDB } from './api/client'
import './App.css'

export default function App() {
  const [resetting, setResetting] = useState(false)
  const [resetMsg, setResetMsg] = useState('')
  const [uploadCount, setUploadCount] = useState(0)

  async function handleReset() {
    if (!confirm('Reset the knowledge base? All ingested data will be deleted.')) return
    setResetting(true)
    setResetMsg('')
    try {
      await resetDB()
      setResetMsg('Knowledge base cleared.')
    } catch (err) {
      setResetMsg(err instanceof Error ? err.message : 'Reset failed')
    } finally {
      setResetting(false)
      setTimeout(() => setResetMsg(''), 4000)
    }
  }

  return (
    <>
      <header className="app-header">
        <div className="app-header-inner">
          <span className="app-logo">⚡ RAGO</span>
          <span className="app-tagline">Retrieval-Augmented Generation</span>
          <div className="app-header-actions">
            {resetMsg && <span className="reset-msg">{resetMsg}</span>}
            <button className="btn-danger" onClick={handleReset} disabled={resetting}>
              {resetting ? 'Resetting…' : 'Reset KB'}
            </button>
          </div>
        </div>
      </header>

      <main className="app-layout">
        <aside className="panel panel--upload">
          <FileUpload onUploaded={() => setUploadCount((n) => n + 1)} />
          <UploadHistory refreshKey={uploadCount} />
        </aside>
        <section className="panel panel--chat">
          <Chat />
        </section>
      </main>
    </>
  )
}
