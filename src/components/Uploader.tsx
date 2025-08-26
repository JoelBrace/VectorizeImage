import React from 'react'
import { useApp } from '../state/store'

function formatBytes(bytes: number): string {
  const sizes = ['B','KB','MB','GB']; if (bytes===0) return '0 B'
  const i = Math.floor(Math.log(bytes)/Math.log(1024))
  return (bytes/Math.pow(1024,i)).toFixed(2)+' '+sizes[i]
}

export default function Uploader() {
  const setImage = useApp(s=>s.setImage)
  const setStatus = useApp(s=>s.setStatus)
  const imageMeta = useApp(s=>s.imageMeta)

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
    setStatus(null)
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
