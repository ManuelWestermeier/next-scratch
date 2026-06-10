import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Minus, Play, Plus, RotateCcw, SquarePlus } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { Asset, Scene, SceneObject } from '@/types'
import { Button, Chip } from '@/components/ui'
import { clamp } from '@/lib/math'
import { hitTestScene, renderScene, worldFromScreen } from '@/engine/renderer'
import { runRuntimeFrame } from '@/engine/runtime'
import { uid } from '@/lib/id'

type Box = { x1: number; y1: number; x2: number; y2: number }
type DragState =
  | { kind: 'move'; lastX: number; lastY: number; ids: string[] }
  | { kind: 'box'; startX: number; startY: number; currentX: number; currentY: number }
  | { kind: 'pan'; startX: number; startY: number; startPanX: number; startPanY: number }
  | null

const createNewObject = (type: SceneObject['type'], scene: Scene): SceneObject => ({
  id: uid('obj'),
  name: `${type === 'shape' ? 'Form' : type === 'image' ? 'Bild' : 'Audio'} ${scene.objects.length + 1}`,
  type,
  x: scene.width / 2 - 60,
  y: scene.height / 2 - 60,
  w: 120,
  h: 120,
  r: 0,
  visible: true,
  layer: scene.objects.reduce((max, item) => Math.max(max, item.layer), 0) + 1,
  shapeKind: 'rect',
  fill: '#6366f1',
  opacity: 1,
})

