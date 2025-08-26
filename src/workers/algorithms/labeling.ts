import { deltaE_oklab, rgbToOklab } from './color'

export interface GroupRep {
  id: string
  hex: string
  L: number; a: number; b: number
}

export interface LabelResult {
  labels: Uint16Array
  w: number
  h: number
  areaByGroupIndex: number[]
  groupIds: string[]
}

// Classify each grid cell to nearest group representative color in OKLab space
export function classifyGrid(pixels: Uint8ClampedArray, width: number, height: number, cellSize: number, groups: GroupRep[]): LabelResult {
  const w = Math.ceil(width / cellSize)
  const h = Math.ceil(height / cellSize)
  const labels = new Uint16Array(w*h)
  const groupIds = groups.map(g=>g.id)
  const reps = groups.map(g=>({L:g.L,a:g.a,b:g.b}))
  const area = new Array(groups.length).fill(0)

  for (let gy=0; gy<h; gy++) {
    const py = Math.min(height-1, Math.floor(gy * cellSize + cellSize/2))
    for (let gx=0; gx<w; gx++) {
      const px = Math.min(width-1, Math.floor(gx * cellSize + cellSize/2))
      const idx = (py*width + px) * 4
      const r = pixels[idx], g = pixels[idx+1], b = pixels[idx+2]
      const lab = rgbToOklab(r,g,b)
      let best = 0, bestD = Infinity
      for (let i=0;i<reps.length;i++) {
        const d = deltaE_oklab(lab, reps[i])
        if (d < bestD) { bestD = d; best = i }
      }
      labels[gy*w + gx] = best
      area[best]++
    }
  }
  return { labels, w, h, areaByGroupIndex: area, groupIds }
}
