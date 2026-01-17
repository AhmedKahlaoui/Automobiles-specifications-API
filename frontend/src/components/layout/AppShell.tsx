import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { NavBar } from './NavBar'
import { Alert } from '../ui/Alert'
import { consumeFlash } from '../../app/flash'

export function AppShell() {
  const [flash, setFlash] = useState<{ tone: 'success' | 'danger' | 'info'; text: string } | null>(null)

  useEffect(() => {
    const msg = consumeFlash()
    if (msg) {
      setFlash(msg)
      const t = window.setTimeout(() => setFlash(null), 2200)
      return () => window.clearTimeout(t)
    }
    return
  }, [])

  return (
    <div>
      <NavBar />
      <main className="container">
        {flash ? (
          <div style={{ marginTop: 12 }}>
            <Alert tone={flash.tone}>{flash.text}</Alert>
          </div>
        ) : null}
        <Outlet />
      </main>
    </div>
  )
}
