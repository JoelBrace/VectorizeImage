/**
 * Extract polygon paths for each label using grid-edge tracing.
 * We build directed boundary edges oriented counter-clockwise around the target label
 * and then trace closed loops. Output is path data string for a given label.
 */

function vkey(x:number,y:number){ return x+'_'+y }
function ekey(x0:number,y0:number,x1:number,y1:number){ return x0+'_'+y0+'_'+x1+'_'+y1 }

export function contoursForLabel(labels: Uint16Array, w: number, h: number, labelIndex: number): number[][][] {
  // edges: map from start vertex -> array of end vertices
  const edges = new Map<string, [number,number][]>()
  const addEdge = (x0:number,y0:number,x1:number,y1:number) => {
    const k = vkey(x0,y0)
    const arr = edges.get(k) || []
    arr.push([x1,y1])
    edges.set(k, arr)
  }
  const isLabel = (x:number,y:number) => {
    if (x<0||y<0||x>=w||y>=h) return false
    return labels[y*w + x] === labelIndex
  }
  // generate edges along grid lines with CCW orientation for interior
  for (let y=0;y<h;y++) {
    for (let x=0;x<w;x++) {
      if (!isLabel(x,y)) continue
      // top edge if neighbor above is different
      if (!isLabel(x, y-1)) addEdge(x, y, x+1, y) // (x,y)->(x+1,y)
      // right edge if neighbor to right is different
      if (!isLabel(x+1, y)) addEdge(x+1, y, x+1, y+1) // (x+1,y)->(x+1,y+1)
      // bottom edge if neighbor below is different
      if (!isLabel(x, y+1)) addEdge(x+1, y+1, x, y+1) // (x+1,y+1)->(x,y+1)
      // left edge if neighbor to left is different
      if (!isLabel(x-1, y)) addEdge(x, y+1, x, y) // (x,y+1)->(x,y)
    }
  }
  // trace loops
  const used = new Set<string>()
  const loops: number[][][] = [] // each: array of [x,y]
  for (const [startKey, outs] of edges.entries()) {
    for (const out of outs) {
      const [sx,sy] = startKey.split('_').map(Number)
      const [ex,ey] = out
      const ek = ekey(sx,sy,ex,ey)
      if (used.has(ek)) continue
      // start tracing
      const loop: number[][] = [[sx,sy],[ex,ey]]
      used.add(ek)
      let cx = ex, cy = ey
      let px = sx, py = sy
      // while not closed
      while (!(cx===sx && cy===sy)) {
        // find next edge from current vertex
        const outs2 = edges.get(vkey(cx,cy)) || []
        if (!outs2.length) break // open (shouldn't happen)
        // choose the next edge by preferring a left turn relative to previous segment
        // compute previous direction
        const dx = cx - px, dy = cy - py
        // candidate edges with orientation
        let bestScore = 1e9, bestNext: [number,number] | null = null
        for (const cand of outs2) {
          const [nx,ny] = cand
          const ekey2 = ekey(cx,cy,nx,ny)
          if (used.has(ekey2)) continue
          const ndx = nx - cx, ndy = ny - cy
          // turn score: prefer left turn (dx,dy) -> (ndx,ndy)
          // left turn measure via cross product z-component: cross = dx*ndy - dy*ndx (positive => left)
          const cross = dx*ndy - dy*ndx
          // also prefer continuing straight (small angle) if no left turn available
          // angle proxy via dot product (higher is straighter)
          const dot = dx*ndx + dy*ndy
          // negative cross (right turn) is worse; use sorting heuristic
          const score = (cross>0?0:(cross===0?1:2)) * 1000 + (1000 - dot)
          if (score < bestScore) { bestScore = score; bestNext = cand }
        }
        if (!bestNext) {
          // if all outgoing used, allow reuse to close
          const any = outs2[0]
          if (!any) break
          bestNext = any
        }
        const [nx,ny] = bestNext
        used.add(ekey(cx,cy,nx,ny))
        loop.push([nx,ny])
        px = cx; py = cy
        cx = nx; cy = ny
        if (loop.length > 100000) break
      }
      if (loop.length >= 4 && (cx===sx && cy===sy)) {
        loops.push(loop)
      }
    }
  }
  return loops
}

export function contoursToPathData(loops: number[][][], cellSize: number) {
  const parts: string[] = []
  for (const loop of loops) {
    const pts = loop.map(([x,y]) => [x*cellSize, y*cellSize])
    if (!pts.length) continue
    parts.push('M ' + pts[0][0].toFixed(2) + ' ' + pts[0][1].toFixed(2))
    for (let i=1;i<pts.length;i++) {
      parts.push('L ' + pts[i][0].toFixed(2) + ' ' + pts[i][1].toFixed(2))
    }
    parts.push('Z')
  }
  return parts.join(' ')
}

export function contoursSvgForAllLabels(labels: Uint16Array, w: number, h: number, cellSize: number, fillByIndex: (i:number)=>string, backgroundIndex: number, widthPx: number, heightPx: number) {
  const parts: string[] = []
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${widthPx}" height="${heightPx}" viewBox="0 0 ${widthPx} ${heightPx}">`)
  const bg = fillByIndex(backgroundIndex)
  parts.push(`<rect width="100%" height="100%" fill="${bg}"/>`)
  for (let i=0;i<65536;i++) {
    // only render indices that exist in labels
    // We'll detect presence by scanning w*h; but that is expensive for each i.
    // Instead, collect unique indices first
  }
  // collect unique set
  const present = new Set<number>(labels as any as number[])
  for (const idx of present) {
    if (idx === backgroundIndex) continue
    const loops = contoursForLabel(labels, w, h, idx)
    if (!loops.length) continue
    const d = contoursToPathData(loops, cellSize)
    const fill = fillByIndex(idx)
    parts.push(`<path d="${d}" fill="${fill}" fill-rule="evenodd"/>`)
  }
  parts.push(`</svg>`)
  return parts.join('')
}
