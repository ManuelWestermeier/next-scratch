import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChevronDown, ChevronRight, GripVertical, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { blockTemplate, isContainerBlock } from '@/lib/blocks'
import { BlockNode, BlockType, Scene, Script } from '@/types'
import { useAppStore } from '@/store/useAppStore'
import { Button, Chip, Input, Panel, SectionTitle, Select } from '@/components/ui'
import { cn } from '@/components/utils'
import { uid } from '@/lib/id'

const paletteGroups: { title: string; types: BlockType[] }[] = [
  { title: 'Logik', types: ['IF', 'AND', 'OR', 'NOT', 'EQ', 'NEQ', 'GT', 'GTE', 'LT', 'LTE'] },
  { title: 'Variablen', types: ['VAR_CREATE', 'VAR_SET', 'VAR_GET'] },
  { title: 'Schleifen', types: ['REPEAT', 'WHILE', 'FOR'] },
  { title: 'Funktionen', types: ['CALL_FUNCTION', 'RETURN'] },
  { title: 'Mathematik', types: ['ADD', 'SUBTRACT', 'MULTIPLY', 'DIVIDE', 'MODULO', 'RANDOM', 'CLAMP'] },
  { title: 'Bewegung', types: ['GO_FORWARD', 'GO_BACK', 'GO_LEFT', 'GO_RIGHT', 'ROTATE', 'MOVE_TO'] },
]

const updateNested = (blocks: BlockNode[], blockId: string, patch: Partial<BlockNode>): BlockNode[] =>
  blocks.map((block) => {
    if (block.id === blockId) return { ...block, ...patch }
    return {
      ...block,
      children: updateNested(block.children, blockId, patch),
      elseChildren: block.elseChildren ? updateNested(block.elseChildren, blockId, patch) : undefined,
    }
  })

const removeNested = (blocks: BlockNode[], blockId: string): BlockNode[] =>
  blocks
    .map((block) => ({
      ...block,
      children: removeNested(block.children, blockId),
      elseChildren: block.elseChildren ? removeNested(block.elseChildren, blockId) : undefined,
    }))
    .filter((block) => block.id !== blockId)

const flattenBlocks = (blocks: BlockNode[]): string[] => blocks.map((b) => b.id)

