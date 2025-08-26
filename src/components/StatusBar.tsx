import React from 'react'
import { useApp } from '../state/store'

export default function StatusBar() {
  const status = useApp(s=>s.status)
  if (!status) return null
  return (
    <div className="panel" aria-live="polite">
      <div><strong>{status.stage}</strong></div>
      {status.detail && <div className="small">{status.detail}</div>}
    </div>
  )
}
