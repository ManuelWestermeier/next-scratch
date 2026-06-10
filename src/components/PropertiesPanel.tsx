import { useMemo } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { Scene, SceneObject } from '@/types'
import { Button, Input, Label, Panel, SectionTitle, Select } from '@/components/ui'
import { clamp } from '@/lib/math'

const Field = ({ label, value, onChange }: { label: string; value: string | number; onChange: (value: string) => void }) => (
  <label className="space-y-1">
    <Label>{label}</Label>
    <Input value={value} onChange={(e) => onChange(e.target.value)} />
  </label>
)

const applyToObjects = (scene: Scene, patch: Partial<SceneObject>) => {
  const store = useAppStore.getState()
  scene.selectedObjectIds.forEach((id) => store.updateObject(scene.id, id, patch))
}

export const PropertiesPanel = ({ scene }: { scene: Scene }) => {
  const updateScene = useAppStore((s) => s.updateScene)
  const selectObjects = useAppStore((s) => s.selectObjects)
  const snapshotProject = useAppStore((s) => s.snapshotProject)
  const restoreSnapshot = useAppStore((s) => s.restoreSnapshot)
  const activeProject = useAppStore((s) => s.projects.find((p) => p.id === s.activeProjectId) ?? null)
  const selectedObject = useMemo(() => scene.objects.find((object) => scene.selectedObjectIds.includes(object.id)) ?? null, [scene])
  const isMulti = scene.selectedObjectIds.length > 1

  if (selectedObject) {
    return (
      <Panel className="h-full">
        <SectionTitle title="Eigenschaften" />
        <div className="max-h-[calc(100vh-10rem)] overflow-auto p-4 space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-100">{isMulti ? `${scene.selectedObjectIds.length} Objekte` : selectedObject.name}</div>
                <div className="text-xs text-slate-500">{selectedObject.type}</div>
              </div>
              <Button variant="ghost" onClick={() => selectObjects(scene.id, [])}>Auswahl löschen</Button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Name" value={selectedObject.name} onChange={(value) => applyToObjects(scene, { name: value })} />
              <Field label="X" value={selectedObject.x} onChange={(value) => applyToObjects(scene, { x: Number(value) })} />
              <Field label="Y" value={selectedObject.y} onChange={(value) => applyToObjects(scene, { y: Number(value) })} />
              <Field label="W" value={selectedObject.w} onChange={(value) => applyToObjects(scene, { w: Math.max(1, Number(value)) })} />
              <Field label="H" value={selectedObject.h} onChange={(value) => applyToObjects(scene, { h: Math.max(1, Number(value)) })} />
              <Field label="Rotation" value={selectedObject.r} onChange={(value) => applyToObjects(scene, { r: Number(value) })} />
              <Field label="Layer" value={selectedObject.layer} onChange={(value) => applyToObjects(scene, { layer: Math.round(Number(value)) })} />
              <Field label="Sichtbar" value={selectedObject.visible ? '1' : '0'} onChange={(value) => applyToObjects(scene, { visible: value !== '0' })} />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
            <div className="mb-3 text-sm font-semibold text-slate-100">Objekttyp</div>
            {selectedObject.type === 'shape' && (
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1">
                  <Label>Form</Label>
                  <Select value={selectedObject.shapeKind ?? 'rect'} onChange={(e) => applyToObjects(scene, { shapeKind: e.target.value as SceneObject['shapeKind'] })}>
                    <option value="rect">Rechteck</option>
                    <option value="circle">Kreis</option>
                    <option value="triangle">Dreieck</option>
                  </Select>
                </label>
                <Field label="Farbe" value={selectedObject.fill ?? '#6366f1'} onChange={(value) => applyToObjects(scene, { fill: value })} />
              </div>
            )}
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <Field label="Asset-ID" value={selectedObject.assetId ?? ''} onChange={(value) => applyToObjects(scene, { assetId: value || undefined })} />
              <Field label="Opacity" value={selectedObject.opacity ?? 1} onChange={(value) => applyToObjects(scene, { opacity: clamp(Number(value), 0, 1) })} />
            </div>
          </div>
        </div>
      </Panel>
    )
  }

  return (
    <Panel className="h-full">
      <SectionTitle title="Eigenschaften" />
      <div className="max-h-[calc(100vh-10rem)] overflow-auto p-4 space-y-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
          <div className="mb-3 text-sm font-semibold text-slate-100">Szene</div>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Name" value={scene.name} onChange={(value) => updateScene(scene.id, { name: value })} />
            <Field label="Hintergrund" value={scene.background} onChange={(value) => updateScene(scene.id, { background: value })} />
            <Field label="Grid" value={scene.gridSize} onChange={(value) => updateScene(scene.id, { gridSize: Math.max(1, Number(value)) })} />
            <Field label="Viewport" value={`${scene.width} × ${scene.height}`} onChange={() => void 0} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-100">Projekt</div>
            {activeProject && <Button variant="ghost" onClick={() => snapshotProject(activeProject.id, 'Manueller Snapshot')}>Snapshot</Button>}
          </div>
          <div className="text-sm text-slate-400">
            {activeProject?.assets.length ?? 0} Assets · {activeProject?.history.length ?? 0} Snapshots
          </div>
          <div className="mt-3 max-h-52 space-y-2 overflow-auto">
            {(activeProject?.history ?? []).map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3">
                <div className="text-sm font-medium text-slate-100">{item.label}</div>
                <div className="text-xs text-slate-500">{new Date(item.ts).toLocaleString()}</div>
                <Button variant="ghost" className="mt-2" onClick={() => activeProject && restoreSnapshot(activeProject.id, item.id)}>Wiederherstellen</Button>
              </div>
            ))}
            {!activeProject?.history.length && <div className="text-xs text-slate-500">Keine Historie vorhanden.</div>}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
          <div className="mb-3 text-sm font-semibold text-slate-100">Hinweis</div>
          <div className="text-sm text-slate-400">
            Wähle ein Objekt, um es direkt zu bearbeiten. Blöcke und Skripte werden links verwaltet.
          </div>
        </div>
      </div>
    </Panel>
  )
}
