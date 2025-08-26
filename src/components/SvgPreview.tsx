import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../state/store'

export default function SvgPreview() {
  const svg = useApp(s=>s.svg)
  const bg = useApp(s=>s.backgroundHex)
  const groups = useApp(s=>s.groups)
  const activeSwatch = useApp(s=>s.activeSwatch)
  const setActiveSwatch = useApp(s=>s.setActiveSwatch)
  const setRecolorMap = useApp(s=>s.setRecolorMap)
  const recolorMap = useApp(s=>s.recolorMap)
  const undoRecolor = useApp(s=>s.undoRecolor)
  const canUndo = useApp(s=>s.canUndo)
  const islandRecolorMode = useApp(s=>s.islandRecolorMode)
  const setIslandRecolorMode = useApp(s=>s.setIslandRecolorMode)
  const { svgWidth, svgHeight } = useApp()

  const ref = useRef<HTMLDivElement>(null)

  // Render SVG string
  useEffect(()=>{
    if (!ref.current) return
    ref.current.innerHTML = svg || ''
    // annotate shapes with data-original-fill
    if (svg) {
      const n = ref.current.querySelector('svg')
      if (!n) return
      const shapes = n.querySelectorAll('path,rect')
      shapes.forEach(el => {
        const e = el as SVGElement
        const fill = e.getAttribute('fill') || ''
        if (!e.getAttribute('data-original-fill')) e.setAttribute('data-original-fill', fill)
      })
    }
  }, [svg])

  const onSwatchClick = (hex:string)=>{
    setActiveSwatch(hex === activeSwatch ? null : hex)
  }

  const onUndo = () => {
    if (!canUndo()) return
    
    const svgEl = ref.current?.querySelector('svg')
    if (!svgEl) return
    
    // Get the current recolor map before undoing
    const currentMap = recolorMap
    
    // Undo in the store first to get the previous state
    undoRecolor()
    
    // We need to get the previous recolor map from the store after undo
    // Since we're in a React component, we need to access it differently
    // We'll revert the SVG elements to their original state and then reapply previous recolors
    
    // First, revert all shapes to their original colors
    const shapes = svgEl.querySelectorAll('path,rect')
    shapes.forEach(el => {
      const originalFill = el.getAttribute('data-original-fill')
      if (originalFill) {
        el.setAttribute('fill', originalFill)
      }
    })
    
    // Then reapply any remaining recolors from the (now previous) state
    // We need to wait for the next tick to get the updated recolorMap
    setTimeout(() => {
      const updatedMap = useApp.getState().recolorMap
      Object.entries(updatedMap).forEach(([key, newColor]) => {
        const fillValue = newColor === 'transparent' ? 'none' : newColor
        
        if (key.includes(':')) {
          // Island mode key format: "fill:islandId"
          const [fill, islandId] = key.split(':')
          const selector = fill === 'none' ? `[fill="${fill}"], :not([fill])` : `[fill="${fill}"]`
          const shapes = svgEl.querySelectorAll(`${selector}[data-island-id="${islandId}"]`)
          shapes.forEach(el => el.setAttribute('fill', fillValue))
        } else {
          // Global mode
          const selector = key === 'none' ? `[fill="${key}"], :not([fill])` : `[fill="${key}"]`
          const shapes = svgEl.querySelectorAll(selector)
          shapes.forEach(el => el.setAttribute('fill', fillValue))
        }
      })
    }, 0)
  }

  const onSvgClick = (e: React.MouseEvent) => {
    if (!activeSwatch) return
    const target = e.target as SVGElement
    if (!target) return
    const fill = target.getAttribute('fill') || 'none'
    if (fill === activeSwatch || (fill === 'none' && activeSwatch === 'transparent')) return
    
    const svgEl = ref.current?.querySelector('svg')
    if (!svgEl) return
    
    let shapes: NodeListOf<Element>
    let recolorKey: string
    
    if (islandRecolorMode) {
      // Island mode: only recolor shapes with same fill AND same island ID
      const islandId = target.getAttribute('data-island-id')
      if (islandId) {
        const selector = fill === 'none' ? `[fill="${fill}"], :not([fill])` : `[fill="${fill}"]`
        shapes = svgEl.querySelectorAll(`${selector}[data-island-id="${islandId}"]`)
        recolorKey = `${fill}:${islandId}` // Use combined key for island-specific recoloring
      } else {
        // Fallback if no island ID (shouldn't happen with new SVGs)
        const selector = fill === 'none' ? `[fill="${fill}"], :not([fill])` : `[fill="${fill}"]`
        shapes = svgEl.querySelectorAll(selector)
        recolorKey = fill
      }
    } else {
      // Global mode: recolor all shapes with this fill (original behavior)
      const selector = fill === 'none' ? `[fill="${fill}"], :not([fill])` : `[fill="${fill}"]`
      shapes = svgEl.querySelectorAll(selector)
      recolorKey = fill
    }
    
    const fillValue = activeSwatch === 'transparent' ? 'none' : activeSwatch
    shapes.forEach(el => el.setAttribute('fill', fillValue))
    setRecolorMap({ ...recolorMap, [recolorKey]: activeSwatch })
  }

  const download = () => {
    const svgEl = ref.current?.querySelector('svg')
    if (!svgEl) return
    const serializer = new XMLSerializer()
    const s = serializer.serializeToString(svgEl)
    const blob = new Blob([s], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'vectorized.svg'
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(()=>URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className="preview">
      <div className="controls-row" aria-label="SVG editor controls">
        <label className="checkbox-label" style={{display: 'flex', alignItems: 'center', marginRight: '8px', padding: '6px 8px', border: '1px solid var(--border)', borderRadius: '8px', background: '#0b1220'}}>
          <input 
            type="checkbox" 
            checked={islandRecolorMode} 
            onChange={(e) => setIslandRecolorMode(e.target.checked)}
            style={{marginRight: '6px'}}
          />
          <span className="small">Island mode</span>
        </label>
        <div className="row" style={{flex:1, overflow:'hidden'}}>
          <div className="small">Recolor:</div>
          <div className="swatches" role="listbox" aria-label="Group swatches">
            <div 
              className={'swatch'+(activeSwatch==='transparent'?' active':'')} 
              style={{background: 'repeating-linear-gradient(45deg, #ccc, #ccc 4px, #fff 4px, #fff 8px)', opacity: 0.8}} 
              onClick={()=>onSwatchClick('transparent')} 
              title="Transparent"
            ></div>
            {groups.map(g=>{
              if (!g.chipIds.length) return null
              return <div key={g.id} className={'swatch'+(activeSwatch===g.repHex?' active':'')} style={{background:g.repHex}} onClick={()=>onSwatchClick(g.repHex)} title={`${g.name} ${g.repHex}`}></div>
            })}
          </div>
        </div>
        <button className="btn" onClick={onUndo} disabled={!canUndo() || !svg} title="Undo last recolor change">Undo</button>
        <button className="btn" onClick={download} disabled={!svg}>Download SVG</button>
      </div>
      <div className="svg-stage" onClick={onSvgClick} role="region" aria-label="SVG preview">
        <div className="svg-stage-inner" ref={ref}></div>
      </div>
    </div>
  )
}
