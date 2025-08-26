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

  const onSvgClick = (e: React.MouseEvent) => {
    if (!activeSwatch) return
    const target = e.target as SVGElement
    if (!target) return
    const fill = target.getAttribute('fill')
    if (!fill || fill === activeSwatch) return
    // recolor: replace all shapes with this fill to active swatch
    const svgEl = ref.current?.querySelector('svg')
    if (!svgEl) return
    const shapes = svgEl.querySelectorAll(`[fill="${fill}"]`)
    shapes.forEach(el => el.setAttribute('fill', activeSwatch))
    setRecolorMap({ ...recolorMap, [fill]: activeSwatch })
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
        <div className="row" style={{flex:1, overflow:'hidden'}}>
          <div className="small">Recolor:</div>
          <div className="swatches" role="listbox" aria-label="Group swatches">
            {groups.map(g=>{
              if (!g.chipIds.length) return null
              return <div key={g.id} className={'swatch'+(activeSwatch===g.repHex?' active':'')} style={{background:g.repHex}} onClick={()=>onSwatchClick(g.repHex)} title={`${g.name} ${g.repHex}`}></div>
            })}
          </div>
        </div>
        <button className="btn" onClick={download} disabled={!svg}>Download SVG</button>
      </div>
      <div className="svg-stage" onClick={onSvgClick} role="region" aria-label="SVG preview">
        <div className="svg-stage-inner" ref={ref}></div>
      </div>
    </div>
  )
}
