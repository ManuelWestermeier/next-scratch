import { useRef, useEffect, useCallback, useState } from 'react'
import { useProjectStore } from '../../store/projectStore'
import { CanvasRenderer } from '../../engine/renderer/canvasRenderer'
import { getActiveGameLoop } from '../../engine/runtime/gameLoop'
import type { RuntimeState } from '../../types'
import { v4 as uuidv4 } from 'uuid'
import { createImageObject } from '../../utils/defaults'

export function CanvasArea() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<CanvasRenderer | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const runtimeStateRef = useRef<RuntimeState | null>(null)
  const rafRef = useRef<number | null>(null)
  const isDraggingObject = useRef(false)
  const dragStart = useRef({ x: 0, y: 0, objX: 0, objY: 0 })
  const isPanning = useRef(false)
  const panStart = useRef({ mx: 0, my: 0, tx: 0, ty: 0 })
  const [_tick, setTick] = useState(0)

  const store = useProjectStore()
  const { editor, getActiveScene, getActiveProject, setSelectedObjects,
    updateObject, setCanvasTransform, addObject } = store

  const scene = getActiveScene()
  const project = getActiveProject()

  useEffect(() => {
    const handler = (e: Event) => {
      runtimeStateRef.current = (e as CustomEvent).detail
      setTick(t => t + 1)
    }
    window.addEventListener('runtime-update', handler)
    return () => window.removeEventListener('runtime-update', handler)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    rendererRef.current = new CanvasRenderer(canvas)
  }, [])

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    const renderer = rendererRef.current
    if (!container || !canvas || !renderer) return

    const ro = new ResizeObserver(() => {
      renderer.resize(container.clientWidth, container.clientHeight)
      setTick(t => t + 1)
    })
    ro.observe(container)
    renderer.resize(container.clientWidth, container.clientHeight)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const render = () => {
      const canvas = canvasRef.current
      const renderer = rendererRef.current
      if (!canvas || !renderer || !scene || !project) {
        rafRef.current = requestAnimationFrame(render)
        return
      }

      renderer.clear()
      renderer.renderScene(
        scene,
        project.assets,
        runtimeStateRef.current,
        editor.selectedObjectIds,
        editor.canvasTransform,
        editor.showGrid,
        editor.gridSize
      )
      rafRef.current = requestAnimationFrame(render)
    }
    rafRef.current = requestAnimationFrame(render)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [scene, project, editor])

  const snapToGrid = useCallback((v: number) => {
    if (!editor.gridSnap) return v
    return Math.round(v / editor.gridSize) * editor.gridSize
  }, [editor.gridSnap, editor.gridSize])

  const getCanvasPoint = useCallback((e: React.MouseEvent | MouseEvent | React.WheelEvent): { x: number; y: number } => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!scene || !rendererRef.current) return
    const pt = getCanvasPoint(e)

    if (editor.isPlaying) {
      if (e.button === 0) {
        const hitId = rendererRef.current.hitTest(scene, pt.x, pt.y, editor.canvasTransform)
        getActiveGameLoop()?.handleCanvasClick(hitId)
      }
      return
    }

    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      isPanning.current = true
      panStart.current = { mx: pt.x, my: pt.y, tx: editor.canvasTransform.x, ty: editor.canvasTransform.y }
      return
    }

    if (e.button === 0) {
      const hitId = rendererRef.current.hitTest(scene, pt.x, pt.y, editor.canvasTransform)

      if (hitId) {
        if (e.shiftKey) {
          const ids = editor.selectedObjectIds.includes(hitId)
            ? editor.selectedObjectIds.filter(id => id !== hitId)
            : [...editor.selectedObjectIds, hitId]
          setSelectedObjects(ids)
        } else {
          if (!editor.selectedObjectIds.includes(hitId)) {
            setSelectedObjects([hitId])
          }
        }

        const obj = scene.objects.find(o => o.id === hitId)
        if (obj) {
          isDraggingObject.current = true
          dragStart.current = { x: pt.x, y: pt.y, objX: obj.x, objY: obj.y }
        }
      } else {
        setSelectedObjects([])
      }
    }
  }, [scene, editor, setSelectedObjects, getCanvasPoint])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!scene) return
    const pt = getCanvasPoint(e)

    if (isPanning.current) {
      const dx = pt.x - panStart.current.mx
      const dy = pt.y - panStart.current.my
      setCanvasTransform({ x: panStart.current.tx + dx, y: panStart.current.ty + dy })
      return
    }

    if (isDraggingObject.current && editor.selectedObjectIds.length > 0) {
      const dx = (pt.x - dragStart.current.x) / editor.canvasTransform.scale
      const dy = (pt.y - dragStart.current.y) / editor.canvasTransform.scale
      const newX = snapToGrid(dragStart.current.objX + dx)
      const newY = snapToGrid(dragStart.current.objY + dy)

      for (const id of editor.selectedObjectIds) {
        const obj = scene.objects.find(o => o.id === id)
        if (obj) {
          const offX = obj.x - scene.objects.find(o => o.id === editor.selectedObjectIds[0])!.x
          const offY = obj.y - scene.objects.find(o => o.id === editor.selectedObjectIds[0])!.y
          updateObject(id, { x: newX + offX, y: newY + offY })
        }
      }
    }
  }, [scene, editor, updateObject, setCanvasTransform, snapToGrid, getCanvasPoint])

  const handleMouseUp = useCallback(() => {
    isDraggingObject.current = false
    isPanning.current = false
  }, [])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const pt = getCanvasPoint(e)
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newScale = Math.min(Math.max(editor.canvasTransform.scale * delta, 0.1), 5)

    const scaleChange = newScale / editor.canvasTransform.scale
    const newX = pt.x - scaleChange * (pt.x - editor.canvasTransform.x)
    const newY = pt.y - scaleChange * (pt.y - editor.canvasTransform.y)

    setCanvasTransform({ scale: newScale, x: newX, y: newY })
  }, [editor.canvasTransform, setCanvasTransform, getCanvasPoint])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.key === 'Delete' || e.key === 'Backspace') {
        for (const id of editor.selectedObjectIds) {
          store.deleteObject(id)
        }
      }
      if (e.key === 'd' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        for (const id of editor.selectedObjectIds) {
          store.duplicateObject(id)
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [editor.selectedObjectIds, store])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const type = e.dataTransfer.getData('object-type')
    if (!type || !scene || !rendererRef.current) return

    const pt = getCanvasPoint(e)
    const scenePos = rendererRef.current.canvasToScene(pt.x, pt.y, scene, editor.canvasTransform)

    if (type === 'image') {
      const image = createImageObject({
        id: uuidv4(),
        x: snapToGrid(scenePos.x - 40),
        y: snapToGrid(scenePos.y - 40),
        name: 'Neues Bild',
      })
      addObject(image)
    }
  }, [scene, editor.canvasTransform, addObject, snapToGrid, getCanvasPoint])

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-surface-950 canvas-grid"
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ cursor: isPanning.current ? 'grabbing' : editor.selectedObjectIds.length > 0 ? 'move' : 'default' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />

      <div className="absolute bottom-3 left-3 flex items-center gap-2 text-xs text-surface-500 font-mono pointer-events-none">
        <span>{Math.round(editor.canvasTransform.scale * 100)}%</span>
        {scene && <span>{scene.width}×{scene.height}</span>}
        {editor.selectedObjectIds.length > 0 && (
          <span className="text-brand-400">{editor.selectedObjectIds.length} ausgewählt</span>
        )}
        {editor.isPlaying && <span className="text-green-400 animate-pulse">● Läuft</span>}
      </div>

      <div className="absolute bottom-3 right-3 flex flex-col gap-1">
        <button
          className="w-7 h-7 rounded bg-surface-800 border border-surface-700 text-surface-300 hover:bg-surface-700 flex items-center justify-center text-sm"
          onClick={() => setCanvasTransform({ scale: Math.min(editor.canvasTransform.scale * 1.2, 5) })}
        >+</button>
        <button
          className="w-7 h-7 rounded bg-surface-800 border border-surface-700 text-surface-300 hover:bg-surface-700 flex items-center justify-center text-sm"
          onClick={() => setCanvasTransform({ scale: Math.max(editor.canvasTransform.scale * 0.8, 0.1) })}
        >−</button>
        <button
          className="w-7 h-7 rounded bg-surface-800 border border-surface-700 text-surface-300 hover:bg-surface-700 flex items-center justify-center text-xs"
          onClick={() => setCanvasTransform({ x: 0, y: 0, scale: 1 })}
          title="Zoom zurücksetzen"
        >⊡</button>
      </div>
    </div>
  )
}
