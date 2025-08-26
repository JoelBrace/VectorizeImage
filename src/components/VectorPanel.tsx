import React, { useEffect } from 'react'
import { useApp } from '../state/store'
import type { Technique } from '../state/types'

let worker: Worker | null = null
function getWorker() {
  if (!worker) worker = new Worker(new URL('../workers/vectorize.worker.ts', import.meta.url), { type: 'module' })
  return worker!
}

function drawScaledToImageData(bmp: ImageBitmap, maxDim: number) {
  const ratio = Math.min(1, maxDim / Math.max(bmp.width, bmp.height))
  const w = Math.max(1, Math.round(bmp.width * ratio))
  const h = Math.max(1, Math.round(bmp.height * ratio))
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bmp, 0, 0, w, h)
  const id = ctx.getImageData(0, 0, w, h)
  return id
}

export default function VectorPanel() {
  const imageBitmap = useApp(s=>s.imageBitmap)
  const groups = useApp(s=>s.groups)
  const params = useApp(s=>s.params)
  const setStatus = useApp(s=>s.setStatus)
  const setSvg = useApp(s=>s.setSvg)

  const generate = async () => {
    if (!imageBitmap) { setStatus({stage:'Error', detail:'Please upload an image first.'}); return }
    if (!groups.length || !groups.some(g=>g.chipIds.length)) {
      setStatus({stage:'Error', detail:'Please place at least one color into a group.'}); return
    }
    setStatus({ stage: 'Preparing raster...' })
    const id = drawScaledToImageData(imageBitmap, params.vectorResolution)
    const w = getWorker()
    w.onmessage = (ev: MessageEvent<any>) => {
      const msg = ev.data
      if (msg.type === 'status') setStatus({ stage: msg.stage, detail: msg.detail })
      if (msg.type === 'generated') {
        setSvg(msg)
        setStatus(null)
      }
    }
    // Build group reps (average of chips is already stored in group.repHex)
    const payloadGroups = groups.filter(g=>g.chipIds.length).map(g=>({ id: g.id, chipIds: g.chipIds, repHex: g.repHex }))
    w.postMessage({
      type: 'generate',
      pixels: new Uint8ClampedArray(id.data),
      width: id.width,
      height: id.height,
      cellSize: Math.max(1, params.vectorDetail),
      minIsland: Math.max(1, Math.floor(params.minIsland)),
      technique: params.technique,
      groups: payloadGroups
    })
  }

  const isDraggingSlider = useApp(s=>s.isDraggingSlider)

  // Auto-generate when groups or params change (with debouncing, but not when dragging sliders)
  useEffect(() => {
    if (!imageBitmap || !groups.length || !groups.some(g=>g.chipIds.length)) return
    if (isDraggingSlider) return // Skip auto-generation while dragging sliders
    
    const timer = setTimeout(() => {
      generate()
    }, 500) // 500ms debounce

    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, params, imageBitmap, isDraggingSlider])

  const setTechnique = useApp(s=>s.setTechnique)
  const setVectorResolution = useApp(s=>s.setVectorResolution)
  const setVectorDetail = useApp(s=>s.setVectorDetail)
  const setMinIsland = useApp(s=>s.setMinIsland)

  return (
    <div className="panel" aria-label="Vectorization Panel">
      <h3>Vectorization</h3>
      <div className="col">
        <div className="row" role="radiogroup" aria-label="Technique">
          <label title="Generate smooth curved paths around color regions. Best for organic shapes and detailed artwork"><input type="radio" name="tech" checked={params.technique==='contours'} onChange={()=>setTechnique('contours')} /> Contours (paths)</label>
          <label style={{marginLeft:12}} title="Generate rectangular blocks for each color region. Best for pixel art and geometric designs"><input type="radio" name="tech" checked={params.technique==='rect_runs'} onChange={()=>setTechnique('rect_runs')} /> Rect runs (cells)</label>
        </div>
        <div className="input-row">
          <label className="small" title="Maximum width or height of the internal raster used for vectorization. Higher values = more detail but slower processing">Vector resolution (max dim)</label>
          <input className="slider" type="range" min={256} max={4096} step={64} value={params.vectorResolution} onChange={e=>setVectorResolution(parseInt(e.target.value))} title="Maximum width or height of the internal raster used for vectorization. Higher values = more detail but slower processing" />
          <div className="small">{params.vectorResolution}px</div>
        </div>
        <div className="input-row">
          <label className="small" title="Size of each grid cell used for vectorization. Smaller values = more detailed vectors but larger file size">Vector detail (cell size)</label>
          <input className="slider" type="range" min={1} max={16} value={params.vectorDetail} onChange={e=>setVectorDetail(parseInt(e.target.value))} title="Size of each grid cell used for vectorization. Smaller values = more detailed vectors but larger file size" />
          <div className="small">{params.vectorDetail}px</div>
        </div>
        <div className="input-row">
          <label className="small" title="Minimum size of color regions to keep. Smaller islands will be removed to clean up the vector">Min island (cells)</label>
          <input className="slider" type="range" min={1} max={128} value={params.minIsland} onChange={e=>setMinIsland(parseInt(e.target.value))} title="Minimum size of color regions to keep. Smaller islands will be removed to clean up the vector" />
          <div className="small">{params.minIsland}</div>
        </div>

        <div className="row" style={{marginTop:8}}>
          <button className="btn primary" onClick={generate}>Generate SVG</button>
        </div>
      </div>
    </div>
  )
}
