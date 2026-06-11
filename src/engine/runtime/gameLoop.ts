import type { Scene, RuntimeState, RuntimeVariable } from '../../types'
import { BlockInterpreter } from './interpreter'

const TARGET_FPS = 30
const FRAME_MS = 1000 / TARGET_FPS

type StateUpdater = (state: RuntimeState) => void

export class GameLoop {
  private scene: Scene | null = null
  private runtimeState: RuntimeState = { variables: {}, objectStates: {}, isRunning: false, tick: 0 }
  private onUpdate: StateUpdater
  private rafId: number | null = null
  private lastFrame = 0
  private stopFlag = false

  constructor(onUpdate: StateUpdater) {
    this.onUpdate = onUpdate
  }

  start(scene: Scene) {
    this.scene = scene
    this.stopFlag = false

    // Initialize runtime state from scene objects
    const objectStates: RuntimeState['objectStates'] = {}
    for (const obj of scene.objects) {
      objectStates[obj.id] = { x: obj.x, y: obj.y, r: obj.r, visible: obj.visible, opacity: obj.opacity }
    }

    this.runtimeState = {
      variables: {},
      objectStates,
      isRunning: true,
      tick: 0,
    }

    // Run setup scripts
    this.runSetup()

    // Start loop
    this.rafId = requestAnimationFrame(this.frame)
  }

  stop() {
    this.stopFlag = true
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this.runtimeState = { ...this.runtimeState, isRunning: false }
    this.onUpdate(this.runtimeState)
  }

  private frame = (now: number) => {
    if (this.stopFlag) return
    if (now - this.lastFrame >= FRAME_MS) {
      this.lastFrame = now
      this.tick()
    }
    this.rafId = requestAnimationFrame(this.frame)
  }

  private async runSetup() {
    if (!this.scene) return
    const varMap = new Map<string, RuntimeVariable>()
    for (const [k, v] of Object.entries(this.runtimeState.variables)) {
      varMap.set(k, v)
    }

    for (const script of this.scene.scripts.filter(s => s.trigger === 'setup')) {
      const interp = new BlockInterpreter({
        variables: varMap,
        objectStates: this.runtimeState.objectStates,
        scene: this.scene,
        tick: 0,
        stopFlag: this.stopFlag,
      })
      for (const block of script.blocks) {
        await interp.runScript(script)
      }
    }

    // Sync variables back
    const vars: RuntimeState['variables'] = {}
    for (const [k, v] of varMap.entries()) {
      vars[k] = v
    }
    this.runtimeState = { ...this.runtimeState, variables: vars }
    this.onUpdate(this.runtimeState)
  }

  private async tick() {
    if (!this.scene || this.stopFlag) return

    this.runtimeState = { ...this.runtimeState, tick: this.runtimeState.tick + 1 }

    const varMap = new Map<string, RuntimeVariable>()
    for (const [k, v] of Object.entries(this.runtimeState.variables)) {
      varMap.set(k, v)
    }

    const objStates = { ...this.runtimeState.objectStates }

    for (const script of this.scene.scripts.filter(s => s.trigger === 'loop')) {
      // Add objectId to all motion blocks
      const enrichedScript = {
        ...script,
        blocks: script.blocks.map(b => ({ ...b, objectId: script.objectId }))
      }
      const interp = new BlockInterpreter({
        variables: varMap,
        objectStates: objStates,
        scene: this.scene,
        tick: this.runtimeState.tick,
        stopFlag: this.stopFlag,
      })
      await interp.runScript(enrichedScript)
    }

    const vars: RuntimeState['variables'] = {}
    for (const [k, v] of varMap.entries()) {
      vars[k] = v
    }

    this.runtimeState = { ...this.runtimeState, variables: vars, objectStates: objStates }
    this.onUpdate(this.runtimeState)
  }
}
