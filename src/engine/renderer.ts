import { Asset, Scene } from '@/types'

type ViewTransform = {
  zoom: number
  panX: number
  panY: number
}

type RenderOptions = {
  selectedIds: string[]
  hoverId?: string | null
  dragBox?: { x1: number; y1: number; x2: number; y2: number } | null
  gridVisible?: boolean
}

const imageCache = new Map<string, HTMLImageElement>()

const getAssetImage = (asset?: Asset) => {
  if (!asset) return null
  const cached = imageCache.get(asset.id)
  if (cached) return cached
  const img = new Image()
  img.src = asset.dataUrl
  imageCache.set(asset.id, img)
  return img
}

const worldToScreen = (x: number, y: number, view: ViewTransform) => ({
  x: x * view.zoom + view.panX,
  y: y * view.zoom + view.panY,
})

const screenToWorld = (x: number, y: number, view: ViewTransform) => ({
  x: (x - view.panX) / view.zoom,
  y: (y - view.panY) / view.zoom,
})

export const renderScene = (
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  assets: Asset[],
  view: ViewTransform,
  options: RenderOptions,
  canvasWidth: number,
  canvasHeight: number,
) => {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight)
  ctx.save()

  ctx.fillStyle = scene.background
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)

  if (options.gridVisible !== false) {
    const grid = scene.gridSize * view.zoom
    if (grid >= 8) {
      ctx.globalAlpha = 0.18
      ctx.strokeStyle = '#94a3b8'
      ctx.lineWidth = 1
      const offsetX = ((view.panX % grid) + grid) % grid
      const offsetY = ((view.panY % grid) + grid) % grid
      for (let x = offsetX; x < canvasWidth; x += grid) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvasHeight)
        ctx.stroke()
      }
      for (let y = offsetY; y < canvasHeight; y += grid) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvasWidth, y)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    }
  }

  const ordered = [...scene.objects].filter((object) => object.visible).sort((a, b) => a.layer - b.layer)

  for (const object of ordered) {
    const x = object.x * view.zoom + view.panX
    const y = object.y * view.zoom + view.panY
    const w = object.w * view.zoom
    const h = object.h * view.zoom
    const r = (object.r * Math.PI) / 180

    ctx.save()
    ctx.translate(x + w / 2, y + h / 2)
    ctx.rotate(r)
    ctx.globalAlpha = object.opacity ?? 1

    if (object.type === 'image') {
      const asset = assets.find((item) => item.id === object.assetId)
      const img = getAssetImage(asset)
      ctx.fillStyle = '#0f172a'
      ctx.fillRect(-w / 2, -h / 2, w, h)
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, -w / 2, -h / 2, w, h)
      } else {
        ctx.fillStyle = '#334155'
        ctx.fillRect(-w / 2, -h / 2, w, h)
      }
    } else if (object.type === 'shape') {
      const fill = object.fill ?? '#6366f1'
      ctx.fillStyle = fill
      if (object.shapeKind === 'circle') {
        ctx.beginPath()
        ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2)
        ctx.fill()
      } else if (object.shapeKind === 'triangle') {
        ctx.beginPath()
        ctx.moveTo(0, -h / 2)
        ctx.lineTo(w / 2, h / 2)
        ctx.lineTo(-w / 2, h / 2)
        ctx.closePath()
        ctx.fill()
      } else {
        ctx.fillRect(-w / 2, -h / 2, w, h)
      }
    } else {
      ctx.fillStyle = '#111827'
      ctx.fillRect(-w / 2, -h / 2, w, h)
      ctx.fillStyle = '#f59e0b'
      ctx.strokeStyle = '#f59e0b'
      ctx.lineWidth = Math.max(1, 2 * view.zoom)
      ctx.beginPath()
      ctx.arc(-w / 4, 0, Math.max(6, 10 * view.zoom), 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(-w / 8, -h / 4)
      ctx.lineTo(w / 4, -h / 3)
      ctx.lineTo(w / 4, h / 3)
      ctx.lineTo(-w / 8, h / 4)
      ctx.closePath()
      ctx.stroke()
    }

    ctx.restore()

    if (options.selectedIds.includes(object.id)) {
      ctx.save()
      ctx.strokeStyle = '#38bdf8'
      ctx.lineWidth = 2
      ctx.setLineDash([6, 4])
      ctx.strokeRect(x, y, w, h)
      ctx.setLineDash([])
      ctx.fillStyle = '#38bdf8'
      ctx.fillRect(x - 4, y - 4, 8, 8)
      ctx.fillRect(x + w - 4, y - 4, 8, 8)
      ctx.fillRect(x - 4, y + h - 4, 8, 8)
      ctx.fillRect(x + w - 4, y + h - 4, 8, 8)
      ctx.restore()
    } else if (options.hoverId === object.id) {
      ctx.save()
      ctx.strokeStyle = 'rgba(250,204,21,0.95)'
      ctx.lineWidth = 1.5
      ctx.setLineDash([4, 4])
      ctx.strokeRect(x, y, w, h)
      ctx.restore()
    }
  }

  if (options.dragBox) {
    const x = Math.min(options.dragBox.x1, options.dragBox.x2)
    const y = Math.min(options.dragBox.y1, options.dragBox.y2)
    const w = Math.abs(options.dragBox.x2 - options.dragBox.x1)
    const h = Math.abs(options.dragBox.y2 - options.dragBox.y1)
    ctx.save()
    ctx.strokeStyle = '#38bdf8'
    ctx.fillStyle = 'rgba(56, 189, 248, 0.12)'
    ctx.lineWidth = 1
    ctx.setLineDash([5, 4])
    ctx.fillRect(x, y, w, h)
    ctx.strokeRect(x, y, w, h)
    ctx.restore()
  }

  ctx.restore()
}

export const hitTestScene = (scene: Scene, view: ViewTransform, screenX: number, screenY: number) => {
  const world = screenToWorld(screenX, screenY, view)
  const ordered = [...scene.objects].filter((object) => object.visible).sort((a, b) => b.layer - a.layer)
  for (const object of ordered) {
    if (world.x >= object.x && world.x <= object.x + object.w && world.y >= object.y && world.y <= object.y + object.h) {
      return object
    }
  }
  return null
}

export const worldFromScreen = screenToWorld
export const screenFromWorld = worldToScreen
