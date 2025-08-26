import React, { useRef, useCallback, useState } from 'react'
import Uploader from './components/Uploader'
import PalettePanel from './components/PalettePanel'
import GroupsGrid from './components/GroupsGrid'
import VectorPanel from './components/VectorPanel'
import SvgPreview from './components/SvgPreview'
import StatusBar from './components/StatusBar'
import { useApp } from './state/store'

export default function App() {
  const imageMeta = useApp(s=>s.imageMeta)
  const svg = useApp(s=>s.svg)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    
    const startX = e.clientX
    const startWidth = sidebarRef.current!.offsetWidth
    
    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = startWidth + (e.clientX - startX)
      const clampedWidth = Math.max(280, Math.min(600, newWidth))
      if (sidebarRef.current) {
        sidebarRef.current.style.width = `${clampedWidth}px`
      }
    }
    
    const handleMouseUp = () => {
      setIsDragging(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [])

  return (
    <div className="app">
      <div className="sidebar" ref={sidebarRef}>
        <Uploader />
        <PalettePanel />
        <GroupsGrid />
        <VectorPanel />
        <StatusBar />
        <div className="resize-handle" onMouseDown={handleMouseDown}></div>
      </div>
      <div className="main">
        <div className="preview-wrap">
          <SvgPreview />
        </div>
      </div>
    </div>
  )
}
