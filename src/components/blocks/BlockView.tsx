import { useState } from 'react'
import type { Block, BlockType } from '../../types'
import { blockDefs } from '../../engine/blockEngine/blockDefs'
import { createBlock } from '../../utils/defaults'
import { v4 as uuidv4 } from 'uuid'

interface Props {
  block: Block
  depth: number
  onDelete: () => void
  onUpdate: (updated: Block) => void
  scriptId: string
  objectId: string
  allBlocks: Block[]
  onBlocksChange: (blocks: Block[]) => void
}

export function BlockView({ block, depth, onDelete, onUpdate, scriptId, objectId, allBlocks, onBlocksChange }: Props) {
  const def = blockDefs.get(block.type)
  const [collapsed, setCollapsed] = useState(false)
  const [dropzone, setDropzone] = useState<'children' | 'else' | null>(null)

  if (!def) return null

  const isContainer = def.hasChildren || def.isContainer

  const handleParamChange = (paramId: string, value: string) => {
    const updated: Block = {
      ...block,
      params: block.params.map(p => p.id === paramId ? { ...p, value } : p),
    }
    onUpdate(updated)
  }

  const handleDropOnChildren = (e: React.DragEvent, target: 'children' | 'else') => {
    e.preventDefault()
    e.stopPropagation()
    setDropzone(null)
    const blockType = e.dataTransfer.getData('block-type') as BlockType
    if (!blockType) return
    const newBlock = createBlock(blockType)
    newBlock.objectId = objectId

    if (target === 'children') {
      onUpdate({ ...block, children: [...(block.children ?? []), newBlock] })
    } else {
      onUpdate({ ...block, elseChildren: [...(block.elseChildren ?? []), newBlock] })
    }
  }

  const handleDeleteChild = (childId: string, from: 'children' | 'else') => {
    if (from === 'children') {
      onUpdate({ ...block, children: (block.children ?? []).filter(c => c.id !== childId) })
    } else {
      onUpdate({ ...block, elseChildren: (block.elseChildren ?? []).filter(c => c.id !== childId) })
    }
  }

  const handleUpdateChild = (updated: Block, from: 'children' | 'else') => {
    const replace = (blocks: Block[]): Block[] =>
      blocks.map(b => b.id === updated.id ? updated : {
        ...b,
        children: b.children ? replace(b.children) : undefined,
        elseChildren: b.elseChildren ? replace(b.elseChildren) : undefined,
      })
    if (from === 'children') {
      onUpdate({ ...block, children: replace(block.children ?? []) })
    } else {
      onUpdate({ ...block, elseChildren: replace(block.elseChildren ?? []) })
    }
  }

  const indent = depth * 10

  return (
    <div
      className="relative group animate-fade-in"
      style={{ marginLeft: indent }}
    >
      {/* Main block */}
      <div
        className="rounded-md border text-xs font-medium select-none"
        style={{ background: def.bgColor, borderColor: def.borderColor }}
      >
        {/* Header row */}
        <div className="flex items-center gap-1.5 px-2 py-1.5">
          {isContainer && (
            <button
              className="text-[10px] opacity-50 hover:opacity-100 w-3 text-center"
              onClick={() => setCollapsed(c => !c)}
            >
              {collapsed ? '▶' : '▼'}
            </button>
          )}
          <span style={{ color: def.color }} className="w-4 text-center text-sm shrink-0">{def.icon}</span>
          <span style={{ color: def.color }} className="font-semibold">{def.label}</span>

          {/* Params inline */}
          <div className="flex items-center gap-1 flex-wrap flex-1 min-w-0">
            {block.params.map(param => (
              <div key={param.id} className="flex items-center gap-1">
                {block.params.length > 1 && (
                  <span className="text-[10px] opacity-40">{param.name}:</span>
                )}
                {param.name === 'op' ? (
                  <select
                    className="bg-black/30 border border-white/10 rounded px-1 text-[10px] text-surface-100 outline-none"
                    value={String(param.value ?? param.defaultValue ?? '==')}
                    onChange={e => handleParamChange(param.id, e.target.value)}
                  >
                    {['==', '!=', '<', '<=', '>', '>='].map(op => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                ) : param.type === 'boolean' ? (
                  <select
                    className="bg-black/30 border border-white/10 rounded px-1 text-[10px] text-surface-100 outline-none"
                    value={String(param.value ?? param.defaultValue ?? 'true')}
                    onChange={e => handleParamChange(param.id, e.target.value)}
                  >
                    <option value="true">wahr</option>
                    <option value="false">falsch</option>
                  </select>
                ) : (
                  <input
                    className="bg-black/30 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-surface-100 outline-none focus:border-white/30 min-w-0"
                    style={{ width: Math.max(36, String(param.value ?? param.defaultValue ?? '').length * 7 + 16) }}
                    value={String(param.value ?? param.defaultValue ?? '')}
                    onChange={e => handleParamChange(param.id, e.target.value)}
                    onClick={e => e.stopPropagation()}
                    spellCheck={false}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Delete */}
          <button
            className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto text-white/30 hover:text-accent-rose text-xs w-4 text-center shrink-0"
            onClick={onDelete}
            title="Block löschen"
          >
            ✕
          </button>
        </div>

        {/* Children (if block / loop) */}
        {isContainer && !collapsed && (
          <div className="ml-4 mb-1 mr-1">
            {/* DANN / children */}
            {def.hasChildren && (
              <div className="mb-1">
                {def.hasElse && (
                  <div className="text-[9px] uppercase tracking-wider opacity-40 px-1 mb-0.5" style={{ color: def.color }}>dann</div>
                )}
                <div
                  className={`min-h-6 rounded border transition-colors ${
                    dropzone === 'children'
                      ? 'border-white/30 bg-white/5'
                      : 'border-dashed border-white/10'
                  }`}
                  onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDropzone('children') }}
                  onDragLeave={() => setDropzone(null)}
                  onDrop={e => handleDropOnChildren(e, 'children')}
                >
                  {(block.children ?? []).length === 0 ? (
                    <div className="text-[10px] opacity-30 text-center py-1">Blöcke hier ablegen</div>
                  ) : (
                    <div className="py-0.5 space-y-0.5">
                      {(block.children ?? []).map(child => (
                        <BlockView
                          key={child.id}
                          block={child}
                          depth={0}
                          onDelete={() => handleDeleteChild(child.id, 'children')}
                          onUpdate={(u) => handleUpdateChild(u, 'children')}
                          scriptId={scriptId}
                          objectId={objectId}
                          allBlocks={block.children ?? []}
                          onBlocksChange={(blocks) => onUpdate({ ...block, children: blocks })}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SONST / elseChildren */}
            {def.hasElse && (
              <div className="mb-1">
                <div className="text-[9px] uppercase tracking-wider opacity-40 px-1 mb-0.5" style={{ color: def.color }}>sonst</div>
                <div
                  className={`min-h-6 rounded border transition-colors ${
                    dropzone === 'else'
                      ? 'border-white/30 bg-white/5'
                      : 'border-dashed border-white/10'
                  }`}
                  onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDropzone('else') }}
                  onDragLeave={() => setDropzone(null)}
                  onDrop={e => handleDropOnChildren(e, 'else')}
                >
                  {(block.elseChildren ?? []).length === 0 ? (
                    <div className="text-[10px] opacity-30 text-center py-1">Blöcke hier ablegen</div>
                  ) : (
                    <div className="py-0.5 space-y-0.5">
                      {(block.elseChildren ?? []).map(child => (
                        <BlockView
                          key={child.id}
                          block={child}
                          depth={0}
                          onDelete={() => handleDeleteChild(child.id, 'else')}
                          onUpdate={(u) => handleUpdateChild(u, 'else')}
                          scriptId={scriptId}
                          objectId={objectId}
                          allBlocks={block.elseChildren ?? []}
                          onBlocksChange={(blocks) => onUpdate({ ...block, elseChildren: blocks })}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Connector line to next block */}
      <div className="w-0.5 h-1 mx-auto" style={{ background: def.borderColor, opacity: 0.3 }} />
    </div>
  )
}
