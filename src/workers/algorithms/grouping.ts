import { deltaE_oklab, hexToLab, toHexFromLab } from './color'

export interface Chip {
  id: string
  hex: string
  count: number
  share: number
  L: number; a: number; b: number
}

export interface Group {
  id: string
  name: string
  chipIds: string[]
  repHex: string
  repLab: { L: number; a: number; b: number }
}

class UnionFind {
  p: number[]
  r: number[]
  constructor(n: number) {
    this.p = Array.from({length:n}, (_,i)=>i)
    this.r = Array.from({length:n}, _=>0)
  }
  find(x:number): number {
    if (this.p[x] !== x) this.p[x] = this.find(this.p[x])
    return this.p[x]
  }
  union(a:number,b:number) {
    a=this.find(a); b=this.find(b)
    if (a===b) return
    if (this.r[a] < this.r[b]) [a,b] = [b,a]
    this.p[b] = a
    if (this.r[a] === this.r[b]) this.r[a]++
  }
}

export function makeChipsFromExtracted(extracted: {hex:string,count:number,share:number}[]): Chip[] {
  return extracted.map((c,i)=>{
    const lab = hexToLab(c.hex)
    return {
      id: 'c_'+i,
      hex: c.hex,
      count: c.count,
      share: c.share,
      L: lab.L, a: lab.a, b: lab.b
    }
  })
}

export function autoGroup(chips: Chip[], similarityPct: number): Group[] {
  const n = chips.length
  if (!n) return []
  // compute pairwise distances
  const dists: number[] = []
  for (let i=0;i<n;i++) for (let j=i+1;j<n;j++) {
    const d = deltaE_oklab(chips[i], chips[j])
    dists.push(d)
  }
  let thr = 0
  if (dists.length) {
    dists.sort((a,b)=>a-b)
    const p95 = dists[Math.floor(0.95*(dists.length-1))]
    thr = (similarityPct/100) * p95
  }
  const uf = new UnionFind(n)
  for (let i=0;i<n;i++) for (let j=i+1;j<n;j++) {
    const d = deltaE_oklab(chips[i], chips[j])
    if (d <= thr) uf.union(i,j)
  }
  // collect groups
  const buckets = new Map<number, number[]>()
  for (let i=0;i<n;i++) {
    const r = uf.find(i)
    const arr = buckets.get(r) || []
    arr.push(i)
    buckets.set(r, arr)
  }
  const groups: Group[] = []
  let idx = 1
  for (const ids of buckets.values()) {
    // representative = weighted average in Lab
    let wsum = 0, L=0,a=0,b=0
    for (const i of ids) {
      const w = chips[i].count
      wsum += w
      L += chips[i].L * w
      a += chips[i].a * w
      b += chips[i].b * w
    }
    if (wsum<=0) wsum=1
    L/=wsum; a/=wsum; b/=wsum
    const repHex = toHexFromLab(L,a,b)
    groups.push({
      id: 'g_'+idx++,
      name: `Group ${groups.length+1}`,
      chipIds: ids.map(i=>'c_'+i),
      repHex,
      repLab: { L, a, b }
    })
  }
  // sort by total share descending
  groups.sort((A,B)=> {
    const sA = A.chipIds.reduce((s,id)=> s + (chips[parseInt(id.slice(2))]?.share || 0), 0)
    const sB = B.chipIds.reduce((s,id)=> s + (chips[parseInt(id.slice(2))]?.share || 0), 0)
    return sB - sA
  })
  return groups
}
