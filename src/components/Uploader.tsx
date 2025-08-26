import React from 'react'
import { useApp } from '../state/store'
import type { ColorChip } from '../state/types'
import { hexToLab } from '../workers/algorithms/color'

function formatBytes(bytes: number): string {
  const sizes = ['B','KB','MB','GB']; if (bytes===0) return '0 B'
  const i = Math.floor(Math.log(bytes)/Math.log(1024))
  return (bytes/Math.pow(1024,i)).toFixed(2)+' '+sizes[i]
}

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

export default function Uploader() {
  const setImage = useApp(s=>s.setImage)
  const setStatus = useApp(s=>s.setStatus)
  const imageMeta = useApp(s=>s.imageMeta)
  const setChips = useApp(s=>s.setChips)
  const maxColors = useApp(s=>s.maxColors)
  const sampleStep = useApp(s=>s.sampleStep)
  const similarityPct = useApp(s=>s.similarityPct)
  const setAutoGroups = useApp(s=>s.setAutoGroups)
  const setGroups = useApp(s=>s.setGroups)

  const autoGroup = (chipsForGroup: ColorChip[]) => {
    const w = getWorker()
    w.onmessage = (ev: MessageEvent<any>) => {
      const msg = ev.data
      if (msg.type === 'status') setStatus({ stage: msg.stage, detail: msg.detail })
      if (msg.type === 'grouped') {
        setAutoGroups(msg.groups)
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

  const autoExtract = async (imageBitmap: ImageBitmap) => {
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

  const onFiles = async (files: FileList|null) => {
    if (!files || !files.length) return
    const f = files[0]
    if (!/\.(png|jpg|jpeg)$/i.test(f.name)) {
      setStatus({ stage: 'Error', detail: 'Please upload a PNG or JPG/JPEG file.' })
      return
    }
    setStatus({ stage: 'Decoding image...' })
    const objectUrl = URL.createObjectURL(f)
    const img = await createImageBitmap(f)
    setImage({
      width: img.width,
      height: img.height,
      fileSize: f.size,
      name: f.name,
      objectUrl
    }, img)
    autoExtract(img)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    onFiles(e.dataTransfer.files)
  }

  return (
    <div className="panel" aria-label="Image import and preview">
      <h3>Upload & Preview</h3>
      <label className="uploader-area" onDragOver={e=>{e.preventDefault(); (e.currentTarget as HTMLElement).classList.add('dragover')}} onDragLeave={e=>{(e.currentTarget as HTMLElement).classList.remove('dragover')}} onDrop={onDrop}>
        <input type="file" accept="image/png,image/jpeg" style={{ display: 'none' }} onChange={e=>onFiles(e.target.files)} />
        <div>
          <div className="small">Drag & drop PNG/JPG here</div>
          <div className="small">or click to browse</div>
        </div>
      </label>
      {imageMeta && (
        <div className="status-line" aria-live="polite">
          <div><strong>{imageMeta.name}</strong></div>
          <div>{imageMeta.width} × {imageMeta.height} • {formatBytes(imageMeta.fileSize)}</div>
        </div>
      )}
    </div>
  )
}
