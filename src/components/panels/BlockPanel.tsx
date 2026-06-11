import { useState } from 'react'
import { useProjectStore } from '../../store/projectStore'
import { blocksByCategory, categoryLabels, categoryColors, blockDefs } from '../../engine/blockEngine/blockDefs'
import type { BlockCategory, BlockType } from '../../types'
import { BlockScriptEditor } from '../blocks/BlockScriptEditor'

const CATEGORIES: BlockCategory[] = ['lifecycle', 'motion', 'variable', 'logic', 'loop', 'function', 'math', 'control']

export function BlockPanel() {
  const { editor, getActiveScene } = useProjectStore()
  const [activeCategory, setActiveCategory] = useState<BlockCategory>('lifecycle')
  const [view, setView] = useState<'palette' | 'scripts'>('palette')

  const scene = getActiveScene()
  const selectedObj = scene?.objects.find(o => editor.selectedObjectIds[0] === o.id)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Mode toggle */}
      <div className="flex border-b border-surface-800">
        <button
          className={`flex-1 py-1.5 text-xs font-medium transition-colors ${view === 'palette' ? 'text-brand-400 border-b-2 border-brand-500 bg-surface-800/50' : 'text-surface-500 hover:text-surface-300'}`}
          onClick={() => setView('palette')}
        >
          Blöcke
        </button>
        <button
          className={`flex-1 py-1.5 text-xs font-medium transition-colors ${view === 'scripts' ? 'text-brand-400 border-b-2 border-brand-500 bg-surface-800/50' : 'text-surface-500 hover:text-surface-300'}`}
          onClick={() => setView('scripts')}
        >
          Skripte
        </button>
      </div>

      {view === 'palette' ? (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Category tabs */}
          <div className="flex overflow-x-auto gap-0.5 p-1.5 bg-surface-950/50 border-b border-surface-800">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                className={`flex-shrink-0 px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                  activeCategory === cat ? 'bg-surface-700 text-surface-100' : 'text-surface-500 hover:text-surface-300'
                }`}
                style={{ color: activeCategory === cat ? categoryColors[cat] : undefined }}
                onClick={() => setActiveCategory(cat)}
              >
                {categoryLabels[cat]}
              </button>
            ))}
          </div>

          {/* Block list */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
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
      ) : (
        <div className="flex-1 overflow-hidden flex flex-col">
          {selectedObj ? (
            <BlockScriptEditor objectId={selectedObj.id} objectName={selectedObj.name} />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
              <div className="text-3xl mb-2 opacity-30">🧩</div>
              <p className="text-xs text-surface-500">Wähle ein Objekt in der Szene aus, um seine Skripte zu bearbeiten.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
