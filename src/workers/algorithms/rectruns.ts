export interface RectRun { x:number; y:number; w:number; h:number; fill:string; islandId?: number }

export function rectRuns(labels: Uint16Array, w: number, h: number, cellSize: number, fillByIndex: (i:number)=>string, skipIndex: number, islandIds?: Uint32Array): RectRun[] {
  const runs: RectRun[] = []
  for (let y=0;y<h;y++) {
    let x = 0
    while (x < w) {
      const idx = labels[y*w + x]
      if (idx === skipIndex) { x++; continue }
      let x2 = x+1
      while (x2 < w && labels[y*w + x2] === idx) x2++
      const run: RectRun = {
        x: x*cellSize,
        y: y*cellSize,
        w: (x2-x)*cellSize,
        h: cellSize,
        fill: fillByIndex(idx)
      }
      if (islandIds) {
        run.islandId = islandIds[y*w + x]
      }
      runs.push(run)
      x = x2
    }
  }
  return runs
}

export function rectRunsToSvg(runs: RectRun[], width: number, height: number, backgroundHex: string) {
  const parts: string[] = []
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`)
  parts.push(`<rect width="100%" height="100%" fill="${backgroundHex}"/>`)
  for (const r of runs) {
    const dataAttr = r.islandId ? ` data-island-id="${r.islandId}"` : ''
    parts.push(`<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${r.fill}"${dataAttr}/>`)
  }
  parts.push(`</svg>`)
  return parts.join('')
}
