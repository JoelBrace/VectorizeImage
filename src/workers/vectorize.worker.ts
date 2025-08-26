import { sampleColors } from './algorithms/sampling'
import { makeChipsFromExtracted, autoGroup } from './algorithms/grouping'
import { classifyGrid } from './algorithms/labeling'
import { islandCleanup } from './algorithms/cc'
import { rectRuns, rectRunsToSvg } from './algorithms/rectruns'
import { contoursSvgForAllLabels } from './algorithms/contours'
import { hexToLab, toHexFromLab } from './algorithms/color'
import { identifyIslands } from './algorithms/islands'

export type WorkerRequest =
  | { type: 'extract', pixels: Uint8ClampedArray, width: number, height: number, step: number, maxColors: number }
  | { type: 'autogroup', chips: { id:string, hex:string, count:number, share:number }[], similarityPct: number }
  | { type: 'generate', pixels: Uint8ClampedArray, width:number, height:number, cellSize:number, minIsland:number,
      technique: 'contours'|'rect_runs',
      groups: { id:string, chipIds:string[], repHex:string }[] }

export type WorkerResponse =
  | { type: 'status', stage: string, detail?: string }
  | { type: 'extracted', chips: { id:string, hex:string, count:number, share:number, L:number,a:number,b:number }[] }
  | { type: 'grouped', groups: { id:string, name:string, chipIds:string[], repHex:string, repLab:{L:number,a:number,b:number} }[] }
  | { type: 'generated', svg: string, width:number, height:number, backgroundHex:string, areaByGroup: Record<string, number> }

// eslint-disable-next-line no-restricted-globals
const ctx = self as any

function postStatus(stage: string, detail?: string) { ctx.postMessage({ type: 'status', stage, detail } as WorkerResponse) }

ctx.onmessage = (ev: MessageEvent<WorkerRequest>) => {
  const msg = ev.data
  if (msg.type === 'extract') {
    postStatus('Sampling colors...')
    const out = sampleColors(msg.pixels, msg.width, msg.height, { step: msg.step, maxColors: msg.maxColors })
    const chips = makeChipsFromExtracted(out.colors)
    ctx.postMessage({ type: 'extracted', chips } as WorkerResponse)
    return
  }
  if (msg.type === 'autogroup') {
    postStatus('Auto-grouping colors...')
    const chips = msg.chips.map(c=>({ ...c, L: hexToLab(c.hex).L, a: hexToLab(c.hex).a, b: hexToLab(c.hex).b }))
    const groups = autoGroup(chips, msg.similarityPct)
    ctx.postMessage({ type: 'grouped', groups } as WorkerResponse)
    return
  }
  if (msg.type === 'generate') {
    const { width, height, cellSize, minIsland, groups, technique } = msg
    postStatus('Classifying grid...')
    const groupReps = groups.map(g=>{
      const lab = hexToLab(g.repHex)
      return { id: g.id, hex: g.repHex, L: lab.L, a: lab.a, b: lab.b }
    })
    const lab = classifyGrid(msg.pixels, width, height, cellSize, groupReps)
    postStatus('Removing islands...')
    islandCleanup(lab.labels, lab.w, lab.h, minIsland)
    // dominant label
    const areaByIndex = lab.areaByGroupIndex.slice()
    // recompute area after cleanup
    areaByIndex.fill(0)
    for (let i=0;i<lab.labels.length;i++) areaByIndex[lab.labels[i]]++
    let bgIndex = 0, maxA = -1
    for (let i=0;i<areaByIndex.length;i++) if (areaByIndex[i] > maxA) { maxA = areaByIndex[i]; bgIndex = i }
    const fillByIndex = (i:number)=> groupReps[i].hex
    const backgroundHex = fillByIndex(bgIndex)
    
    // Identify islands for recoloring support
    postStatus('Identifying islands...')
    const islandInfo = identifyIslands(lab.labels, lab.w, lab.h)
    
    postStatus('Emitting SVG...')
    let svg = ''
    // Use actual content dimensions instead of original image dimensions
    const contentWidth = lab.w * cellSize
    const contentHeight = lab.h * cellSize
    if (technique === 'rect_runs') {
      const runs = rectRuns(lab.labels, lab.w, lab.h, cellSize, fillByIndex, bgIndex, islandInfo.islandIds)
      svg = rectRunsToSvg(runs, contentWidth, contentHeight, backgroundHex)
    } else {
      svg = contoursSvgForAllLabels(lab.labels, lab.w, lab.h, cellSize, fillByIndex, bgIndex, contentWidth, contentHeight, islandInfo.islandIds, islandInfo.islandsByLabel)
    }
    const areaByGroup: Record<string, number> = {}
    for (let i=0;i<groupReps.length;i++) areaByGroup[groupReps[i].id] = areaByIndex[i] || 0
    ctx.postMessage({ type: 'generated', svg, width: contentWidth, height: contentHeight, backgroundHex, areaByGroup } as WorkerResponse)
    return
  }
}
