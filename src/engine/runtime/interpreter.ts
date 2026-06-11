import type { Block, BlockScript, Scene, RuntimeState, RuntimeVariable } from '../../types'

type VarMap = Map<string, RuntimeVariable>

interface RuntimeContext {
  variables: VarMap
  objectStates: RuntimeState['objectStates']
  scene: Scene
  tick: number
  stopFlag: boolean
}

export class BlockInterpreter {
  private ctx: RuntimeContext

  constructor(ctx: RuntimeContext) {
    this.ctx = ctx
  }

  async runScript(script: BlockScript): Promise<void> {
    for (const block of script.blocks) {
      if (this.ctx.stopFlag) break
      await this.executeBlock(this.withTargetObject(block, script.objectId))
    }
  }

  private withTargetObject(block: Block, objectId: string): Block {
    return {
      ...block,
      objectId: block.objectId ?? objectId,
      children: block.children?.map(child => this.withTargetObject(child, objectId)),
      elseChildren: block.elseChildren?.map(child => this.withTargetObject(child, objectId)),
      next: block.next ? this.withTargetObject(block.next, objectId) : undefined,
    }
  }

  private async executeBlock(block: Block): Promise<unknown> {
    if (this.ctx.stopFlag) return

    switch (block.type) {
      case 'setup':
      case 'loop_tick':
      case 'on_click':
      case 'on_key_down':
        for (const child of block.children ?? []) {
          await this.executeBlock(child)
        }
        break

      case 'var_declare': {
        const name = String(this.getParam(block, 'name'))
        const val = this.getParam(block, 'value')
        this.ctx.variables.set(name, { name, value: val as string | number | boolean })
        break
      }
      case 'var_set': {
        const name = String(this.getParam(block, 'name'))
        const val = this.getParam(block, 'value')
        const existing = this.ctx.variables.get(name)
        this.ctx.variables.set(name, { name, value: existing ? this.coerce(val, existing.value) : (val as string | number | boolean) })
        break
      }
      case 'var_get':
        return this.ctx.variables.get(String(this.getParam(block, 'name')))?.value ?? 0

      case 'if': {
        const cond = await this.evalCondition(block)
        if (cond) {
          for (const child of block.children ?? []) await this.executeBlock(child)
        }
        break
      }
      case 'if_else': {
        const cond = await this.evalCondition(block)
        if (cond) {
          for (const child of block.children ?? []) await this.executeBlock(child)
        } else {
          for (const child of block.elseChildren ?? []) await this.executeBlock(child)
        }
        break
      }
      case 'compare':
        return this.evalCompare(block)
      case 'and': {
        const a = Boolean(this.getParam(block, 'a'))
        const b = Boolean(this.getParam(block, 'b'))
        return a && b
      }
      case 'or': {
        const a = Boolean(this.getParam(block, 'a'))
        const b = Boolean(this.getParam(block, 'b'))
        return a || b
      }
      case 'not':
        return !Boolean(this.getParam(block, 'value'))

      case 'repeat': {
        const count = Number(this.getParam(block, 'count'))
        for (let i = 0; i < count && !this.ctx.stopFlag; i++) {
          for (const child of block.children ?? []) await this.executeBlock(child)
        }
        break
      }
      case 'while': {
        let guard = 0
        while (!this.ctx.stopFlag && guard++ < 10000) {
          const cond = await this.evalCondition(block)
          if (!cond) break
          for (const child of block.children ?? []) await this.executeBlock(child)
        }
        break
      }
      case 'for': {
        const varName = String(this.getParam(block, 'var'))
        const from = Number(this.getParam(block, 'from'))
        const to = Number(this.getParam(block, 'to'))
        const step = Number(this.getParam(block, 'step')) || 1
        for (let i = from; step > 0 ? i <= to : i >= to; i += step) {
          if (this.ctx.stopFlag) break
          this.ctx.variables.set(varName, { name: varName, value: i })
          for (const child of block.children ?? []) await this.executeBlock(child)
        }
        break
      }

      case 'math_add':    return Number(this.getParam(block, 'a')) + Number(this.getParam(block, 'b'))
      case 'math_sub':    return Number(this.getParam(block, 'a')) - Number(this.getParam(block, 'b'))
      case 'math_mul':    return Number(this.getParam(block, 'a')) * Number(this.getParam(block, 'b'))
      case 'math_div': {
        const b = Number(this.getParam(block, 'b'))
        return b !== 0 ? Number(this.getParam(block, 'a')) / b : 0
      }
      case 'math_mod':    return Number(this.getParam(block, 'a')) % Number(this.getParam(block, 'b'))
      case 'math_random': {
        const min = Number(this.getParam(block, 'min'))
        const max = Number(this.getParam(block, 'max'))
        return Math.floor(Math.random() * (max - min + 1)) + min
      }
      case 'math_clamp': {
        const val = Number(this.getParam(block, 'val'))
        const min = Number(this.getParam(block, 'min'))
        const max = Number(this.getParam(block, 'max'))
        return Math.min(Math.max(val, min), max)
      }
      case 'math_number': return Number(this.getParam(block, 'value'))

      case 'move_forward':
      case 'move_back':
      case 'move_left':
      case 'move_right': {
        const steps = Number(this.getParam(block, 'steps'))
        const objId = block.objectId
        if (!objId) break
        const state = this.getObjectState(objId)
        if (block.type === 'move_forward') state.y -= steps
        if (block.type === 'move_back') state.y += steps
        if (block.type === 'move_left') state.x -= steps
        if (block.type === 'move_right') state.x += steps
        this.setObjectState(objId, state)
        break
      }
      case 'rotate': {
        const angle = Number(this.getParam(block, 'angle'))
        const objId = block.objectId
        if (!objId) break
        const state = this.getObjectState(objId)
        state.r = (state.r + angle) % 360
        this.setObjectState(objId, state)
        break
      }
      case 'move_to': {
        const x = Number(this.getParam(block, 'x'))
        const y = Number(this.getParam(block, 'y'))
        const objId = block.objectId
        if (!objId) break
        const state = this.getObjectState(objId)
        state.x = x
        state.y = y
        this.setObjectState(objId, state)
        break
      }

      case 'wait': {
        const ms = Number(this.getParam(block, 'ms'))
        await new Promise(r => setTimeout(r, ms))
        break
      }
      case 'stop':
        this.ctx.stopFlag = true
        break

      case 'comment':
        break

      default:
        break
    }
  }

