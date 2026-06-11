import { useState } from 'react'
import { useProjectStore } from '../../store/projectStore'
import { formatTimestamp } from '../../utils/time'

export function HistoryPanel() {
  const { getHistory, restoreSnapshot, saveSnapshot } = useProjectStore()
  const history = getHistory()
  const [open, setOpen] = useState(false)

  return (
    <div className="border-t border-surface-800">
      <button
        className="panel-header w-full justify-between hover:text-surface-200 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <span>Verlauf ({history.length})</span>
        <span className="text-surface-600 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="p-2 space-y-1 max-h-52 overflow-y-auto">
          <button
            className="w-full text-left px-2 py-1.5 rounded text-xs text-brand-400 hover:bg-surface-800 border border-dashed border-surface-700 transition-colors"
            onClick={() => saveSnapshot('Manueller Snapshot')}
          >
            + Jetzt Snapshot speichern
          </button>
          {history.length === 0 ? (
            <div className="text-xs text-surface-600 text-center py-2">Noch kein Verlauf</div>
          ) : (
            history.map((snap, i) => (
              <div
                key={snap.id}
                className="group flex items-start gap-2 px-2 py-1.5 rounded hover:bg-surface-800 transition-colors cursor-pointer"
                onClick={() => {
                  if (confirm(`Stand wiederherstellen: "${snap.label}"?`)) {
                    restoreSnapshot(snap.id)
                  }
                }}
              >
                <div className="mt-0.5 text-xs text-surface-600">{i === 0 ? '●' : '○'}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-surface-300 truncate">{snap.label}</div>
                  <div className="text-[10px] text-surface-600">{formatTimestamp(snap.timestamp)}</div>
                  <div className="text-[10px] text-surface-700">{snap.scenes.length} Szene{snap.scenes.length !== 1 ? 'n' : ''}</div>
                </div>
                <button
                  className="opacity-0 group-hover:opacity-100 text-[10px] text-brand-400 hover:text-brand-300 shrink-0 mt-1"
                  onClick={e => { e.stopPropagation(); if (confirm('Wiederherstellen?')) restoreSnapshot(snap.id) }}
                >
                  ↩
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
