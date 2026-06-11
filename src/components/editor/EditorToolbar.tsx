import { useRef } from 'react'
import { useProjectStore } from '../../store/projectStore'
import { GameLoop } from '../../engine/runtime/gameLoop'
import type { RuntimeState } from '../../types'

let gameLoopInstance: GameLoop | null = null

export function EditorToolbar() {
  const { editor, getActiveProject, getActiveScene, setPlaying, closeProject,
    toggleGrid, toggleGridSnap, setCanvasTransform, saveSnapshot, exportProject } = useProjectStore()
  const runtimeRef = useRef<RuntimeState | null>(null)

  const project = getActiveProject()
  const scene = getActiveScene()

  const handlePlay = () => {
    if (!scene) return
    setPlaying(true)
    gameLoopInstance = new GameLoop((state) => {
      runtimeRef.current = state
      // Trigger re-render by dispatching custom event
      window.dispatchEvent(new CustomEvent('runtime-update', { detail: state }))
    })
    gameLoopInstance.start(scene)
  }

  const handleStop = () => {
    gameLoopInstance?.stop()
    gameLoopInstance = null
    runtimeRef.current = null
    setPlaying(false)
    window.dispatchEvent(new CustomEvent('runtime-update', { detail: null }))
  }

  const handleResetZoom = () => {
    setCanvasTransform({ x: 0, y: 0, scale: 1 })
  }

  const handleExport = async () => {
    if (!project) return
    const blob = await exportProject(project.id)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${project.name}.zip`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-surface-900 border-b border-surface-800 select-none">
      {/* Logo / back */}
      <button
        onClick={closeProject}
        className="flex items-center gap-1.5 text-surface-400 hover:text-surface-200 transition-colors mr-2"
      >
        <span className="text-sm">←</span>
        <span className="text-xs font-medium">Projekte</span>
      </button>

      <div className="w-px h-5 bg-surface-700" />

      {/* Project name */}
      <span className="text-sm font-semibold text-surface-200 truncate max-w-36">{project?.name}</span>

      {/* Dirty indicator */}
      {editor.isDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Ungespeicherte Änderungen" />}

      <div className="flex-1" />

      {/* Tools */}
      <div className="flex items-center gap-1">
        <ToolBtn
          active={editor.showGrid}
          onClick={toggleGrid}
          title="Gitter ein/aus"
          label="⊞"
        />
        <ToolBtn
          active={editor.gridSnap}
          onClick={toggleGridSnap}
          title="Gitter-Snap"
          label="⊠"
        />
        <ToolBtn
          onClick={handleResetZoom}
          title="Zoom zurücksetzen"
          label={`${Math.round(editor.canvasTransform.scale * 100)}%`}
          labelClass="text-xs font-mono w-9"
        />
      </div>

      <div className="w-px h-5 bg-surface-700" />

      {/* Snapshot */}
      <button
        className="btn-ghost text-xs"
        onClick={() => saveSnapshot('Manueller Snapshot')}
        title="Snapshot speichern"
      >
        💾 Speichern
      </button>

      {/* Export */}
      <button
        className="btn-ghost text-xs"
        onClick={handleExport}
        title="Projekt exportieren"
      >
        ⬆ Export
      </button>

      <div className="w-px h-5 bg-surface-700" />

      {/* Play/Stop */}
      {editor.isPlaying ? (
        <button
          className="btn btn-danger text-xs px-4"
          onClick={handleStop}
        >
          ⏹ Stopp
        </button>
      ) : (
        <button
          className="btn-primary text-xs px-4"
          onClick={handlePlay}
        >
          ▶ Ausführen
        </button>
      )}
    </div>
  )
}

function ToolBtn({ active, onClick, title, label, labelClass }: {
  active?: boolean
  onClick: () => void
  title?: string
  label: string
  labelClass?: string
}) {
  return (
    <button
      className={`w-8 h-7 rounded flex items-center justify-center text-sm transition-colors ${labelClass ?? ''} ${active ? 'bg-brand-600/30 text-brand-400' : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800'}`}
      onClick={onClick}
      title={title}
    >
      {label}
    </button>
  )
}
