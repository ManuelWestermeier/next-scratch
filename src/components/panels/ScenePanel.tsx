import { useState } from 'react'
import { useProjectStore } from '../../store/projectStore'
import type { SceneObject, SceneVariable } from '../../types'
import { createImageObject, createBlock } from '../../utils/defaults'
import { v4 as uuidv4 } from 'uuid'
import { BlockScriptEditor } from '../blocks/BlockScriptEditor'
import { blocksByCategory, categoryLabels, categoryColors } from '../../engine/blockEngine/blockDefs'
import type { BlockCategory } from '../../types'

const CATEGORIES: BlockCategory[] = ['lifecycle', 'motion', 'variable', 'logic', 'loop', 'function', 'math', 'control']

export function ScenePanel() {
  const store = useProjectStore()
  const {
    getActiveProject, getActiveScene, editor, setSelectedObjects,
    addObject, deleteObject, createScene, deleteScene, setActiveScene,
    renameScene, duplicateObject, bringForward, sendBackward,
    addVariable, updateVariable, deleteVariable, addFunction, updateFunction, deleteFunction,
  } = store

  const project = getActiveProject()
  const scene = getActiveScene()
  const [newSceneName, setNewSceneName] = useState('')
  const [addingScene, setAddingScene] = useState(false)
  const [renamingScene, setRenamingScene] = useState<string | null>(null)
  const [renameVal, setRenameVal] = useState('')
  const [activeCategory, setActiveCategory] = useState<BlockCategory>('lifecycle')
  const [newVarName, setNewVarName] = useState('')
  const [newFnName, setNewFnName] = useState('')
  const [newFnParam, setNewFnParam] = useState('')

  if (!project || !scene) return null

  const sortedObjects = [...scene.objects].sort((a, b) => b.layer - a.layer)
  const selectedTarget = scene.objects.find(o => editor.selectedObjectIds[0] === o.id) ?? scene.objects[0] ?? null

  const handleAddScene = () => {
    if (!newSceneName.trim()) return
    const s = createScene(project.id, newSceneName.trim())
    setActiveScene(s.id)
    setNewSceneName('')
    setAddingScene(false)
  }

  const getAssetIdByName = (name: string) => project.assets.find(a => a.name === name)?.id ?? ''

  const handleAddImageObject = (kind: 'player' | 'platform' | 'wall' | 'finish' | 'generic') => {
    const assetMap: Record<typeof kind, string> = {
      player: getAssetIdByName('Triangle Player'),
      platform: getAssetIdByName('Platform'),
      wall: getAssetIdByName('Wall'),
      finish: getAssetIdByName('Finish'),
      generic: '',
    }
    const labels: Record<typeof kind, string> = {
      player: 'Spieler',
      platform: 'Plattform',
      wall: 'Wand',
      finish: 'Ziel',
      generic: 'Bild',
    }
    const sizes: Record<typeof kind, { w: number; h: number }> = {
      player: { w: 42, h: 42 },
      platform: { w: 180, h: 36 },
      wall: { w: 52, h: 160 },
      finish: { w: 56, h: 70 },
      generic: { w: 80, h: 80 },
    }
    const obj = createImageObject({
      id: uuidv4(),
      name: labels[kind],
      x: 60 + Math.random() * 180,
      y: 60 + Math.random() * 120,
      layer: kind === 'player' ? 10 : 2,
      w: sizes[kind].w,
      h: sizes[kind].h,
      assetId: assetMap[kind],
    })
    addObject(obj)
    setSelectedObjects([obj.id])
  }

  const handleAddVariable = () => {
    if (!newVarName.trim()) return
    const v: SceneVariable = {
      id: uuidv4(),
      name: newVarName.trim(),
      type: 'number',
      defaultValue: 0,
    }
    addVariable(v)
    setNewVarName('')
  }

  const handleAddFunction = () => {
    if (!newFnName.trim()) return
    addFunction({
      id: uuidv4(),
      name: newFnName.trim(),
      params: newFnParam.split(',').map(v => v.trim()).filter(Boolean),
      blocks: [createBlock('func_declare')],
    })
    setNewFnName('')
    setNewFnParam('')
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
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
                    if (e.key === 'Enter') { renameScene(project.id, s.id, renameVal); setRenamingScene(null) }
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
                      onClick={e => { e.stopPropagation(); if (confirm('Szene löschen?')) deleteScene(project.id, s.id) }}
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

      <div className="border-b border-surface-800 p-2">
        <div className="text-xs text-surface-500 font-semibold mb-1.5 uppercase tracking-wider px-1">Objekte</div>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { key: 'player', label: 'Spieler', icon: '△' },
            { key: 'platform', label: 'Plattform', icon: '▭' },
            { key: 'wall', label: 'Wand', icon: '▮' },
            { key: 'finish', label: 'Ziel', icon: '⚑' },
            { key: 'generic', label: 'Bild', icon: '🖼' },
          ].map(item => (
            <button
              key={item.key}
              className="flex items-center gap-2 p-2 rounded-md bg-surface-800 hover:bg-surface-700 transition-colors cursor-pointer text-xs text-surface-300 hover:text-surface-100"
              onClick={() => handleAddImageObject(item.key as 'player' | 'platform' | 'wall' | 'finish' | 'generic')}
              draggable
              onDragStart={e => e.dataTransfer.setData('object-type', 'image')}
              title={item.label}
            >
              <span className="text-sm w-4 text-center">{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="border-b border-surface-800 p-2">
        <div className="text-xs text-surface-500 font-semibold mb-1.5 uppercase tracking-wider px-1">Variablen</div>
        <div className="space-y-1.5">
          <div className="flex gap-1.5">
            <input
              className="input flex-1 text-xs"
              placeholder="Name..."
              value={newVarName}
              onChange={e => setNewVarName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddVariable() }}
            />
            <button className="btn-ghost text-xs px-2" onClick={handleAddVariable}>+</button>
          </div>
          {(scene.variables ?? []).length === 0 ? (
            <div className="text-[10px] text-surface-600 px-1 py-1">Keine Variablen</div>
          ) : (
            <div className="space-y-1">
              {scene.variables.map(v => (
                <div key={v.id} className="rounded-md border border-surface-700 bg-surface-800/70 p-2 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <input
                      className="input flex-1 text-xs"
                      value={v.name}
                      onChange={e => updateVariable(v.id, { name: e.target.value })}
                    />
                    <button className="text-surface-500 hover:text-accent-rose text-xs" onClick={() => deleteVariable(v.id)}>✕</button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <select
                      className="input text-xs"
                      value={v.type}
                      onChange={e => updateVariable(v.id, { type: e.target.value as SceneVariable['type'] })}
                    >
                      <option value="number">number</option>
                      <option value="string">string</option>
                      <option value="boolean">boolean</option>
                    </select>
                    <input
                      className="input text-xs"
                      value={String(v.defaultValue)}
                      onChange={e => updateVariable(v.id, { defaultValue: e.target.value })}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="border-b border-surface-800 p-2">
        <div className="text-xs text-surface-500 font-semibold mb-1.5 uppercase tracking-wider px-1">Funktionen</div>
        <div className="space-y-1.5">
          <div className="flex gap-1.5">
            <input
              className="input flex-1 text-xs"
              placeholder="Name..."
              value={newFnName}
              onChange={e => setNewFnName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddFunction() }}
            />
            <button className="btn-ghost text-xs px-2" onClick={handleAddFunction}>+</button>
          </div>
          <input
            className="input w-full text-xs"
            placeholder="Parameter, durch Komma getrennt"
            value={newFnParam}
            onChange={e => setNewFnParam(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAddFunction() }}
          />
          {(scene.functions ?? []).length === 0 ? (
            <div className="text-[10px] text-surface-600 px-1 py-1">Keine Funktionen</div>
          ) : (
            <div className="space-y-1">
              {scene.functions.map(fn => (
                <div key={fn.id} className="rounded-md border border-surface-700 bg-surface-800/70 p-2 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <input
                      className="input flex-1 text-xs"
                      value={fn.name}
                      onChange={e => updateFunction(fn.id, { name: e.target.value })}
                    />
                    <button className="text-surface-500 hover:text-accent-rose text-xs" onClick={() => deleteFunction(fn.id)}>✕</button>
                  </div>
                  <div className="text-[10px] text-surface-500 px-1">Parameter: {fn.params.join(', ') || '—'}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="border-b border-surface-800 p-2">
        <div className="text-xs text-surface-500 font-semibold mb-1.5 uppercase tracking-wider px-1">Blöcke</div>
        <div className="flex flex-wrap gap-1 mb-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                activeCategory === cat ? 'bg-surface-700 text-surface-100' : 'text-surface-500 hover:text-surface-300'
              }`}
              style={{ color: activeCategory === cat ? categoryColors[cat] : undefined }}
              onClick={() => setActiveCategory(cat)}
            >
              {categoryLabels[cat]}
            </button>
          ))}
        </div>
        <div className="max-h-56 overflow-y-auto space-y-1">
          {(blocksByCategory[activeCategory] ?? []).map(def => (
            <div
              key={def.type}
              className="rounded-md px-2.5 py-2 cursor-grab active:cursor-grabbing hover:brightness-110 transition-all text-xs font-medium select-none"
              style={{ background: def.bgColor, border: `1px solid ${def.borderColor}`, color: def.color }}
              draggable
              onDragStart={e => {
                e.dataTransfer.setData('block-type', def.type)
                e.dataTransfer.effectAllowed = 'copy'
              }}
              title={def.description}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm w-5 text-center">{def.icon}</span>
                <span>{def.label}</span>
              </div>
              <div className="text-[10px] opacity-60 mt-0.5 ml-7">{def.description}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="panel-header justify-between">
          <span>Block-Skripte</span>
          <span className="text-[10px] text-surface-500 truncate max-w-32">{selectedTarget?.name ?? 'Kein Objekt'}</span>
        </div>
        {selectedTarget ? (
          <BlockScriptEditor objectId={selectedTarget.id} objectName={selectedTarget.name} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
            <div className="text-3xl mb-2 opacity-30">🧩</div>
            <p className="text-xs text-surface-500">Kein Objekt ausgewählt.</p>
          </div>
        )}
      </div>
    </div>
  )
}
