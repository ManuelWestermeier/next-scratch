import type { Scene, RuntimeState, RuntimeVariable, Block } from '../../types'
import { BlockInterpreter } from './interpreter'

const TARGET_FPS = 30
const FRAME_MS = 1000 / TARGET_FPS

type StateUpdater = (state: RuntimeState) => void

let activeGameLoop: GameLoop | null = null

function normalizeKey(key: string): string {
  if (key === ' ') return 'Space'
  return key
}

export function getActiveGameLoop(): GameLoop | null {
  return activeGameLoop
}

export class GameLoop {
  private scene: Scene | null = null
  private runtimeState: RuntimeState = { variables: {}, objectStates: {}, isRunning: false, tick: 0 }
  private onUpdate: StateUpdater
  private rafId: number | null = null
  private lastFrame = 0
  private stopFlag = false
  private keyHandler = (e: KeyboardEvent) => this.handleKeyDown(e)

  constructor(onUpdate: StateUpdater) {
    this.onUpdate = onUpdate
  }

  start(scene: Scene) {
    this.scene = scene
    this.stopFlag = false
    activeGameLoop = this
    window.addEventListener('keydown', this.keyHandler)

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

    void this.runSetup()
    this.rafId = requestAnimationFrame(this.frame)
    this.onUpdate(this.runtimeState)
  }

  stop() {
    this.stopFlag = true
    window.removeEventListener('keydown', this.keyHandler)
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this.runtimeState = { ...this.runtimeState, isRunning: false }
    this.onUpdate(this.runtimeState)
    if (activeGameLoop === this) activeGameLoop = null
  }

  dispose() {
    this.stop()
  }

  handleCanvasClick(targetObjectId: string | null) {
    void this.runEventScripts('click', targetObjectId)
  }

  private handleKeyDown(event: KeyboardEvent) {
    if (!this.scene || this.stopFlag) return
    const target = event.target
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      (target instanceof HTMLElement && target.isContentEditable)
    ) {
      return
    }
    void this.runKeyScripts(normalizeKey(event.key))
  }

  private frame = (now: number) => {
    if (this.stopFlag) return
    if (now - this.lastFrame >= FRAME_MS) {
      this.lastFrame = now
      void this.tick()
    }
    this.rafId = requestAnimationFrame(this.frame)
  }

  private async runSetup() {
    if (!this.scene) return
    const varMap = this.cloneVariables()
    for (const script of this.scene.scripts.filter(s => s.trigger === 'setup')) {
      const interp = new BlockInterpreter({
        variables: varMap,
        objectStates: this.runtimeState.objectStates,
        scene: this.scene,
        tick: 0,
        stopFlag: this.stopFlag,
      })
      await interp.runScript(script)
    }
    this.syncVariables(varMap)
    this.onUpdate(this.runtimeState)
  }

  private async tick() {
    if (!this.scene || this.stopFlag) return

    this.runtimeState = { ...this.runtimeState, tick: this.runtimeState.tick + 1 }

    const varMap = this.cloneVariables()
    const objStates = { ...this.runtimeState.objectStates }

    for (const script of this.scene.scripts.filter(s => s.trigger === 'loop')) {
      const interp = new BlockInterpreter({
        variables: varMap,
        objectStates: objStates,
        scene: this.scene,
        tick: this.runtimeState.tick,
        stopFlag: this.stopFlag,
      })
      await interp.runScript(script)
    }

    this.runtimeState = { ...this.runtimeState, variables: Object.fromEntries(varMap.entries()), objectStates: objStates }
    this.onUpdate(this.runtimeState)
  }

  private async runKeyScripts(key: string) {
    if (!this.scene || this.stopFlag) return
    const varMap = this.cloneVariables()
    for (const script of this.scene.scripts.filter(s => s.trigger === 'keydown')) {
      const root = script.blocks[0]
      const keyParam = root?.params.find(p => p.name === 'key')
      const scriptKey = normalizeKey(String(keyParam?.value ?? keyParam?.defaultValue ?? 'ArrowUp'))
      if (scriptKey !== 'Any' && scriptKey !== key) continue
      const interp = new BlockInterpreter({
        variables: varMap,
        objectStates: this.runtimeState.objectStates,
        scene: this.scene,
        tick: this.runtimeState.tick,
        stopFlag: this.stopFlag,
      })
      await interp.runScript(script)
    }
    this.syncVariables(varMap)
    this.onUpdate(this.runtimeState)
  }

  private async runEventScripts(trigger: 'click', targetObjectId: string | null) {
    if (!this.scene || this.stopFlag) return
    if (!targetObjectId) return

    const varMap = this.cloneVariables()
    for (const script of this.scene.scripts.filter(s => s.trigger === trigger && s.objectId === targetObjectId)) {
      const interp = new BlockInterpreter({
        variables: varMap,
        objectStates: this.runtimeState.objectStates,
        scene: this.scene,
        tick: this.runtimeState.tick,
        stopFlag: this.stopFlag,
      })
      await interp.runScript(script)
    }
    this.syncVariables(varMap)
    this.onUpdate(this.runtimeState)
  }

  private cloneVariables(): Map<string, RuntimeVariable> {
    const varMap = new Map<string, RuntimeVariable>()
    for (const [k, v] of Object.entries(this.runtimeState.variables)) {
      varMap.set(k, v)
    }
    return varMap
  }

  private syncVariables(varMap: Map<string, RuntimeVariable>) {
    const vars: RuntimeState['variables'] = {}
    for (const [k, v] of varMap.entries()) vars[k] = v
    this.runtimeState = { ...this.runtimeState, variables: vars }
  }
}
