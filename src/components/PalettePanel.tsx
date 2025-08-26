import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../state/store'
import type { ColorChip } from '../state/types'

let worker: Worker | null = null
function getWorker() {
  if (!worker) worker = new Worker(new URL('../workers/vectorize.worker.ts', import.meta.url), { type: 'module' })
  return worker!
}

function drawToCanvas(bmp: ImageBitmap) {
  const canvas = document.createElement('canvas')
  canvas.width = bmp.width
  canvas.height = bmp.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bmp, 0, 0)
  return ctx.getImageData(0, 0, canvas.width, canvas.height)
}

export default function PalettePanel() {
  const imageBitmap = useApp(s=>s.imageBitmap)
  const setChips = useApp(s=>s.setChips)
  const chips = useApp(s=>s.chips)
  const maxColors = useApp(s=>s.maxColors)
  const sampleStep = useApp(s=>s.sampleStep)
  const similarityPct = useApp(s=>s.similarityPct)
  const setStatus = useApp(s=>s.setStatus)
  const setAutoGroups = useApp(s=>s.setAutoGroups)
  const setGroups = useApp(s=>s.setGroups)
  const setIsDraggingSlider = useApp(s=>s.setIsDraggingSlider)

  // Extract & Group
  const extract = async () => {
    if (!imageBitmap) { setStatus({stage:'Error', detail:'Please upload an image first.'}); return }
    setStatus({ stage: 'Extracting colors...' })
    const imageData = drawToCanvas(imageBitmap)
    const w = getWorker()
    w.onmessage = (ev: MessageEvent<any>) => {
      const msg = ev.data
      if (msg.type === 'status') setStatus({ stage: msg.stage, detail: msg.detail })
      if (msg.type === 'extracted') {
        setChips(msg.chips)
        autoGroup(msg.chips)
      }
    }
    w.postMessage({ type: 'extract', pixels: new Uint8ClampedArray(imageData.data), width: imageData.width, height: imageData.height, step: sampleStep, maxColors })
  }

  const autoGroup = (chipsForGroup: ColorChip[]) => {
    const w = getWorker()
    w.onmessage = (ev: MessageEvent<any>) => {
      const msg = ev.data
      if (msg.type === 'status') setStatus({ stage: msg.stage, detail: msg.detail })
      if (msg.type === 'grouped') {
        setAutoGroups(msg.groups)
        // also set current groups
        // compute shares based on chips
        const sum = chipsForGroup.reduce((a,c)=>a+c.count,0)||1
        const countById: Record<string, number> = Object.fromEntries(chipsForGroup.map(c=>[c.id,c.count]))
        const withShare = msg.groups.map((g:any)=>({
          ...g,
          share: (g.chipIds.reduce((a:number,id:string)=>a + (countById[id]||0), 0)) / sum
        }))
        setGroups(withShare)
        setStatus(null)
      }
    }
    w.postMessage({ type: 'autogroup', chips: chipsForGroup, similarityPct })
  }

  // Extract when maxColors or sampleStep changes (immediate)
  useEffect(()=>{
    if (!imageBitmap) return
    const t = setTimeout(()=> extract(), 200)
    return ()=> clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxColors, sampleStep])

  // Regroup when similarity changes (immediate)
  useEffect(()=>{
    if (!chips.length) return
    const t = setTimeout(()=> autoGroup(chips), 200)
    return ()=> clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [similarityPct])

  const setMax = useApp(s=>s.setMaxColors)
  const setStep = useApp(s=>s.setSampleStep)
  const setSim = useApp(s=>s.setSimilarity)

  const handleSliderMouseDown = () => {
    setIsDraggingSlider(true)
  }

  const handleSliderMouseUp = () => {
    setIsDraggingSlider(false)
  }

  // Add global mouse up listener to handle release outside slider
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDraggingSlider(false)
    }
    
    document.addEventListener('mouseup', handleGlobalMouseUp)
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp)
  }, [setIsDraggingSlider])

  return (
    <div className="panel" aria-label="Color extraction and grouping">
      <h3>Color Extraction & Grouping</h3>
      <div className="row">
        <button className="btn primary" onClick={extract}>Extract & Group</button>
      </div>
      <div className="col" style={{marginTop:8}}>
        <div className="input-row">
          <label className="small" title="Maximum number of unique colors to extract from the image">Max colors</label>
          <input className="slider" type="range" min={2} max={128} value={maxColors} onChange={e=>setMax(parseInt(e.target.value))} onMouseDown={handleSliderMouseDown} onMouseUp={handleSliderMouseUp} title="Maximum number of unique colors to extract from the image" />
          <div className="small">{maxColors}</div>
        </div>
        <div className="input-row">
          <label className="small" title="How many pixels to skip when sampling colors. Higher values = faster extraction but less accuracy">Sampling Step</label>
          <input className="slider" type="range" min={1} max={16} value={sampleStep} onChange={e=>setStep(parseInt(e.target.value))} onMouseDown={handleSliderMouseDown} onMouseUp={handleSliderMouseUp} title="How many pixels to skip when sampling colors. Higher values = faster extraction but less accuracy" />
          <div className="small">{sampleStep}</div>
        </div>
        <div className="input-row">
          <label className="small" title="How similar colors need to be to get grouped together. Lower values = more groups with similar colors">Similarity %</label>
          <input className="slider" type="range" min={0} max={100} value={similarityPct} onChange={e=>setSim(parseInt(e.target.value))} onMouseDown={handleSliderMouseDown} onMouseUp={handleSliderMouseUp} title="How similar colors need to be to get grouped together. Lower values = more groups with similar colors" />
          <div className="small">{similarityPct}%</div>
        </div>
      </div>
      <div className="small" style={{marginTop:8}}>Extracted colors (drag into groups):</div>
      <div className="palette-chips">
        {chips.map(c=> (
          <span key={c.id} className="chip" title={`${c.hex} • ${(c.share*100).toFixed(1)}%`} style={{ ['--swatch' as any]: c.hex, transform: `scale(${0.9 + 0.4 * c.share})` }}>{c.hex}</span>
        ))}
      </div>
    </div>
  )
}
