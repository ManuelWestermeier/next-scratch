import { useState, useRef } from 'react'
import { useProjectStore } from '../../store/projectStore'
import type { Project } from '../../types'
import { formatDistanceToNow } from '../../utils/time'

export function ProjectsView() {
  const { projects, createProject, deleteProject, duplicateProject, renameProject, openProject, exportProject, importProject } = useProjectStore()
  const [newName, setNewName] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameVal, setRenameVal] = useState('')
  const [menuId, setMenuId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleCreate = () => {
    if (!newName.trim()) return
    const p = createProject(newName.trim())
    setNewName('')
    setShowCreate(false)
    openProject(p.id)
  }

  const handleRename = (id: string) => {
    if (renameVal.trim()) renameProject(id, renameVal.trim())
    setRenamingId(null)
  }

  const handleExport = async (id: string) => {
    const blob = await exportProject(id)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const proj = projects.find(p => p.id === id)
    a.download = `${proj?.name ?? 'projekt'}.zip`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await importProject(file)
    } catch (err) {
      alert('Import fehlgeschlagen: ' + (err instanceof Error ? err.message : String(err)))
    }
    e.target.value = ''
  }

  return (
    <div className="flex flex-col h-full bg-surface-950">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-surface-800 bg-surface-900">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-violet flex items-center justify-center text-white font-bold text-sm">SF</div>
          <div>
            <h1 className="text-lg font-bold text-surface-50 tracking-tight">ScratchForge</h1>
            <p className="text-xs text-surface-500">Visueller Programmiereditor</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-ghost text-xs"
          >
            <span>⬆</span> Importieren
          </button>
          <input ref={fileInputRef} type="file" accept=".zip" className="hidden" onChange={handleImport} />
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary text-sm"
          >
            <span>+</span> Neues Projekt
          </button>
        </div>
      </header>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={() => setShowCreate(false)}>
          <div className="bg-surface-900 border border-surface-700 rounded-xl p-6 w-80 shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-surface-50 mb-4">Neues Projekt</h2>
            <input
              className="input w-full mb-4"
              placeholder="Projektname..."
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button className="btn-ghost" onClick={() => setShowCreate(false)}>Abbrechen</button>
              <button className="btn-primary" onClick={handleCreate}>Erstellen</button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-6">
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="text-5xl mb-4 opacity-30">🧱</div>
            <p className="text-surface-400 text-sm mb-2">Noch keine Projekte</p>
            <p className="text-surface-600 text-xs">Erstelle dein erstes Projekt, um loszulegen.</p>
            <button className="btn-primary mt-4" onClick={() => setShowCreate(true)}>Jetzt starten</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {projects.sort((a, b) => b.updatedAt - a.updatedAt).map(proj => (
              <ProjectCard
                key={proj.id}
                project={proj}
                menuOpen={menuId === proj.id}
                onMenuToggle={() => setMenuId(menuId === proj.id ? null : proj.id)}
                onOpen={() => { setMenuId(null); openProject(proj.id) }}
                onRename={() => { setMenuId(null); setRenamingId(proj.id); setRenameVal(proj.name) }}
                onDuplicate={() => { setMenuId(null); duplicateProject(proj.id) }}
                onExport={() => { setMenuId(null); handleExport(proj.id) }}
                onDelete={() => { setMenuId(null); if (confirm(`"${proj.name}" wirklich löschen?`)) deleteProject(proj.id) }}
                isRenaming={renamingId === proj.id}
                renameVal={renameVal}
                onRenameChange={setRenameVal}
                onRenameSubmit={() => handleRename(proj.id)}
                onRenameCancel={() => setRenamingId(null)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

interface ProjectCardProps {
  project: Project
  menuOpen: boolean
  onMenuToggle: () => void
  onOpen: () => void
  onRename: () => void
  onDuplicate: () => void
  onExport: () => void
  onDelete: () => void
  isRenaming: boolean
  renameVal: string
  onRenameChange: (v: string) => void
  onRenameSubmit: () => void
  onRenameCancel: () => void
}

function ProjectCard(props: ProjectCardProps) {
  const { project: p } = props
  const sceneCount = p.scenes.length
  const objCount = p.scenes.reduce((sum, s) => sum + s.objects.length, 0)

  return (
    <div className="group relative bg-surface-900 border border-surface-800 rounded-xl overflow-hidden hover:border-surface-700 transition-all duration-150 cursor-pointer"
      onClick={props.onOpen}
    >
      {/* Thumbnail */}
      <div className="h-36 bg-gradient-to-br from-surface-800 to-surface-900 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'linear-gradient(rgba(99,102,241,.15) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.15) 1px,transparent 1px)', backgroundSize: '16px 16px' }} />
        {p.thumbnail ? (
          <img src={p.thumbnail} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="text-4xl opacity-20">🧩</div>
        )}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={e => { e.stopPropagation(); props.onMenuToggle() }}>
          <button className="w-7 h-7 rounded-md bg-surface-800/80 hover:bg-surface-700 flex items-center justify-center text-surface-300 text-sm">⋯</button>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        {props.isRenaming ? (
          <input
            className="input w-full text-sm"
            value={props.renameVal}
            onChange={e => props.onRenameChange(e.target.value)}
            onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') props.onRenameSubmit(); if (e.key === 'Escape') props.onRenameCancel() }}
            onClick={e => e.stopPropagation()}
            autoFocus
          />
        ) : (
          <div className="font-medium text-surface-100 text-sm truncate">{p.name}</div>
        )}
        <div className="flex items-center gap-3 mt-1 text-xs text-surface-500">
          <span>{sceneCount} {sceneCount === 1 ? 'Szene' : 'Szenen'}</span>
          <span>·</span>
          <span>{objCount} Objekte</span>
        </div>
        <div className="text-xs text-surface-600 mt-1">
          {formatDistanceToNow(p.updatedAt)} geändert
        </div>
      </div>

      {/* Dropdown menu */}
      {props.menuOpen && (
        <div
          className="absolute top-10 right-2 w-44 bg-surface-800 border border-surface-700 rounded-lg shadow-xl z-10 py-1 animate-fade-in"
          onClick={e => e.stopPropagation()}
        >
          <MenuItem label="Öffnen" icon="📂" onClick={props.onOpen} />
          <MenuItem label="Umbenennen" icon="✏️" onClick={props.onRename} />
          <MenuItem label="Duplizieren" icon="📋" onClick={props.onDuplicate} />
          <MenuItem label="Exportieren" icon="⬆" onClick={props.onExport} />
          <div className="my-1 border-t border-surface-700" />
          <MenuItem label="Löschen" icon="🗑" onClick={props.onDelete} danger />
        </div>
      )}
    </div>
  )
}

function MenuItem({ label, icon, onClick, danger }: { label: string; icon: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 hover:bg-surface-700 transition-colors ${danger ? 'text-accent-rose' : 'text-surface-200'}`}
      onClick={onClick}
    >
      <span className="text-xs w-4">{icon}</span>
      {label}
    </button>
  )
}
