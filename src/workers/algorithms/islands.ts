/**
 * Identify connected components (islands) for each label after island cleanup
 * Returns a mapping from grid position to unique island ID
 */

export interface IslandInfo {
  islandIds: Uint32Array  // same dimensions as labels, contains unique island ID for each cell
  islandsByLabel: Map<number, number[]>  // label index -> array of island IDs for that label
  islandCount: number
}

export function identifyIslands(labels: Uint16Array, w: number, h: number): IslandInfo {
  const islandIds = new Uint32Array(w * h)
  const visited = new Uint8Array(w * h)
  const dirs = [[1,0],[-1,0],[0,1],[0,-1]]
  const islandsByLabel = new Map<number, number[]>()
  let currentIslandId = 1

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x
      if (visited[idx]) continue
      
      const label = labels[idx]
      
      // BFS to find connected component
      const qx: number[] = [x]
      const qy: number[] = [y]
      visited[idx] = 1
      islandIds[idx] = currentIslandId
      let head = 0
      
      while (head < qx.length) {
        const cx = qx[head], cy = qy[head]
        head++
        
        for (const [dx, dy] of dirs) {
          const nx = cx + dx, ny = cy + dy
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
          
          const nidx = ny * w + nx
          if (visited[nidx]) continue
          
          const nl = labels[nidx]
          if (nl === label) {
            visited[nidx] = 1
            islandIds[nidx] = currentIslandId
            qx.push(nx)
            qy.push(ny)
          }
        }
      }
      
      // Track which island IDs belong to which label
      if (!islandsByLabel.has(label)) {
        islandsByLabel.set(label, [])
      }
      islandsByLabel.get(label)!.push(currentIslandId)
      
      currentIslandId++
    }
  }
  
  return {
    islandIds,
    islandsByLabel,
    islandCount: currentIslandId - 1
  }
}