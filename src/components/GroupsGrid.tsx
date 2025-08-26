import React, { useMemo } from 'react'
import { useApp } from '../state/store'
import { useDroppable, useDraggable, DndContext } from '@dnd-kit/core'
import clsx from 'clsx'

function Chip({ id, hex, share, fromGroupId }: { id:string, hex: string, share: number, fromGroupId: string | null }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id })
  const style = { transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined, ['--swatch' as any]: hex, transformOrigin: 'left' }
  return <span ref={setNodeRef} {...attributes} {...listeners} className="chip" title={`${hex} • ${(share*100).toFixed(1)}%`} style={style as any}>{hex}</span>
}

function DropZone({ groupId, children }: { groupId: string, children?: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({ id: groupId })
  return <div ref={setNodeRef} className={clsx('dropzone', { over: isOver })} aria-label={`Drop zone for ${groupId}`}>{children}</div>
}

export default function GroupsGrid() {
  const chips = useApp(s=>s.chips)
  const groups = useApp(s=>s.groups)
  const ungroupedIds = useApp(s=>s.ungroupedIds)
  const moveChip = useApp(s=>s.moveChip)
  const resetGroups = useApp(s=>s.resetGroups)
  const addEmptyGroup = useApp(s=>s.addEmptyGroup)

  const chipById = useMemo(()=>Object.fromEntries(chips.map(c=>[c.id,c])), [chips])

  const onDragEnd = (event: any) => {
    const { active, over } = event
    if (!active?.id) return
    const chipId = String(active.id)
    const fromGroup = groups.find(g=>g.chipIds.includes(chipId))
    const fromGroupId = fromGroup ? fromGroup.id : null
    const toGroupId = over ? String(over.id) : null
    // allow dropping into special "ungrouped" id
    moveChip(chipId, fromGroupId, toGroupId === 'ungrouped' ? null : toGroupId)
  }

  const ungroupedChips = ungroupedIds.map(id => chipById[id]).filter(Boolean)

  return (
    <div className="panel" aria-label="Groups layout">
      <h3>Groups</h3>
      <div className="row" style={{justifyContent:'space-between'}}>
        <div className="small">Drag color chips between groups. Only colors in groups are used in vectorization.</div>
        <div className="row">
          <button className="btn" onClick={addEmptyGroup}>New empty group</button>
          <button className="btn" onClick={resetGroups}>Reset groups</button>
        </div>
      </div>

      <DndContext onDragEnd={onDragEnd}>
        <div className="card-grid" style={{marginTop:8}}>
          {groups.map((g,i)=>{
            const groupChips = g.chipIds.map(id=>chipById[id]).filter(Boolean)
            const pct = (g.share*100).toFixed(1)
            return (
              <div className="group-card" key={g.id} aria-label={`Group ${i+1}`}>
                <div className="group-header">
                  <div className="row">
                    <div className="swatch" style={{ background: g.repHex }} title={`Representative ${g.repHex}`} />
                    <div><strong>{g.name}</strong><div className="small">{groupChips.length} colors • {pct}%</div></div>
                  </div>
                  <div className="small">{g.id}</div>
                </div>
                <DropZone groupId={g.id}>
                  <div className="palette-chips">
                    {groupChips.map(c=> <Chip key={c.id} id={c.id} hex={c.hex} share={c.share} fromGroupId={g.id} />)}
                  </div>
                </DropZone>
              </div>
            )
          })}
          <div className="group-card" key="ungrouped" aria-label="Ungrouped">
            <div className="group-header">
              <div><strong>Ungrouped</strong><div className="small">{ungroupedChips.length} colors</div></div>
            </div>
            <DropZone groupId="ungrouped">
              <div className="palette-chips">
                {ungroupedChips.map(c=> <Chip key={c.id} id={c.id} hex={c.hex} share={c.share} fromGroupId={null} />)}
              </div>
            </DropZone>
          </div>
        </div>
      </DndContext>
    </div>
  )
}
