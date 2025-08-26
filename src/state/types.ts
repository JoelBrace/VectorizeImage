export type Technique = 'contours' | 'rect_runs'
export type ExtractionMode = 'frequency' | 'diverse'

export interface ImageMeta {
  width: number
  height: number
  fileSize: number
  name: string
  objectUrl: string
}

export interface ColorChip {
  id: string
  hex: string
  count: number
  share: number  // 0..1
  L: number; a: number; b: number
}

export interface ColorGroup {
  id: string
  name: string
  chipIds: string[]
  share: number // 0..1 of palette sample
  repHex: string
  repLab: { L: number; a: number; b: number }
}

export interface VectorParams {
  vectorResolution: number // max dimension in px
  vectorDetail: number // cell size in px (on scaled image)
  minIsland: number // minimum island size in cells
  technique: Technique
}

export interface WorkerExtractResult {
  chips: ColorChip[]
}

export interface WorkerGroupResult {
  groups: Omit<ColorGroup,'share'>[]
}

export interface WorkerSvgResult {
  svg: string
  width: number
  height: number
  backgroundHex: string
  areaByGroup: Record<string, number>
}

export interface StatusMessage {
  stage: string
  detail?: string
}
