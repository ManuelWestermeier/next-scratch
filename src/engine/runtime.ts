import { BlockNode, Project, Scene, SceneObject, Script } from '@/types'
import { clamp } from '@/lib/math'
import { clone } from '@/lib/clone'

export interface RuntimeResult {
  scene: Scene
  changed: boolean
}

interface ExecContext {
  project: Project
  scene: Scene
  variables: Record<string, unknown>
  functions: Map<string, Script>
  selectedIds: string[]
  returnValue?: unknown
  lastValue?: unknown
  mutated: boolean
}

const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const toNumber = (value: unknown, fallback = 0) => {
  if (typeof value === 'number') return value
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}
const toBoolean = (value: unknown) => Boolean(value)

const targetObjects = (ctx: ExecContext, target: unknown): SceneObject[] => {
  if (typeof target === 'string' && target !== 'selected') {
    const found = ctx.scene.objects.find((object) => object.id === target)
    return found ? [found] : []
  }
  const selected = ctx.scene.objects.filter((object) => ctx.selectedIds.includes(object.id))
  return selected.length ? selected : ctx.scene.objects.slice(-1)
}

const readArg = (ctx: ExecContext, block: BlockNode, key: string, fallback?: unknown) => {
  const value = block.args[key]
  if (value === undefined || value === null) return fallback
  if (typeof value === 'object' && value && 'var' in value) {
    return ctx.variables[String((value as { var: string }).var)] ?? fallback
  }
  if (typeof value === 'string' && value.startsWith('$')) {
    return ctx.variables[value.slice(1)] ?? fallback
  }
  return value
}

const evalComparator = (op: string, left: unknown, right: unknown) => {
  switch (op) {
    case '==': return left === right
    case '!=': return left !== right
    case '>': return toNumber(left) > toNumber(right)
    case '>=': return toNumber(left) >= toNumber(right)
    case '<': return toNumber(left) < toNumber(right)
    case '<=': return toNumber(left) <= toNumber(right)
    default: return false
  }
}