export const SceneCanvas = ({ scene, projectId }: { scene: Scene; projectId: string }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const boxRef = useRef<HTMLDivElement | null>(null)
  const frameRef = useRef<number | null>(null)
  const lastRef = useRef(0)
  const dragRef = useRef<DragState>(null)
  const [hoverId, setHoverId] = useState<string | null>(null)
  const hoverRef = useRef<string | null>(null)
  const [dragBox, setDragBox] = useState<Box | null>(null)

  const settings = useAppStore((s) => s.settings)
  const replaceScene = useAppStore((s) => s.replaceScene)
  const moveObjects = useAppStore((s) => s.moveObjects)
  const selectObjects = useAppStore((s) => s.selectObjects)
  const updateScene = useAppStore((s) => s.updateScene)
  const createObject = useAppStore((s) => s.createObject)
  const project = useAppStore((s) => s.projects.find((item) => item.id === projectId) ?? null)
  const assets: Asset[] = project?.assets ?? []

  const view = useMemo(() => ({ zoom: settings.zoom, panX: settings.panX, panY: settings.panY }), [settings])

  useEffect(() => {
    hoverRef.current = hoverId
  }, [hoverId])

  useEffect(() => {
    const element = boxRef.current
    if (!element) return
    const observer = new ResizeObserver(() => {
      const rect = element.getBoundingClientRect()
      const canvas = canvasRef.current
      if (!canvas) return
      const ratio = window.devicePixelRatio || 1
      canvas.width = Math.max(1, Math.floor(rect.width * ratio))
      canvas.height = Math.max(1, Math.floor(rect.height * ratio))
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const tick = (time: number) => {
      const elapsed = time - lastRef.current
      if (elapsed >= 1000 / 30) {
        lastRef.current = time
        const state = useAppStore.getState()
        const currentProject = state.projects.find((item) => item.id === state.activeProjectId)
        const currentScene = currentProject?.scenes.find((item) => item.id === currentProject.activeSceneId)
        const canvas = canvasRef.current
        const context = canvas?.getContext('2d')

        if (canvas && context && currentScene && currentProject) {
          if (state.settings.playMode) {
            const result = runRuntimeFrame(currentProject, currentScene, elapsed, true)
            if (result.changed) replaceScene(currentScene.id, result.scene)
          }

          renderScene(
            context,
            currentScene,
            assets,
            { zoom: state.settings.zoom, panX: state.settings.panX, panY: state.settings.panY },
            { selectedIds: currentScene.selectedObjectIds, hoverId: hoverRef.current, dragBox: null, gridVisible: true },
            canvas.width,
            canvas.height,
          )
        }
      }
      frameRef.current = requestAnimationFrame(tick)
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [assets, replaceScene])

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const screenX = event.clientX - rect.left
    const screenY = event.clientY - rect.top
    const hit = hitTestScene(scene, view, screenX, screenY)

    if (event.button === 1) {
      dragRef.current = { kind: 'pan', startX: event.clientX, startY: event.clientY, startPanX: settings.panX, startPanY: settings.panY }
      canvas.setPointerCapture(event.pointerId)
      return
    }

    if (hit) {
      const ids = event.shiftKey
        ? scene.selectedObjectIds.includes(hit.id)
          ? scene.selectedObjectIds.filter((id) => id !== hit.id)
          : [...scene.selectedObjectIds, hit.id]
        : [hit.id]
      selectObjects(scene.id, ids)
      dragRef.current = { kind: 'move', lastX: screenX, lastY: screenY, ids }
      canvas.setPointerCapture(event.pointerId)
      return
    }

    selectObjects(scene.id, [])
    dragRef.current = { kind: 'box', startX: screenX, startY: screenY, currentX: screenX, currentY: screenY }
    setDragBox({ x1: screenX, y1: screenY, x2: screenX, y2: screenY })
    canvas.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const screenX = event.clientX - rect.left
    const screenY = event.clientY - rect.top
    const current = dragRef.current

    if (!current) {
      setHoverId(hitTestScene(scene, view, screenX, screenY)?.id ?? null)
      return
    }

    if (current.kind === 'pan') {
      const dx = event.clientX - current.startX
      const dy = event.clientY - current.startY
      useAppStore.getState().setPan(current.startPanX + dx, current.startPanY + dy)
      return
    }

    if (current.kind === 'move') {
      const deltaX = (screenX - current.lastX) / view.zoom
      const deltaY = (screenY - current.lastY) / view.zoom
      moveObjects(scene.id, current.ids, deltaX, deltaY, settings.snapToGrid)
      dragRef.current = { ...current, lastX: screenX, lastY: screenY }
      return
    }

    if (current.kind === 'box') {
      dragRef.current = { ...current, currentX: screenX, currentY: screenY }
      setDragBox({ x1: current.startX, y1: current.startY, x2: screenX, y2: screenY })
    }
  }

  const onPointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const current = dragRef.current
    dragRef.current = null
    const canvas = canvasRef.current
    if (!canvas || !current) return

    if (current.kind === 'box' && dragBox) {
      const x = Math.min(dragBox.x1, dragBox.x2)
      const y = Math.min(dragBox.y1, dragBox.y2)
      const w = Math.abs(dragBox.x2 - dragBox.x1)
      const h = Math.abs(dragBox.y2 - dragBox.y1)
      const selected = scene.objects
        .filter((object) => {
          const sx = object.x * view.zoom + view.panX
          const sy = object.y * view.zoom + view.panY
          const sw = object.w * view.zoom
          const sh = object.h * view.zoom
          return sx < x + w && sx + sw > x && sy < y + h && sy + sh > y
        })
        .map((object) => object.id)
      selectObjects(scene.id, selected)
    }

    setDragBox(null)
    try {
      canvas.releasePointerCapture(event.pointerId)
    } catch {
      // ignore
    }
  }

  const onWheel = (event: ReactWheelEvent<HTMLCanvasElement>) => {
    event.preventDefault()
    const nextZoom = clamp(settings.zoom - event.deltaY * 0.001, 0.25, 3)
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const mouseX = event.clientX - rect.left
    const mouseY = event.clientY - rect.top
    const before = worldFromScreen(mouseX, mouseY, view)
    const panX = mouseX - before.x * nextZoom
    const panY = mouseY - before.y * nextZoom
    useAppStore.getState().setZoom(nextZoom)
    useAppStore.getState().setPan(panX, panY)
  }

  const resetView = () => {
    useAppStore.getState().setZoom(1)
    useAppStore.getState().setPan(0, 0)
    updateScene(scene.id, { lastUpdatedAt: Date.now() })
  }

  return (
    <div ref={boxRef} className="relative h-full min-h-[520px] overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-soft">
      <canvas
        ref={canvasRef}
        className="h-full w-full touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => setHoverId(null)}
        onWheel={onWheel}
      />

      <div className="pointer-events-none absolute left-4 top-4 flex flex-wrap gap-2">
        <Chip>{scene.name}</Chip>
        <Chip>{settings.playMode ? 'Play' : 'Edit'}</Chip>
        <Chip>{settings.snapToGrid ? 'Snap' : 'Free'}</Chip>
      </div>

      <div className="absolute right-4 top-4 flex flex-wrap gap-2">
        <Button variant="ghost" onClick={() => useAppStore.getState().setPlayMode(!settings.playMode)}>
          <Play size={16} className="mr-2" />{settings.playMode ? 'Pause' : 'Run'}
        </Button>
        <Button variant="ghost" onClick={() => useAppStore.getState().setSnapToGrid(!settings.snapToGrid)}>
          <SquarePlus size={16} className="mr-2" />{settings.snapToGrid ? 'Snap an' : 'Snap aus'}
        </Button>
        <Button variant="ghost" onClick={() => useAppStore.getState().setZoom(clamp(settings.zoom + 0.1, 0.25, 3))}><Plus size={16} /></Button>
        <Button variant="ghost" onClick={() => useAppStore.getState().setZoom(clamp(settings.zoom - 0.1, 0.25, 3))}><Minus size={16} /></Button>
        <Button variant="ghost" onClick={resetView}><RotateCcw size={16} /></Button>
        <Button variant="ghost" onClick={() => createObject(scene.id, 'shape')}>Form</Button>
        <Button variant="ghost" onClick={() => createObject(scene.id, 'image')}>Bild</Button>
        <Button variant="ghost" onClick={() => createObject(scene.id, 'audio')}>Audio</Button>
      </div>

      <div className="pointer-events-none absolute bottom-4 left-4 rounded-2xl border border-slate-800 bg-slate-900/90 px-3 py-2 text-xs text-slate-300">
        Mitte-Maus: Pan · Mausrad: Zoom · Drag: Objekt verschieben · Shift+Drag: Mehrfachauswahl
      </div>

      {dragBox && (
        <div className="pointer-events-none absolute inset-0">
          <svg className="h-full w-full">
            <rect
              x={Math.min(dragBox.x1, dragBox.x2)}
              y={Math.min(dragBox.y1, dragBox.y2)}
              width={Math.abs(dragBox.x2 - dragBox.x1)}
              height={Math.abs(dragBox.y2 - dragBox.y1)}
              fill="rgba(56,189,248,0.12)"
              stroke="rgba(56,189,248,0.9)"
              strokeDasharray="5 4"
            />
          </svg>
        </div>
      )}
    </div>
  )
}
