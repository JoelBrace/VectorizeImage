import React from 'react'
import Uploader from './components/Uploader'
import PalettePanel from './components/PalettePanel'
import GroupsGrid from './components/GroupsGrid'
import VectorPanel from './components/VectorPanel'
import SvgPreview from './components/SvgPreview'
import StatusBar from './components/StatusBar'
import { useApp } from './state/store'

export default function App() {
  const imageMeta = useApp(s=>s.imageMeta)
  const svg = useApp(s=>s.svg)
  return (
    <div className="app">
      <div className="sidebar">
        <Uploader />
        <PalettePanel />
        <GroupsGrid />
        <VectorPanel />
        <StatusBar />
      </div>
      <div className="main">
        <div className="preview-wrap">
          <SvgPreview />
        </div>
      </div>
    </div>
  )
}