  private async evalCondition(block: Block): Promise<boolean> {
    const condParam = block.params.find(p => p.name === 'cond' || p.name === 'condition')
    if (!condParam) return false
    const val = condParam.value ?? condParam.defaultValue
    if (typeof val === 'boolean') return val
    if (val === 'true') return true
    if (val === 'false') return false
    return Boolean(Number(val))
  }

  private evalCompare(block: Block): boolean {
    const left = this.getParam(block, 'left')
    const right = this.getParam(block, 'right')
    const op = String(this.getParam(block, 'op'))
    const l = Number(left)
    const r = Number(right)
    switch (op) {
      case '==': return l === r
      case '!=': return l !== r
      case '<':  return l < r
      case '<=': return l <= r
      case '>':  return l > r
      case '>=': return l >= r
      default:   return false
    }
  }

  private getParam(block: Block, name: string): string | number | boolean {
    const p = block.params.find(p => p.name === name)
    if (!p) return 0
    const val = p.value ?? p.defaultValue ?? 0
    if (typeof val === 'string' && this.ctx.variables.has(val)) {
      return this.ctx.variables.get(val)!.value
    }
    return val
  }

  private coerce(val: unknown, existing: string | number | boolean): string | number | boolean {
    if (typeof existing === 'number') return Number(val)
    if (typeof existing === 'boolean') return Boolean(val)
    return String(val)
  }

  private getObjectState(objId: string) {
    if (!this.ctx.objectStates[objId]) {
      const obj = this.ctx.scene.objects.find(o => o.id === objId)
      this.ctx.objectStates[objId] = {
        x: obj?.x ?? 0,
        y: obj?.y ?? 0,
        r: obj?.r ?? 0,
        visible: obj?.visible ?? true,
        opacity: obj?.opacity ?? 1,
      }
    }
    return { ...this.ctx.objectStates[objId] }
  }

  private setObjectState(objId: string, state: RuntimeState['objectStates'][string]) {
    this.ctx.objectStates[objId] = state
  }
}
