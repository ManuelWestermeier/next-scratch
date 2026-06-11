import type { Scene, SceneObject, Asset, RuntimeState } from '../../types'

export class CanvasRenderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private imageCache: Map<string, HTMLImageElement> = new Map()

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
  }

  resize(w: number, h: number) {
    this.canvas.width = w
    this.canvas.height = h
  }

  clear(color = '#1e293b') {
    const { ctx } = this
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.fillStyle = color
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    ctx.restore()
  }

  renderScene(
    scene: Scene,
    assets: Asset[],
    runtimeState: RuntimeState | null,
    selectedIds: string[],
    transform: { x: number; y: number; scale: number },
    showGrid: boolean,
    gridSize: number
  ) {
    const { ctx } = this

    // Apply canvas transform
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    // Draw scene background area
    const sx = (this.canvas.width - scene.width * transform.scale) / 2 + transform.x
    const sy = (this.canvas.height - scene.height * transform.scale) / 2 + transform.y

    ctx.translate(sx, sy)
    ctx.scale(transform.scale, transform.scale)

    // Scene background
    ctx.fillStyle = scene.backgroundColor
    ctx.fillRect(0, 0, scene.width, scene.height)

    // Grid
    if (showGrid) {
      this.drawGrid(scene.width, scene.height, gridSize)
    }

    // Clip to scene bounds
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, 0, scene.width, scene.height)
    ctx.clip()

    // Sort objects by layer
    const sorted = [...scene.objects].sort((a, b) => a.layer - b.layer)

    for (const obj of sorted) {
      const rt = runtimeState?.objectStates[obj.id]
      const x = rt?.x ?? obj.x
      const y = rt?.y ?? obj.y
      const r = rt?.r ?? obj.r
      const visible = rt?.visible ?? obj.visible
      const opacity = rt?.opacity ?? obj.opacity

      if (!visible) continue

      ctx.save()
      ctx.globalAlpha = opacity
      ctx.translate(x + obj.w / 2, y + obj.h / 2)
      ctx.rotate((r * Math.PI) / 180)
      ctx.translate(-obj.w / 2, -obj.h / 2)

      this.renderObject(obj, assets)

      ctx.restore()

      // Selection indicator
      if (selectedIds.includes(obj.id)) {
        ctx.save()
        ctx.translate(x + obj.w / 2, y + obj.h / 2)
        ctx.rotate((r * Math.PI) / 180)
        ctx.translate(-obj.w / 2, -obj.h / 2)
        this.drawSelection(obj.w, obj.h)
        ctx.restore()
      }
    }

    ctx.restore() // restore clip
    ctx.restore() // restore transform

    // Scene border
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.translate(sx, sy)
    ctx.scale(transform.scale, transform.scale)
    ctx.strokeStyle = 'rgba(99,102,241,0.4)'
    ctx.lineWidth = 1 / transform.scale
    ctx.strokeRect(0, 0, scene.width, scene.height)
    ctx.restore()
  }

  private drawGrid(w: number, h: number, size: number) {
    const { ctx } = this
    ctx.save()
    ctx.strokeStyle = 'rgba(148,163,184,0.08)'
    ctx.lineWidth = 0.5
    for (let x = 0; x <= w; x += size) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
      ctx.stroke()
    }
    for (let y = 0; y <= h; y += size) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
    }
    ctx.restore()
  }

  private renderObject(obj: SceneObject, assets: Asset[]) {
    const { ctx } = this

    if (obj.kind === 'shape') {
      ctx.fillStyle = obj.fill
      ctx.strokeStyle = obj.stroke
      ctx.lineWidth = obj.strokeWidth

      switch (obj.shapeType) {
        case 'rect': {
          const r = obj.cornerRadius ?? 0
          if (r > 0) {
            ctx.beginPath()
            ctx.roundRect(0, 0, obj.w, obj.h, r)
          } else {
            ctx.beginPath()
            ctx.rect(0, 0, obj.w, obj.h)
          }
          ctx.fill()
          if (obj.strokeWidth > 0) ctx.stroke()
          break
        }
        case 'ellipse': {
          ctx.beginPath()
          ctx.ellipse(obj.w / 2, obj.h / 2, obj.w / 2, obj.h / 2, 0, 0, Math.PI * 2)
          ctx.fill()
          if (obj.strokeWidth > 0) ctx.stroke()
          break
        }
        case 'triangle': {
          ctx.beginPath()
          ctx.moveTo(obj.w / 2, 0)
          ctx.lineTo(obj.w, obj.h)
          ctx.lineTo(0, obj.h)
          ctx.closePath()
          ctx.fill()
          if (obj.strokeWidth > 0) ctx.stroke()
          break
        }
        case 'star': {
          this.drawStar(obj.w / 2, obj.h / 2, 5, Math.min(obj.w, obj.h) / 2, Math.min(obj.w, obj.h) / 4)
          ctx.fill()
          if (obj.strokeWidth > 0) ctx.stroke()
          break
        }
      }
    } else if (obj.kind === 'image') {
      const asset = assets.find(a => a.id === obj.assetId)
      if (!asset) {
        // Placeholder
        ctx.fillStyle = 'rgba(99,102,241,0.2)'
        ctx.fillRect(0, 0, obj.w, obj.h)
        ctx.fillStyle = '#6366f1'
        ctx.font = '12px Inter'
        ctx.textAlign = 'center'
        ctx.fillText('Bild', obj.w / 2, obj.h / 2 + 4)
        return
      }

      let img = this.imageCache.get(asset.id)
      if (!img) {
        img = new Image()
        img.src = asset.dataUrl
        img.onload = () => this.imageCache.set(asset.id, img!)
        this.imageCache.set(asset.id, img)
      }

      if (img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, 0, 0, obj.w, obj.h)
      } else {
        ctx.fillStyle = 'rgba(99,102,241,0.2)'
        ctx.fillRect(0, 0, obj.w, obj.h)
      }
    } else if (obj.kind === 'audio') {
      // Visual representation for audio objects
      ctx.fillStyle = 'rgba(20,184,166,0.15)'
      ctx.strokeStyle = '#14b8a6'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.roundRect(0, 0, obj.w, obj.h, 8)
      ctx.fill()
      ctx.stroke()

      // Speaker icon
      ctx.fillStyle = '#14b8a6'
      ctx.font = `${Math.min(obj.w, obj.h) * 0.5}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('🔊', obj.w / 2, obj.h / 2)
    }
  }

  private drawStar(cx: number, cy: number, spikes: number, outerR: number, innerR: number) {
    const { ctx } = this
    let rot = (Math.PI / 2) * 3
    const step = Math.PI / spikes
    ctx.beginPath()
    ctx.moveTo(cx, cy - outerR)
    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR)
      rot += step
      ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR)
      rot += step
    }
    ctx.lineTo(cx, cy - outerR)
    ctx.closePath()
  }

  private drawSelection(w: number, h: number) {
    const { ctx } = this
    const pad = 3
    ctx.strokeStyle = '#6366f1'
    ctx.lineWidth = 1.5
    ctx.setLineDash([4, 3])
    ctx.strokeRect(-pad, -pad, w + pad * 2, h + pad * 2)
    ctx.setLineDash([])

    // Corner handles
    const hSize = 6
    ctx.fillStyle = '#fff'
    ctx.strokeStyle = '#6366f1'
    ctx.lineWidth = 1.5

    const corners = [
      [-pad, -pad],
      [w + pad - hSize, -pad],
      [-pad, h + pad - hSize],
      [w + pad - hSize, h + pad - hSize],
    ]

    for (const [cx, cy] of corners) {
      ctx.beginPath()
      ctx.rect(cx, cy, hSize, hSize)
      ctx.fill()
      ctx.stroke()
    }
  }

  // Hit test: returns object id at canvas point
  hitTest(
    scene: Scene,
    canvasX: number,
    canvasY: number,
    transform: { x: number; y: number; scale: number }
  ): string | null {
    // Convert canvas coords to scene coords
    const sx = (this.canvas.width - scene.width * transform.scale) / 2 + transform.x
    const sy = (this.canvas.height - scene.height * transform.scale) / 2 + transform.y

    const sceneX = (canvasX - sx) / transform.scale
    const sceneY = (canvasY - sy) / transform.scale

    // Test in reverse layer order (topmost first)
    const sorted = [...scene.objects].sort((a, b) => b.layer - a.layer)
    for (const obj of sorted) {
      if (!obj.visible) continue
      if (sceneX >= obj.x && sceneX <= obj.x + obj.w &&
          sceneY >= obj.y && sceneY <= obj.y + obj.h) {
        return obj.id
      }
    }
    return null
  }

  canvasToScene(
    canvasX: number, canvasY: number,
    scene: Scene,
    transform: { x: number; y: number; scale: number }
  ): { x: number; y: number } {
    const sx = (this.canvas.width - scene.width * transform.scale) / 2 + transform.x
    const sy = (this.canvas.height - scene.height * transform.scale) / 2 + transform.y
    return {
      x: (canvasX - sx) / transform.scale,
      y: (canvasY - sy) / transform.scale,
    }
  }
}
