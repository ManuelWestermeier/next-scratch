import { useEffect, useRef } from 'react'
import { useProjectStore } from '../../store/projectStore'
import { EditorToolbar } from './EditorToolbar'
import { ScenePanel } from '../panels/ScenePanel'
import { PropertiesPanel } from '../panels/PropertiesPanel'
import { CanvasArea } from './CanvasArea'
import { AssetsPanel } from '../panels/AssetsPanel'
import { HistoryPanel } from '../panels/HistoryPanel'

export function EditorView() {
  const { editor, getActiveProject, saveSnapshot, setDirty } = useProjectStore()
  const snapshotTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoSaveRef = useRef(false)

  useEffect(() => {
    if (!editor.isDirty) return
    if (autoSaveRef.current) return
    autoSaveRef.current = true

    snapshotTimer.current = setTimeout(() => {
      saveSnapshot('Auto-Snapshot')
      setDirty(false)
      autoSaveRef.current = false
    }, 30000)

    return () => {
      if (snapshotTimer.current) clearTimeout(snapshotTimer.current)
      autoSaveRef.current = false
    }
  }, [editor.isDirty, saveSnapshot, setDirty])

  const project = getActiveProject()
  if (!project) return null

  return (
    <div className="flex flex-col h-full bg-surface-950">
      <EditorToolbar />
      <div className="flex flex-1 overflow-hidden">
        <div className="w-72 flex-shrink-0 flex flex-col border-r border-surface-800 bg-surface-900">
          <div className="flex border-b border-surface-800">
            {(['scene', 'assets'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => useProjectStore.getState().setActiveTab(tab)}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  editor.activeTab === tab
                    ? 'text-brand-400 border-b-2 border-brand-500'
                    : 'text-surface-500 hover:text-surface-300'
                }`}
              >
                {tab === 'scene' ? 'Szene' : 'Assets'}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-hidden">
            {editor.activeTab === 'assets' ? <AssetsPanel /> : <ScenePanel />}
          </div>
        </div>

        <div className="flex-1 overflow-hidden relative">
          <CanvasArea />
        </div>

        <div className="w-60 flex-shrink-0 border-l border-surface-800 bg-surface-900 overflow-y-auto">
          <PropertiesPanel />
          <HistoryPanel />
        </div>
      </div>
    </div>
  )
}
