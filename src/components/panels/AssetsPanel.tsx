import { useRef, useState } from 'react'
import { useProjectStore } from '../../store/projectStore'
import { v4 as uuidv4 } from 'uuid'
import type { Asset } from '../../types'

export function AssetsPanel() {
  const { getAssets, addAsset, deleteAsset, updateObject, editor, getActiveScene } = useProjectStore()
  const assets = getAssets()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [draggingAsset, setDraggingAsset] = useState<string | null>(null)

  const handleFiles = (files: FileList | null) => {
    if (!files) return
    for (const file of Array.from(files)) {
      const isImage = file.type.startsWith('image/')
      const isAudio = file.type.startsWith('audio/')
      if (!isImage && !isAudio) continue

      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        const asset: Asset = {
          id: uuidv4(),
          name: file.name.replace(/\.[^.]+$/, ''),
          type: isImage ? 'image' : 'audio',
          dataUrl,
          size: file.size,
          mimeType: file.type,
        }

        if (isImage) {
          const img = new Image()
          img.onload = () => {
            asset.width = img.naturalWidth
            asset.height = img.naturalHeight
            addAsset(asset)
          }
          img.src = dataUrl
        } else {
          addAsset(asset)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  const images = assets.filter(a => a.type === 'image')
  const audios = assets.filter(a => a.type === 'audio')

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Upload area */}
      <div
        className="m-2 border-2 border-dashed border-surface-700 rounded-lg p-3 text-center cursor-pointer hover:border-brand-600 hover:bg-brand-600/5 transition-colors"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
      >
        <div className="text-2xl mb-1 opacity-40">⬆</div>
        <div className="text-xs text-surface-500">Dateien hier ablegen</div>
        <div className="text-[10px] text-surface-600 mt-0.5">Bilder & Audio</div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,audio/*"
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
      </div>

      {/* Asset list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-3">
        {images.length > 0 && (
          <div>
            <div className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-1.5">
              Bilder ({images.length})
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {images.map(asset => (
                <AssetTile
                  key={asset.id}
                  asset={asset}
                  onDelete={() => deleteAsset(asset.id)}
                />
              ))}
            </div>
          </div>
        )}

        {audios.length > 0 && (
          <div>
            <div className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-1.5">
              Audio ({audios.length})
            </div>
            <div className="space-y-1">
              {audios.map(asset => (
                <div
                  key={asset.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-surface-800 border border-surface-700 group"
                >
                  <span className="text-sm">🔊</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-surface-200 truncate">{asset.name}</div>
                    <div className="text-[10px] text-surface-600">{formatSize(asset.size)}</div>
                  </div>
                  <button
                    className="opacity-0 group-hover:opacity-100 text-surface-500 hover:text-accent-rose text-xs"
                    onClick={() => deleteAsset(asset.id)}
                  >✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {assets.length === 0 && (
          <div className="text-center text-xs text-surface-600 py-4">
            Noch keine Assets — lade Bilder oder Audiodateien hoch.
          </div>
        )}
      </div>
    </div>
  )
}

function AssetTile({ asset, onDelete }: { asset: Asset; onDelete: () => void }) {
  return (
    <div
      className="relative rounded-md overflow-hidden bg-surface-800 border border-surface-700 aspect-square group cursor-grab"
      draggable
      onDragStart={e => {
        e.dataTransfer.setData('asset-id', asset.id)
        e.dataTransfer.setData('object-type', 'image')
      }}
    >
      <img
        src={asset.dataUrl}
        alt={asset.name}
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
        <div className="text-[9px] text-white font-medium px-1 text-center truncate w-full px-2">{asset.name}</div>
        <button
          className="text-white/70 hover:text-accent-rose text-xs"
          onClick={e => { e.stopPropagation(); onDelete() }}
        >✕ löschen</button>
      </div>
    </div>
  )
}
