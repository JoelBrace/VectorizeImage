export function islandCleanup(labels: Uint16Array, w: number, h: number, minSize: number) {
  if (minSize <= 1) return
  const visited = new Uint8Array(w*h)
  const dirs = [[1,0],[-1,0],[0,1],[0,-1]]
  const get = (x:number,y:number)=> labels[y*w + x]

  for (let y=0;y<h;y++) {
    for (let x=0;x<w;x++) {
      const idx = y*w + x
      if (visited[idx]) continue
      const label = labels[idx]
      // BFS component
      const qx:number[] = [x], qy:number[] = [y]
      visited[idx] = 1
      let head = 0
      const comp: [number,number][] = [[x,y]]
      const neighborCounts = new Map<number, number>()
      while (head < qx.length) {
        const cx = qx[head], cy = qy[head]; head++
        for (const [dx,dy] of dirs) {
          const nx = cx+dx, ny = cy+dy
          if (nx<0||ny<0||nx>=w||ny>=h) continue
          const nidx = ny*w + nx
          const nl = labels[nidx]
          if (nl === label) {
            if (!visited[nidx]) { visited[nidx]=1; qx.push(nx); qy.push(ny); comp.push([nx,ny]) }
          } else {
            neighborCounts.set(nl, (neighborCounts.get(nl)||0)+1)
          }
        }
      }
      if (comp.length < minSize && neighborCounts.size) {
        // pick neighbor label with highest adjacency
        let bestLabel = -1, bestCount = -1
        for (const [nl,c] of neighborCounts.entries()) {
          if (c > bestCount) { bestCount = c; bestLabel = nl }
        }
        for (const [cx,cy] of comp) labels[cy*w + cx] = bestLabel
      }
    }
  }
}
