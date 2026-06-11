import { useState } from 'react'
import { useProjectStore } from '../../store/projectStore'
import type { SceneObject } from '../../types'
import { createShapeObject } from '../../utils/defaults'
import { v4 as uuidv4 } from 'uuid'

export function ScenePanel() {
  const { getActiveProject, getActiveScene, editor, setSelectedObjects,
    addObject, deleteObject, updateObject, createScene, deleteScene, setActiveScene,
    renameScene, duplicateObject, bringForward, sendBackward } = useProjectStore()

  const project = getActiveProject()
  const scene = getActiveScene()
  const [contextMenu, setContextMenu] = useState<{ objId: string; x: number; y: number } | null>(null)
  const [newSceneName, setNewSceneName] = useState('')
  const [addingScene, setAddingScene] = useState(false)
  const [renamingScene, setRenamingScene] = useState<string | null>(null)
  const [renameVal, setRenameVal] = useState('')

  if (!project || !scene) return null

  const sortedObjects = [...scene.objects].sort((a, b) => b.layer - a.layer)

  const handleAddShape = (shapeType: 'rect' | 'ellipse' | 'triangle' | 'star') => {
    const labels: Record<string, string> = { rect: 'Rechteck', ellipse: 'Ellipse', triangle: 'Dreieck', star: 'Stern' }
    const colors: Record<string, string> = { rect: '#6366f1', ellipse: '#14b8a6', triangle: '#f59e0b', star: '#f43f5e' }
    const obj = createShapeObject({
      id: uuidv4(),
      shapeType,
      name: labels[shapeType],
      fill: colors[shapeType],
      x: 50 + Math.random() * 200,
      y: 50 + Math.random() * 150,
    })
    addObject(obj)
    setSelectedObjects([obj.id])
  }

  const handleAddAudio = () => {
    const obj: SceneObject = {
      id: uuidv4(),
      kind: 'audio',
      name: 'Audio',
      x: 20,
      y: 20,
      w: 60,
      h: 60,
      r: 0,
      visible: true,
      layer: 0,
      locked: false,
      opacity: 1,
      assetId: '',
      volume: 1,
      loop: false,
      autoplay: false,
    }
    addObject(obj)
    setSelectedObjects([obj.id])
  }

  const handleAddScene = () => {
    if (!newSceneName.trim()) return
    if (!project) return
    const s = createScene(project.id, newSceneName.trim())
    setActiveScene(s.id)
    setNewSceneName('')
    setAddingScene(false)
  }

  const objIcon = (o: SceneObject) => {
    if (o.kind === 'image') return '🖼'
    if (o.kind === 'audio') return '🔊'
    const shapes: Record<string, string> = { rect: '⬛', ellipse: '⬤', triangle: '△', star: '★' }
    return shapes[(o as any).shapeType] ?? '▪'
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Scenes */}
      <div className="border-b border-surface-800">
        <div className="panel-header justify-between">
          <span>Szenen</span>
          <button className="text-surface-400 hover:text-brand-400 text-base leading-none" onClick={() => setAddingScene(true)} title="Szene hinzufügen">+</button>
        </div>
        <div className="p-1 space-y-0.5 max-h-28 overflow-y-auto">
          {project.scenes.map(s => (
            <div
              key={s.id}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer group text-xs transition-colors ${
                s.id === editor.activeSceneId
                  ? 'bg-brand-600/20 text-brand-300'
                  : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800'
              }`}
              onClick={() => setActiveScene(s.id)}
            >
              {renamingScene === s.id ? (
                <input
                  className="input text-xs flex-1 py-0.5"
                  value={renameVal}
                  onChange={e => setRenameVal(e.target.value)}
                  onKeyDown={e => {
                    e.stopPropagation()
                    if (e.key === 'Enter') { if (project) renameScene(project.id, s.id, renameVal); setRenamingScene(null) }
                    if (e.key === 'Escape') setRenamingScene(null)
                  }}
                  onClick={e => e.stopPropagation()}
                  autoFocus
                />
              ) : (
                <>
                  <span className="text-xs opacity-50">🎬</span>
                  <span className="flex-1 truncate">{s.name}</span>
                  <button
                    className="opacity-0 group-hover:opacity-100 text-surface-500 hover:text-surface-300 text-xs"
                    onClick={e => { e.stopPropagation(); setRenamingScene(s.id); setRenameVal(s.name) }}
                  >✏</button>
                  {project.scenes.length > 1 && (
                    <button
                      className="opacity-0 group-hover:opacity-100 text-surface-500 hover:text-accent-rose text-xs"
                      onClick={e => { e.stopPropagation(); if (project && confirm('Szene löschen?')) deleteScene(project.id, s.id) }}
                    >✕</button>
                  )}
                </>
              )}
            </div>
          ))}
          {addingScene && (
            <div className="px-1 py-1">
              <input
                className="input text-xs w-full"
                placeholder="Szenenname..."
                value={newSceneName}
                onChange={e => setNewSceneName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddScene(); if (e.key === 'Escape') setAddingScene(false) }}
                autoFocus
              />
            </div>
          )}
        </div>
      </div>

      {/* Add objects */}
      <div className="border-b border-surface-800 p-2">
        <div className="text-xs text-surface-500 font-semibold mb-1.5 uppercase tracking-wider px-1">Objekt hinzufügen</div>
        <div className="grid grid-cols-4 gap-1">
          {([
            { type: 'rect', icon: '⬛', label: 'Rechteck' },
            { type: 'ellipse', icon: '⬤', label: 'Ellipse' },
            { type: 'triangle', icon: '△', label: 'Dreieck' },
            { type: 'star', icon: '★', label: 'Stern' },
          ] as const).map(s => (
            <button
              key={s.type}
              className="flex flex-col items-center gap-0.5 p-1.5 rounded-md bg-surface-800 hover:bg-surface-700 transition-colors cursor-pointer text-xs text-surface-400 hover:text-surface-200"
              onClick={() => handleAddShape(s.type)}
              title={s.label}
              draggable
              onDragStart={e => e.dataTransfer.setData('object-type', 'shape')}
            >
              <span className="text-sm">{s.icon}</span>
              <span className="text-[10px] leading-tight">{s.label}</span>
            </button>
          ))}
          <button
            className="flex flex-col items-center gap-0.5 p-1.5 rounded-md bg-surface-800 hover:bg-surface-700 transition-colors cursor-pointer text-xs text-surface-400 hover:text-surface-200"
            onClick={handleAddAudio}
            title="Audio"
          >
            <span className="text-sm">🔊</span>
            <span className="text-[10px] leading-tight">Audio</span>
          </button>
        </div>
      </div>

      {/* Object list */}
      <div className="flex-1 overflow-y-auto">
        <div className="panel-header">Objekte ({scene.objects.length})</div>
        {sortedObjects.length === 0 ? (
          <div className="p-3 text-center text-xs text-surface-600">Keine Objekte — füge oben welche hinzu</div>
        ) : (
          <div className="p-1 space-y-0.5">
            {sortedObjects.map(obj => (
              <div
                key={obj.id}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer group text-xs transition-colors ${
                  editor.selectedObjectIds.includes(obj.id)
                    ? 'bg-brand-600/20 text-brand-300 border border-brand-600/30'
                    : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800'
                }`}
                onClick={() => setSelectedObjects([obj.id])}
                onContextMenu={e => {
                  e.preventDefault()
                  setContextMenu({ objId: obj.id, x: e.clientX, y: e.clientY })
                }}
              >
                <span className="text-sm">{objIcon(obj)}</span>
                <span className="flex-1 truncate">{obj.name}</span>
                <button
                  className="opacity-0 group-hover:opacity-100 text-surface-500 hover:text-surface-300"
                  onClick={e => { e.stopPropagation(); updateObject(obj.id, { visible: !obj.visible }) }}
                  title={obj.visible ? 'Ausblenden' : 'Einblenden'}
                >
                  {obj.visible ? '👁' : '🙈'}
                </button>
                <button
                  className="opacity-0 group-hover:opacity-100 text-surface-500 hover:text-accent-rose"
                  onClick={e => { e.stopPropagation(); deleteObject(obj.id) }}
                >✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
          <div
            className="fixed z-50 bg-surface-800 border border-surface-700 rounded-lg shadow-xl py-1 w-40 animate-fade-in"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            {[
              { label: 'Duplizieren', action: () => duplicateObject(contextMenu.objId) },
              { label: 'Nach vorne', action: () => bringForward(contextMenu.objId) },
              { label: 'Nach hinten', action: () => sendBackward(contextMenu.objId) },
              null,
              { label: 'Löschen', action: () => deleteObject(contextMenu.objId), danger: true },
            ].map((item, i) =>
              item === null ? (
                <div key={i} className="my-1 border-t border-surface-700" />
              ) : (
                <button
                  key={item.label}
                  className={`w-full text-left px-3 py-1.5 text-sm hover:bg-surface-700 ${item.danger ? 'text-accent-rose' : 'text-surface-200'}`}
                  onClick={() => { item.action(); setContextMenu(null) }}
                >
                  {item.label}
                </button>
              )
            )}
          </div>
        </>
      )}
    </div>
  )
}
