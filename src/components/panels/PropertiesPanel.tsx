import { useProjectStore } from '../../store/projectStore'
import type { ShapeObject, ImageObject, AudioObject } from '../../types'

export function PropertiesPanel() {
  const { editor, getActiveScene, updateObject, getAssets } = useProjectStore()
  const scene = getActiveScene()
  const assets = getAssets()
  const selectedId = editor.selectedObjectIds[0]
  const obj = scene?.objects.find(o => o.id === selectedId)

  if (!obj) {
    return (
      <div className="panel-header border-b-0">
        <span>Eigenschaften</span>
      </div>
    )
  }

  const set = (changes: Record<string, unknown>) => updateObject(obj.id, changes as never)

  const imageAssets = assets.filter(a => a.type === 'image')
  const audioAssets = assets.filter(a => a.type === 'audio')

  return (
    <div className="border-b border-surface-800">
      <div className="panel-header">Eigenschaften</div>
      <div className="p-3 space-y-3">

        {/* Name */}
        <Field label="Name">
          <input className="input w-full text-xs" value={obj.name}
            onChange={e => set({ name: e.target.value })} />
        </Field>

        {/* Transform */}
        <Section label="Transform">
          <div className="grid grid-cols-2 gap-1.5">
            <Field label="X">
              <NumberInput value={obj.x} onChange={v => set({ x: v })} />
            </Field>
            <Field label="Y">
              <NumberInput value={obj.y} onChange={v => set({ y: v })} />
            </Field>
            <Field label="B">
              <NumberInput value={obj.w} onChange={v => set({ w: Math.max(1, v) })} min={1} />
            </Field>
            <Field label="H">
              <NumberInput value={obj.h} onChange={v => set({ h: Math.max(1, v) })} min={1} />
            </Field>
            <Field label="Rotation">
              <NumberInput value={obj.r} onChange={v => set({ r: v })} step={1} />
            </Field>
            <Field label="Ebene">
              <NumberInput value={obj.layer} onChange={v => set({ layer: Math.max(0, v) })} min={0} step={1} />
            </Field>
          </div>
        </Section>

        {/* Visibility */}
        <Section label="Darstellung">
          <div className="grid grid-cols-2 gap-1.5">
            <Field label="Sichtbar">
              <input type="checkbox" checked={obj.visible}
                onChange={e => set({ visible: e.target.checked })}
                className="w-3.5 h-3.5 accent-brand-500" />
            </Field>
            <Field label="Gesperrt">
              <input type="checkbox" checked={obj.locked}
                onChange={e => set({ locked: e.target.checked })}
                className="w-3.5 h-3.5 accent-brand-500" />
            </Field>
          </div>
          <Field label="Deckkraft">
            <input type="range" min={0} max={1} step={0.01}
              value={obj.opacity}
              onChange={e => set({ opacity: parseFloat(e.target.value) })}
              className="w-full accent-brand-500 h-1" />
            <span className="text-[10px] text-surface-500 mt-0.5">{Math.round(obj.opacity * 100)}%</span>
          </Field>
        </Section>

        {/* Shape-specific */}
        {obj.kind === 'shape' && (
          <Section label="Form">
            <Field label="Typ">
              <select className="input w-full text-xs"
                value={obj.shapeType}
                onChange={e => set({ shapeType: e.target.value })}>
                <option value="rect">Rechteck</option>
                <option value="ellipse">Ellipse</option>
                <option value="triangle">Dreieck</option>
                <option value="star">Stern</option>
              </select>
            </Field>
            <Field label="Füllung">
              <div className="flex items-center gap-2">
                <input type="color" value={obj.fill}
                  onChange={e => set({ fill: e.target.value })}
                  className="w-7 h-6 rounded border border-surface-600 cursor-pointer bg-transparent" />
                <input className="input flex-1 text-xs font-mono" value={obj.fill}
                  onChange={e => set({ fill: e.target.value })} />
              </div>
            </Field>
            <Field label="Rahmen">
              <div className="flex items-center gap-2">
                <input type="color" value={obj.stroke === 'transparent' ? '#6366f1' : obj.stroke}
                  onChange={e => set({ stroke: e.target.value })}
                  className="w-7 h-6 rounded border border-surface-600 cursor-pointer bg-transparent" />
                <NumberInput value={obj.strokeWidth} onChange={v => set({ strokeWidth: v })} min={0} />
              </div>
            </Field>
            {obj.shapeType === 'rect' && (
              <Field label="Eckenradius">
                <NumberInput value={obj.cornerRadius ?? 0} onChange={v => set({ cornerRadius: v })} min={0} />
              </Field>
            )}
          </Section>
        )}

        {/* Image-specific */}
        {obj.kind === 'image' && (
          <Section label="Bild">
            <Field label="Asset">
              <select className="input w-full text-xs"
                value={obj.assetId}
                onChange={e => set({ assetId: e.target.value })}>
                <option value="">— kein Asset —</option>
                {imageAssets.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </Field>
          </Section>
        )}

        {/* Audio-specific */}
        {obj.kind === 'audio' && (
          <Section label="Audio">
            <Field label="Asset">
              <select className="input w-full text-xs"
                value={obj.assetId}
                onChange={e => set({ assetId: e.target.value })}>
                <option value="">— kein Asset —</option>
                {audioAssets.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Lautstärke">
              <input type="range" min={0} max={1} step={0.01}
                value={obj.volume}
                onChange={e => set({ volume: parseFloat(e.target.value) })}
                className="w-full accent-brand-500 h-1" />
            </Field>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1 text-[10px] text-surface-400 cursor-pointer">
                <input type="checkbox" checked={obj.loop}
                  onChange={e => set({ loop: e.target.checked })}
                  className="accent-brand-500" />
                Loop
              </label>
              <label className="flex items-center gap-1 text-[10px] text-surface-400 cursor-pointer">
                <input type="checkbox" checked={obj.autoplay}
                  onChange={e => set({ autoplay: e.target.checked })}
                  className="accent-brand-500" />
                Autoplay
              </label>
            </div>
          </Section>
        )}

        {/* Object ID (dev info) */}
        <div className="text-[9px] text-surface-700 font-mono break-all">id: {obj.id}</div>
      </div>
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-1.5">{label}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] text-surface-500 mb-0.5">{label}</div>
      {children}
    </div>
  )
}

function NumberInput({ value, onChange, min, max, step = 1 }: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
}) {
  return (
    <input
      type="number"
      className="input w-full text-xs font-mono"
      value={Math.round(value * 100) / 100}
      min={min}
      max={max}
      step={step}
      onChange={e => onChange(parseFloat(e.target.value) || 0)}
    />
  )
}