const BlockRow = ({ block, onChange, onDelete, onAddChild, onAddElse }: {
  block: BlockNode
  onChange: (patch: Partial<BlockNode>) => void
  onDelete: () => void
  onAddChild: () => void
  onAddElse: () => void
}) => {
  const [open, setOpen] = useState(true)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  const field = (key: string, placeholder?: string) => (
    <Input
      value={String(block.args[key] ?? '')}
      placeholder={placeholder}
      onChange={(e) => onChange({ args: { ...block.args, [key]: e.target.value } })}
    />
  )

  return (
    <div ref={setNodeRef} style={style} className={cn('rounded-2xl border border-slate-800 bg-slate-950/70 p-3', isDragging && 'opacity-60')}>
      <div className="flex items-center gap-2">
        <button {...attributes} {...listeners} className="cursor-grab rounded-lg p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-100">
          <GripVertical size={16} />
        </button>
        <button onClick={() => setOpen((v) => !v)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800">
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-slate-100">{block.label}</div>
          <div className="text-xs text-slate-500">{block.type}</div>
        </div>
        <Button variant="ghost" onClick={onDelete} className="px-2 py-1 text-rose-300 hover:bg-rose-500/10">
          <Trash2 size={14} />
        </Button>
      </div>

      {open && (
        <div className="mt-3 space-y-2">
          <div className="grid gap-2 md:grid-cols-2">
            <label className="space-y-1">
              <div className="text-[11px] uppercase tracking-wider text-slate-500">Label</div>
              <Input value={block.label} onChange={(e) => onChange({ label: e.target.value })} />
            </label>
            <label className="space-y-1">
              <div className="text-[11px] uppercase tracking-wider text-slate-500">Typ</div>
              <Input value={block.type} disabled />
            </label>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            {(['name', 'value', 'condition', 'a', 'b', 'left', 'right', 'op', 'count', 'start', 'end', 'step', 'target', 'degrees', 'distance', 'x', 'y', 'arg0', 'arg1', 'arg2', 'arg3'] as const).map((key) => (
              <label key={key} className="space-y-1">
                <div className="text-[11px] uppercase tracking-wider text-slate-500">{key}</div>
                {key === 'op' ? (
                  <Select value={String(block.args[key] ?? '==')} onChange={(e) => onChange({ args: { ...block.args, [key]: e.target.value } })}>
                    <option value="==">==</option>
                    <option value="!=">!=</option>
                    <option value=">">&gt;</option>
                    <option value=">=">&gt;=</option>
                    <option value="<">&lt;</option>
                    <option value="<=">&lt;=</option>
                  </Select>
                ) : (
                  <Input value={String(block.args[key] ?? '')} placeholder={key} onChange={(e) => onChange({ args: { ...block.args, [key]: e.target.value } })} />
                )}
              </label>
            ))}
          </div>

          {isContainerBlock(block.type) && (
            <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/70 p-2">
              <div className="flex items-center justify-between">
                <Chip>{block.type} children</Chip>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={onAddChild} className="px-2 py-1 text-xs">+ Child</Button>
                  {block.type === 'IF' && <Button variant="ghost" onClick={onAddElse} className="px-2 py-1 text-xs">+ Else</Button>}
                </div>
              </div>
              <div className="text-xs text-slate-500">Unterblöcke werden rekursiv ausgeführt.</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const SortableBlock = ({
  block,
  script,
  scene,
  onChange,
  onDelete,
  onAddChild,
  onAddElse,
  depth = 0,
}: {
  block: BlockNode
  script: Script
  scene: Scene
  onChange: (patch: Partial<BlockNode>) => void
  onDelete: () => void
  onAddChild: () => void
  onAddElse: () => void
  depth?: number
}) => (
  <div className={depth > 0 ? 'pl-4' : ''}>
    <BlockRow block={block} onChange={onChange} onDelete={onDelete} onAddChild={onAddChild} onAddElse={onAddElse} />
    {block.children.length > 0 && (
      <div className="mt-2 space-y-2 border-l border-slate-800 pl-3">
        {block.children.map((child) => (
          <NestedBlock key={child.id} block={child} script={script} scene={scene} parentId={block.id} branch="children" depth={depth + 1} />
        ))}
      </div>
    )}
    {block.elseChildren && block.elseChildren.length > 0 && (
      <div className="mt-2 space-y-2 border-l border-dashed border-slate-700 pl-3">
        {block.elseChildren.map((child) => (
          <NestedBlock key={child.id} block={child} script={script} scene={scene} parentId={block.id} branch="elseChildren" depth={depth + 1} />
        ))}
      </div>
    )}
  </div>
)

const NestedBlock = ({
  block,
  script,
  scene,
  parentId,
  branch,
  depth,
}: {
  block: BlockNode
  script: Script
  scene: Scene
  parentId?: string
  branch?: 'children' | 'elseChildren'
  depth: number
}) => {
  const updateScript = useAppStore((s) => s.updateScript)
  const deleteBlock = useAppStore((s) => s.deleteBlock)
  const addBlock = useAppStore((s) => s.addBlock)

  return (
    <SortableBlock
      block={block}
      script={script}
      scene={scene}
      depth={depth}
      onChange={(patch) => {
        const nextBlocks = updateNested(script.blocks, block.id, patch)
        updateScript(scene.id, script.id, { blocks: nextBlocks })
      }}
      onDelete={() => deleteBlock(scene.id, script.id, block.id)}
      onAddChild={() => addBlock(scene.id, script.id, blockTemplate('VAR_GET'), block.id, 'children')}
      onAddElse={() => addBlock(scene.id, script.id, blockTemplate('VAR_GET'), block.id, 'elseChildren')}
    />
  )
}

export const BlocksPanel = ({ scene }: { scene: Scene }) => {
  const updateScript = useAppStore((s) => s.updateScript)
  const createScript = useAppStore((s) => s.createScript)
  const deleteScript = useAppStore((s) => s.deleteScript)
  const addBlock = useAppStore((s) => s.addBlock)
  const reorderBlocks = useAppStore((s) => s.reorderBlocks)
  const updateBlock = useAppStore((s) => s.updateBlock)
  const [scriptId, setScriptId] = useState(scene.scripts[0]?.id ?? '')

  useEffect(() => {
    setScriptId(scene.scripts[0]?.id ?? '')
  }, [scene.id])

  const script = useMemo(() => scene.scripts.find((item) => item.id === scriptId) ?? scene.scripts[0], [scene, scriptId])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  if (!script) {
    return (
      <Panel className="h-full">
        <SectionTitle title="Block Editor" />
        <div className="p-4">
          <Button onClick={() => createScript(scene.id, 'setup')}>Script erstellen</Button>
        </div>
      </Panel>
    )
  }

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const from = script.blocks.findIndex((b) => b.id === active.id)
    const to = script.blocks.findIndex((b) => b.id === over.id)
    if (from < 0 || to < 0) return
    const ordered = arrayMove(script.blocks, from, to).map((b) => b.id)
    reorderBlocks(scene.id, script.id, ordered)
  }

  return (
    <Panel className="flex h-full min-h-0 flex-col">
      <SectionTitle
        title="Block Editor"
        action={
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => createScript(scene.id, 'function', 'Funktion')}>+ Funktion</Button>
            <Button variant="ghost" onClick={() => createScript(scene.id, 'loop', 'Loop')}>+ Loop</Button>
          </div>
        }
      />

      <div className="border-b border-slate-800 px-4 py-3">
        <Select value={script.id} onChange={(e) => setScriptId(e.target.value)}>
          {scene.scripts.map((item) => (
            <option key={item.id} value={item.id}>{item.name} · {item.kind}</option>
          ))}
        </Select>
        <div className="mt-2 grid gap-2 md:grid-cols-3">
          <Input value={script.name} onChange={(e) => updateScript(scene.id, script.id, { name: e.target.value })} />
          <Input value={script.params.join(', ')} onChange={(e) => updateScript(scene.id, script.id, { params: e.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} placeholder="param1, param2" />
          <Select value={script.returnType} onChange={(e) => updateScript(scene.id, script.id, { returnType: e.target.value as Script['returnType'] })}>
            <option value="void">void</option>
            <option value="number">number</option>
            <option value="string">string</option>
            <option value="boolean">boolean</option>
          </Select>
        </div>
        <div className="mt-2 flex gap-2">
          <Button variant="ghost" onClick={() => deleteScript(scene.id, script.id)} className="text-rose-300">Script löschen</Button>
          <Button variant="ghost" onClick={() => updateScript(scene.id, script.id, { name: `${script.name}*` })}>Umbenennen</Button>
        </div>
      </div>

      <div className="grid gap-3 border-b border-slate-800 px-4 py-3">
        {paletteGroups.map((group) => (
          <div key={group.title} className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{group.title}</div>
            <div className="flex flex-wrap gap-2">
              {group.types.map((type) => {
                const tmpl = blockTemplate(type)
                return (
                  <Button
                    key={type}
                    variant="ghost"
                    onClick={() => addBlock(scene.id, script.id, tmpl)}
                    className="rounded-full border border-slate-800 bg-slate-950/70 px-3 py-1 text-xs"
                  >
                    {tmpl.label}
                  </Button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <SortableContext items={flattenBlocks(script.blocks)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {script.blocks.map((block) => (
                <BlockItem key={block.id} block={block} scene={scene} script={script} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        {script.blocks.length === 0 && <div className="rounded-2xl border border-dashed border-slate-800 p-6 text-sm text-slate-500">Blöcke hinzufügen oder per Liste sortieren.</div>}
      </div>
    </Panel>
  )
}

const BlockItem = ({ block, scene, script }: { block: BlockNode; scene: Scene; script: Script }) => {
  const updateScript = useAppStore((s) => s.updateScript)
  const deleteBlock = useAppStore((s) => s.deleteBlock)
  const addBlock = useAppStore((s) => s.addBlock)

  return (
    <SortableBlock
      block={block}
      scene={scene}
      script={script}
      onChange={(patch) => updateScript(scene.id, script.id, { blocks: updateNested(script.blocks, block.id, patch) })}
      onDelete={() => deleteBlock(scene.id, script.id, block.id)}
      onAddChild={() => addBlock(scene.id, script.id, blockTemplate('VAR_GET'), block.id, 'children')}
      onAddElse={() => addBlock(scene.id, script.id, blockTemplate('VAR_GET'), block.id, 'elseChildren')}
    />
  )
}
