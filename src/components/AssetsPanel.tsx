import { useRef } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { Asset } from '@/types'
import { uid } from '@/lib/id'
import { Button, Panel, SectionTitle } from '@/components/ui'
import { Upload, Trash2 } from 'lucide-react'

const readFiles = (files: FileList | null) =>
  Promise.all(Array.from(files ?? []).map((file) => new Promise<Asset>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Fehler beim Lesen'))
    reader.onload = () => resolve({
      id: uid('asset'),
      name: file.name,
      type: file.type.startsWith('audio/') ? 'audio' : 'image',
      mimeType: file.type || 'application/octet-stream',
      dataUrl: String(reader.result),
      size: file.size,
      createdAt: Date.now(),
    })
    reader.readAsDataURL(file)
  })))

export const AssetsPanel = ({ projectId }: { projectId: string }) => {
  const project = useAppStore((s) => s.projects.find((item) => item.id === projectId) ?? null)
  const addAsset = useAppStore((s) => s.addAsset)
  const removeAsset = useAppStore((s) => s.removeAsset)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const importFiles = async (files: FileList | null) => {
    if (!files) return
    const assets = await readFiles(files)
    assets.forEach((asset) => addAsset(projectId, asset))
  }

  return (
    <Panel className="h-full">
      <SectionTitle title="Assets" action={<Button variant="ghost" onClick={() => inputRef.current?.click()}><Upload size={16} className="mr-2" />Import</Button>} />
      <input ref={inputRef} type="file" multiple accept="image/*,audio/*" className="hidden" onChange={(e) => importFiles(e.target.files)} />
      <div className="max-h-[calc(100vh-10rem)] overflow-auto p-4">
        <div className="space-y-3">
          {project?.assets.map((asset) => (
            <div key={asset.id} className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-xs uppercase text-slate-400">
                {asset.type}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-slate-100">{asset.name}</div>
                <div className="text-xs text-slate-500">{Math.round(asset.size / 1024)} KB</div>
              </div>
              <Button variant="ghost" onClick={() => removeAsset(projectId, asset.id)} className="text-rose-300">
                <Trash2 size={16} />
              </Button>
            </div>
          ))}
          {!project?.assets.length && <div className="rounded-2xl border border-dashed border-slate-800 p-6 text-sm text-slate-500">Noch keine Assets.</div>}
        </div>
      </div>
    </Panel>
  )
}
