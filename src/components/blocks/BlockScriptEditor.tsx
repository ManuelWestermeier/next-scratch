import { useState } from 'react'
import { useProjectStore } from '../../store/projectStore'
import { BlockView } from './BlockView'
import type { Block, BlockScript } from '../../types'
import { createBlock } from '../../utils/defaults'
import { v4 as uuidv4 } from 'uuid'
import { blockDefs } from '../../engine/blockEngine/blockDefs'
import type { BlockType } from '../../types'

interface Props {
  objectId: string
  objectName: string
}

export function BlockScriptEditor({ objectId, objectName }: Props) {
  const { getScriptsForObject, addScript, updateScript, deleteScript } = useProjectStore()
  const scripts = getScriptsForObject(objectId)
  const [selectedScript, setSelectedScript] = useState<string | null>(scripts[0]?.id ?? null)

  const activeScript = scripts.find(s => s.id === selectedScript)

  const handleAddScript = (trigger: BlockScript['trigger']) => {
    const starterBlock = createBlock(trigger === 'setup' ? 'setup' : 'loop_tick')
    const script: BlockScript = {
      id: uuidv4(),
      objectId,
      trigger,
      blocks: [starterBlock],
    }
    addScript(script)
    setSelectedScript(script.id)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (!activeScript) return
    const blockType = e.dataTransfer.getData('block-type') as BlockType
    if (!blockType) return

    const newBlock = createBlock(blockType)
    newBlock.objectId = objectId

    const updatedBlocks = [...activeScript.blocks, newBlock]
    updateScript(activeScript.id, updatedBlocks)
  }

  const handleUpdateBlock = (scriptId: string, updatedBlocks: Block[]) => {
    updateScript(scriptId, updatedBlocks)
  }

  const handleDeleteBlock = (scriptId: string, blockId: string) => {
    const script = scripts.find(s => s.id === scriptId)
    if (!script) return
    const remove = (blocks: Block[]): Block[] =>
      blocks.filter(b => b.id !== blockId).map(b => ({
        ...b,
        children: b.children ? remove(b.children) : undefined,
        elseChildren: b.elseChildren ? remove(b.elseChildren) : undefined,
      }))
    updateScript(scriptId, remove(script.blocks))
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Object header */}
      <div className="px-3 py-2 border-b border-surface-800 bg-surface-950/50">
        <div className="text-xs font-semibold text-surface-300 truncate">{objectName}</div>
        <div className="text-[10px] text-surface-600">Skripte</div>
      </div>

      {/* Script tabs */}
      <div className="flex gap-1 p-1.5 border-b border-surface-800 overflow-x-auto">
        {scripts.map(s => (
          <button
            key={s.id}
            className={`flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors ${
              selectedScript === s.id
                ? 'bg-brand-600/30 text-brand-300 border border-brand-600/40'
                : 'text-surface-500 hover:text-surface-300 bg-surface-800'
            }`}
            onClick={() => setSelectedScript(s.id)}
          >
            {s.trigger === 'setup' ? '▶' : '🔄'} {s.trigger}
            <span
              className="text-surface-600 hover:text-accent-rose ml-1"
              onClick={e => { e.stopPropagation(); deleteScript(s.id); setSelectedScript(scripts.find(sc => sc.id !== s.id)?.id ?? null) }}
            >×</span>
          </button>
        ))}
        <button
          className="flex-shrink-0 px-2 py-1 rounded text-[10px] text-surface-500 hover:text-brand-400 bg-surface-800 hover:bg-surface-700"
          onClick={() => handleAddScript('setup')}
          title="Setup-Skript hinzufügen"
        >+ Setup</button>
        <button
          className="flex-shrink-0 px-2 py-1 rounded text-[10px] text-surface-500 hover:text-brand-400 bg-surface-800 hover:bg-surface-700"
          onClick={() => handleAddScript('loop')}
          title="Loop-Skript hinzufügen"
        >+ Loop</button>
      </div>

      {/* Script area */}
      {activeScript ? (
        <div
          className="flex-1 overflow-y-auto p-2 space-y-1"
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
        >
          {activeScript.blocks.map(block => (
            <BlockView
              key={block.id}
              block={block}
              depth={0}
              onDelete={() => handleDeleteBlock(activeScript.id, block.id)}
              onUpdate={(updated) => {
                const replace = (blocks: Block[]): Block[] =>
                  blocks.map(b => b.id === updated.id ? updated : {
                    ...b,
                    children: b.children ? replace(b.children) : undefined,
                    elseChildren: b.elseChildren ? replace(b.elseChildren) : undefined,
                  })
                updateScript(activeScript.id, replace(activeScript.blocks))
              }}
              scriptId={activeScript.id}
              objectId={objectId}
              allBlocks={activeScript.blocks}
              onBlocksChange={(blocks) => updateScript(activeScript.id, blocks)}
            />
          ))}
          <div className="h-12 border-2 border-dashed border-surface-800 rounded-lg flex items-center justify-center text-xs text-surface-600 mt-2">
            Blöcke hier ablegen
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
          <div className="text-2xl mb-2 opacity-30">📝</div>
          <p className="text-xs text-surface-500 mb-3">Noch keine Skripte</p>
          <div className="flex gap-2">
            <button className="btn-ghost text-xs border border-surface-700" onClick={() => handleAddScript('setup')}>+ Setup</button>
            <button className="btn-ghost text-xs border border-surface-700" onClick={() => handleAddScript('loop')}>+ Loop</button>
          </div>
        </div>
      )}
    </div>
  )
}