const execBlocks = (blocks: BlockNode[], ctx: ExecContext): void => {
  for (const block of blocks) {
    if (ctx.returnValue !== undefined) return

    switch (block.type) {
      case 'VAR_CREATE':
      case 'VAR_SET': {
        const name = String(readArg(ctx, block, 'name', 'value'))
        ctx.variables[name] = readArg(ctx, block, 'value', null)
        ctx.mutated = true
        break
      }
      case 'VAR_GET': {
        const name = String(readArg(ctx, block, 'name', 'value'))
        ctx.lastValue = ctx.variables[name]
        break
      }
      case 'ADD':
        ctx.lastValue = toNumber(readArg(ctx, block, 'a', 0)) + toNumber(readArg(ctx, block, 'b', 0))
        break
      case 'SUBTRACT':
        ctx.lastValue = toNumber(readArg(ctx, block, 'a', 0)) - toNumber(readArg(ctx, block, 'b', 0))
        break
      case 'MULTIPLY':
        ctx.lastValue = toNumber(readArg(ctx, block, 'a', 0)) * toNumber(readArg(ctx, block, 'b', 0))
        break
      case 'DIVIDE':
        ctx.lastValue = toNumber(readArg(ctx, block, 'b', 1)) === 0 ? 0 : toNumber(readArg(ctx, block, 'a', 0)) / toNumber(readArg(ctx, block, 'b', 1))
        break
      case 'MODULO':
        ctx.lastValue = toNumber(readArg(ctx, block, 'b', 1)) === 0 ? 0 : toNumber(readArg(ctx, block, 'a', 0)) % toNumber(readArg(ctx, block, 'b', 1))
        break
      case 'RANDOM': {
        const min = toNumber(readArg(ctx, block, 'min', 0))
        const max = toNumber(readArg(ctx, block, 'max', 1))
        ctx.lastValue = min + Math.random() * (max - min)
        break
      }
      case 'CLAMP': {
        const value = toNumber(readArg(ctx, block, 'value', 0))
        const min = toNumber(readArg(ctx, block, 'min', 0))
        const max = toNumber(readArg(ctx, block, 'max', 1))
        ctx.lastValue = clamp(value, min, max)
        break
      }
      case 'AND':
        ctx.lastValue = toBoolean(readArg(ctx, block, 'a', false)) && toBoolean(readArg(ctx, block, 'b', false))
        break
      case 'OR':
        ctx.lastValue = toBoolean(readArg(ctx, block, 'a', false)) || toBoolean(readArg(ctx, block, 'b', false))
        break
      case 'NOT':
        ctx.lastValue = !toBoolean(readArg(ctx, block, 'value', false))
        break
      case 'EQ':
        ctx.lastValue = readArg(ctx, block, 'a') === readArg(ctx, block, 'b')
        break
      case 'NEQ':
        ctx.lastValue = readArg(ctx, block, 'a') !== readArg(ctx, block, 'b')
        break
      case 'GT':
        ctx.lastValue = toNumber(readArg(ctx, block, 'a', 0)) > toNumber(readArg(ctx, block, 'b', 0))
        break
      case 'GTE':
        ctx.lastValue = toNumber(readArg(ctx, block, 'a', 0)) >= toNumber(readArg(ctx, block, 'b', 0))
        break
      case 'LT':
        ctx.lastValue = toNumber(readArg(ctx, block, 'a', 0)) < toNumber(readArg(ctx, block, 'b', 0))
        break
      case 'LTE':
        ctx.lastValue = toNumber(readArg(ctx, block, 'a', 0)) <= toNumber(readArg(ctx, block, 'b', 0))
        break
      case 'IF': {
        const condition = block.args.condition !== undefined ? toBoolean(readArg(ctx, block, 'condition', false)) : evalComparator(String(readArg(ctx, block, 'op', '==')), readArg(ctx, block, 'left', null), readArg(ctx, block, 'right', null))
        if (condition) execBlocks(block.children, ctx)
        else if (block.elseChildren?.length) execBlocks(block.elseChildren, ctx)
        break
      }
      case 'REPEAT': {
        const count = Math.max(0, Math.floor(toNumber(readArg(ctx, block, 'count', 0))))
        for (let index = 0; index < count; index += 1) {
          ctx.variables.index = index
          execBlocks(block.children, ctx)
          if (ctx.returnValue !== undefined) break
        }
        break
      }
      case 'WHILE': {
        let guard = 0
        while (guard < 1000) {
          const condition = block.args.condition !== undefined ? toBoolean(readArg(ctx, block, 'condition', false)) : evalComparator(String(readArg(ctx, block, 'op', '==')), readArg(ctx, block, 'left', null), readArg(ctx, block, 'right', null))
          if (!condition) break
          execBlocks(block.children, ctx)
          guard += 1
          if (ctx.returnValue !== undefined) break
        }
        break
      }
      case 'FOR': {
        const start = Math.floor(toNumber(readArg(ctx, block, 'start', 0)))
        const end = Math.floor(toNumber(readArg(ctx, block, 'end', 0)))
        const step = Math.max(1, Math.floor(Math.abs(toNumber(readArg(ctx, block, 'step', 1)))))
        for (let i = start; i <= end; i += step) {
          ctx.variables.index = i
          execBlocks(block.children, ctx)
          if (ctx.returnValue !== undefined) break
        }
        break
      }
      case 'CALL_FUNCTION': {
        const fnName = String(readArg(ctx, block, 'name', ''))
        const fn = ctx.functions.get(fnName)
        if (fn) {
          const next = clone(ctx)
          next.variables = { ...ctx.variables }
          fn.params.forEach((param, index) => {
            next.variables[param] = readArg(ctx, block, `arg${index}`, null)
          })
          execBlocks(fn.blocks, next)
          ctx.lastValue = next.returnValue ?? next.lastValue
          if (next.mutated) ctx.mutated = true
        }
        break
      }
      case 'RETURN':
        ctx.returnValue = readArg(ctx, block, 'value', null)
        return
      case 'GO_FORWARD':
      case 'GO_BACK':
      case 'GO_LEFT':
      case 'GO_RIGHT':
      case 'ROTATE':
      case 'MOVE_TO': {
        const objects = targetObjects(ctx, readArg(ctx, block, 'target', 'selected'))
        for (const object of objects) {
          if (block.type === 'MOVE_TO') {
            object.x = toNumber(readArg(ctx, block, 'x', object.x))
            object.y = toNumber(readArg(ctx, block, 'y', object.y))
            ctx.mutated = true
          } else if (block.type === 'ROTATE') {
            object.r += toNumber(readArg(ctx, block, 'degrees', 0))
            ctx.mutated = true
          } else {
            const distance = toNumber(readArg(ctx, block, 'distance', 1)) * (block.type === 'GO_BACK' || block.type === 'GO_LEFT' ? -1 : 1)
            if (block.type === 'GO_FORWARD' || block.type === 'GO_BACK') {
              const rad = (object.r * Math.PI) / 180
              object.x += Math.cos(rad) * distance
              object.y += Math.sin(rad) * distance
            } else {
              object.x += distance
            }
            ctx.mutated = true
          }
        }
        break
      }
      default:
        break
    }
  }
}

export const runRuntimeFrame = (project: Project, scene: Scene, dt: number, playing: boolean): RuntimeResult => {
  const nextScene = clone(scene)
  const functions = new Map(nextScene.scripts.filter((script) => script.kind === 'function').map((script) => [script.name, script] as const))
  const ctx: ExecContext = {
    project,
    scene: nextScene,
    variables: nextScene.variables,
    functions,
    selectedIds: nextScene.selectedObjectIds,
    mutated: false,
  }

  const setup = nextScene.scripts.find((script) => script.kind === 'setup')
  const loop = nextScene.scripts.find((script) => script.kind === 'loop')

  if (setup && nextScene.variables.__setupDone !== true) {
    execBlocks(setup.blocks, ctx)
    nextScene.variables.__setupDone = true
    ctx.mutated = true
  }

  if (playing && loop) {
    execBlocks(loop.blocks, ctx)
  }

  return { scene: nextScene, changed: ctx.mutated }
}
