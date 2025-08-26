import { deltaE_oklab, hexToLab } from './color'

export interface SampleOptions {
  step: number
  maxColors: number
  extractionMode?: 'frequency' | 'diverse'
}

function toHex(r:number,g:number,b:number) {
  const h = (v:number)=> v.toString(16).padStart(2,'0')
  return '#' + h(r) + h(g) + h(b)
}

function sampleColorsFrequency(pixels: Uint8ClampedArray, width: number, height: number, opts: SampleOptions) {
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

function sampleColorsDiverse(pixels: Uint8ClampedArray, width: number, height: number, opts: SampleOptions) {
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
  
  // If we have fewer colors than maxColors, return all
  if (arr.length <= maxColors) {
    const sum = arr.reduce((a,c)=>a+c.count,0) || 1
    return { colors: arr.map(c=>({ ...c, share: c.count / sum })), totalSamples: total }
  }
  
  // Greedy selection for diverse colors
  const selected: typeof arr = []
  const selectedLabs = []
  
  // Always select the most frequent color first
  selected.push(arr[0])
  selectedLabs.push(hexToLab(arr[0].hex))
  
  // For remaining selections, balance frequency and diversity
  for (let i = 1; i < maxColors; i++) {
    let bestScore = -1
    let bestIdx = -1
    
    for (let j = 1; j < arr.length; j++) {
      // Skip if already selected
      if (selected.some(s => s.hex === arr[j].hex)) continue
      
      const candidateLab = hexToLab(arr[j].hex)
      
      // Find minimum distance to already selected colors
      let minDist = Infinity
      for (const selectedLab of selectedLabs) {
        const dist = deltaE_oklab(candidateLab, selectedLab)
        minDist = Math.min(minDist, dist)
      }
      
      // Normalize frequency score (0-1)
      const freqScore = arr[j].count / arr[0].count
      
      // Normalize distance score (typical OKLab distances are 0-1, but can be higher)
      const distScore = Math.min(minDist / 0.3, 1) // 0.3 is a good threshold for "different" colors
      
      // Combine frequency and diversity (favor diversity more in early selections)
      const diversityWeight = Math.max(0.3, 1 - (i / maxColors) * 0.5) // Start at 70% diversity weight, decrease
      const score = diversityWeight * distScore + (1 - diversityWeight) * freqScore
      
      if (score > bestScore) {
        bestScore = score
        bestIdx = j
      }
    }
    
    if (bestIdx !== -1) {
      selected.push(arr[bestIdx])
      selectedLabs.push(hexToLab(arr[bestIdx].hex))
    }
  }
  
  const sum = selected.reduce((a,c)=>a+c.count,0) || 1
  return { colors: selected.map(c=>({ ...c, share: c.count / sum })), totalSamples: total }
}

export function sampleColors(pixels: Uint8ClampedArray, width: number, height: number, opts: SampleOptions) {
  const extractionMode = opts.extractionMode || 'frequency'
  
  if (extractionMode === 'diverse') {
    return sampleColorsDiverse(pixels, width, height, opts)
  } else {
    return sampleColorsFrequency(pixels, width, height, opts)
  }
}
