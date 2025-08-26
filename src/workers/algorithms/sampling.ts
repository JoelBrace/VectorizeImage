export interface SampleOptions {
  step: number
  maxColors: number
}

function toHex(r:number,g:number,b:number) {
  const h = (v:number)=> v.toString(16).padStart(2,'0')
  return '#' + h(r) + h(g) + h(b)
}

export function sampleColors(pixels: Uint8ClampedArray, width: number, height: number, opts: SampleOptions) {
  const { step, maxColors } = opts
  const map = new Map<string, number>()
  let total = 0
  for (let y=0; y<height; y+=step) {
    for (let x=0; x<width; x+=step) {
      const idx = (y*width + x) * 4
      const a = pixels[idx+3]
      if (a < 8) continue
      const r = pixels[idx]
      const g = pixels[idx+1]
      const b = pixels[idx+2]
      const hex = toHex(r,g,b)
      map.set(hex, (map.get(hex)||0) + 1)
      total++
    }
  }
  // make array and sort by frequency
  const arr = Array.from(map.entries()).map(([hex,count])=>({hex,count}))
  arr.sort((a,b)=> b.count - a.count)
  const top = arr.slice(0, maxColors)
  const sum = top.reduce((a,c)=>a+c.count,0) || 1
  return { colors: top.map(c=>({ ...c, share: c.count / sum })), totalSamples: total }
}
