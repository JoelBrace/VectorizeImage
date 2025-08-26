import create from 'zustand'
import { ColorChip, ColorGroup, ImageMeta, StatusMessage, Technique, VectorParams, WorkerExtractResult, WorkerGroupResult, WorkerSvgResult } from './types'

export interface AppState {
  imageMeta: ImageMeta | null
  imageBitmap: ImageBitmap | null

  chips: ColorChip[]
  autoGroups: Omit<ColorGroup,'share'>[] // last auto-grouped state (no share)
  groups: ColorGroup[]
  ungroupedIds: string[]

  params: VectorParams
  similarityPct: number
  maxColors: number
  sampleStep: number

  svg: string | null
  svgWidth: number
  svgHeight: number
  backgroundHex: string | null

  activeSwatch: string | null
  recolorMap: Record<string,string>
  islandRecolorMode: boolean

  status: StatusMessage | null

  setImage(meta: ImageMeta, bmp: ImageBitmap): void
  clearImage(): void
  setStatus(s: StatusMessage | null): void

  setSimilarity(pct: number): void
  setMaxColors(n: number): void
  setSampleStep(n: number): void
  setTechnique(t: Technique): void
  setVectorResolution(n: number): void
  setVectorDetail(n: number): void
  setMinIsland(n: number): void

  setGroups(groups: ColorGroup[]): void
  setAutoGroups(g: Omit<ColorGroup,'share'>[]): void
  resetGroups(): void
  addEmptyGroup(): void
  moveChip(chipId: string, fromGroupId: string | null, toGroupId: string | null): void

  setChips(ch: ColorChip[]): void

  setSvg(res: WorkerSvgResult): void
  setActiveSwatch(hex: string | null): void
  setRecolorMap(map: Record<string,string>): void
  setIslandRecolorMode(enabled: boolean): void
}

export const useApp = create<AppState>((set, get) => ({
  imageMeta: null,
  imageBitmap: null,

  chips: [],
  autoGroups: [],
  groups: [],
  ungroupedIds: [],

  params: {
    technique: 'contours',
    vectorResolution: 1024,
    vectorDetail: 2,
    minIsland: 4
  },
  similarityPct: 50,
  maxColors: 24,
  sampleStep: 4,

  svg: null,
  svgWidth: 0,
  svgHeight: 0,
  backgroundHex: null,

  activeSwatch: null,
  recolorMap: {},
  islandRecolorMode: false,

  status: null,

  setImage(meta, bmp) {
    set({ imageMeta: meta, imageBitmap: bmp, svg: null, recolorMap: {}, activeSwatch: null })
  },
  clearImage() {
    const meta = get().imageMeta
    if (meta) URL.revokeObjectURL(meta.objectUrl)
    set({ imageMeta: null, imageBitmap: null, chips: [], groups: [], svg: null, recolorMap: {}, activeSwatch: null })
  },
  setStatus(s) { set({ status: s }) },

  setSimilarity(pct) {
    set({ similarityPct: pct })
  },
  setMaxColors(n) { set({ maxColors: n }) },
  setSampleStep(n) { set({ sampleStep: n }) },
  setTechnique(t) { set({ params: { ...get().params, technique: t } }) },
  setVectorResolution(n) { set({ params: { ...get().params, vectorResolution: n } }) },
  setVectorDetail(n) { set({ params: { ...get().params, vectorDetail: n } }) },
  setMinIsland(n) { set({ params: { ...get().params, minIsland: n } }) },

  setGroups(groups) {
    // recompute shares
    const chips = get().chips
    const totalsByGroup: Record<string, number> = {}
    groups.forEach(g => { totalsByGroup[g.id] = 0 })
    const sum = chips.reduce((a,c)=>a+c.count,0) || 1
    const chipById: Record<string, number> = Object.fromEntries(chips.map(c => [c.id, c.count]))
    for (const g of groups) {
      for (const id of g.chipIds) {
        totalsByGroup[g.id] += chipById[id] || 0
      }
    }
    const withShare = groups.map(g => ({ ...g, share: (totalsByGroup[g.id] || 0) / sum })) as ColorGroup[]
    // compute ungrouped
    const grouped = new Set(withShare.flatMap(g=>g.chipIds))
    const ungroupedIds = chips.map(c => c.id).filter(id => !grouped.has(id))
    set({ groups: withShare, ungroupedIds })
  },
  setAutoGroups(g) { set({ autoGroups: g }) },
  resetGroups() {
    const auto = get().autoGroups
    if (auto.length) {
      // compute shares with current chips
      const chips = get().chips
      const sum = chips.reduce((a,c)=>a+c.count,0) || 1
      const chipById: Record<string, number> = Object.fromEntries(chips.map(c => [c.id, c.count]))
      const withShare = auto.map(e => ({
        ...e,
        chipIds: e.chipIds.filter(id => chipById[id] != null),
        share: (e.chipIds.reduce((a,id)=>a+(chipById[id]||0),0))/sum
      })) as ColorGroup[]
      const grouped = new Set(withShare.flatMap(g=>g.chipIds))
      const ungroupedIds = chips.map(c => c.id).filter(id => !grouped.has(id))
      set({ groups: withShare, ungroupedIds })
    }
  },
  addEmptyGroup() {
    const id = 'g_' + Math.random().toString(36).slice(2,9)
    const g = {
      id, name: `Group ${get().groups.length+1}`,
      chipIds: [], repHex: '#000000', repLab: {L:0,a:0,b:0}
    }
    const groups = [...get().groups, { ...g, share: 0 }]
    set({ groups })
  },
  moveChip(chipId, fromGroupId, toGroupId) {
    const groups = get().groups.map(g => ({...g}))
    if (fromGroupId) {
      const g = groups.find(g=>g.id===fromGroupId)
      if (g) g.chipIds = g.chipIds.filter(id=>id!==chipId)
    }
    if (toGroupId) {
      const g = groups.find(g=>g.id===toGroupId)
      if (g && !g.chipIds.includes(chipId)) g.chipIds.push(chipId)
    }
    get().setGroups(groups)
  },

  setChips(ch) {
    set({ chips: ch })
  },

  setSvg(res) {
    set({ svg: res.svg, svgWidth: res.width, svgHeight: res.height, backgroundHex: res.backgroundHex })
  },
  setActiveSwatch(hex) { set({ activeSwatch: hex }) },
  setRecolorMap(map) { set({ recolorMap: map }) },
  setIslandRecolorMode(enabled) { set({ islandRecolorMode: enabled }) },
}))
