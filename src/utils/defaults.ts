import { v4 as uuidv4 } from 'uuid'
import type { Scene, ShapeObject, Block, BlockParam, BlockType } from '../types'

export function createDefaultScene(name = 'Szene 1'): Scene {
  return {
    id: uuidv4(),
    name,
    objects: [],
    scripts: [],
    backgroundColor: '#1e293b',
    width: 480,
    height: 360,
  }
}

export function createShapeObject(overrides: Partial<ShapeObject> = {}): ShapeObject {
  return {
    id: uuidv4(),
    name: 'Form',
    kind: 'shape',
    x: 100,
    y: 100,
    w: 80,
    h: 80,
    r: 0,
    visible: true,
    layer: 0,
    locked: false,
    opacity: 1,
    shapeType: 'rect',
    fill: '#6366f1',
    stroke: 'transparent',
    strokeWidth: 0,
    ...overrides,
  }
}

export function createBlock(type: BlockType, paramOverrides: Record<string, string | number | boolean> = {}): Block {
  const params = getDefaultParams(type)
  for (const [k, v] of Object.entries(paramOverrides)) {
    const p = params.find(p => p.name === k)
    if (p) p.value = v
  }
  return {
    id: uuidv4(),
    type,
    params,
    children: needsChildren(type) ? [] : undefined,
    elseChildren: type === 'if_else' ? [] : undefined,
  }
}

function needsChildren(type: BlockType): boolean {
  return ['if', 'if_else', 'repeat', 'while', 'for', 'setup', 'loop_tick', 'func_declare'].includes(type)
}

function getDefaultParams(type: BlockType): BlockParam[] {
  const p = (id: string, name: string, t: BlockParam['type'], def: BlockParam['defaultValue'] = ''): BlockParam => ({
    id, name, type: t, defaultValue: def, value: def
  })

  switch (type) {
    case 'var_declare': return [p('name', 'name', 'string', 'variable'), p('type', 'type', 'string', 'number'), p('value', 'value', 'any', 0)]
    case 'var_set': return [p('name', 'name', 'string', 'variable'), p('value', 'value', 'any', 0)]
    case 'var_get': return [p('name', 'name', 'string', 'variable')]
    case 'if': return [p('cond', 'condition', 'boolean', 'true')]
    case 'if_else': return [p('cond', 'condition', 'boolean', 'true')]
    case 'compare': return [p('left', 'left', 'any', 0), p('op', 'op', 'string', '=='), p('right', 'right', 'any', 0)]
    case 'and': return [p('a', 'a', 'boolean', 'true'), p('b', 'b', 'boolean', 'true')]
    case 'or': return [p('a', 'a', 'boolean', 'true'), p('b', 'b', 'boolean', 'true')]
    case 'not': return [p('value', 'value', 'boolean', 'true')]
    case 'repeat': return [p('count', 'count', 'number', 10)]
    case 'while': return [p('cond', 'condition', 'boolean', 'true')]
    case 'for': return [p('var', 'variable', 'string', 'i'), p('from', 'from', 'number', 0), p('to', 'to', 'number', 10), p('step', 'step', 'number', 1)]
    case 'func_declare': return [p('name', 'name', 'string', 'meineFunktion')]
    case 'func_call': return [p('name', 'name', 'string', 'meineFunktion')]
    case 'return': return [p('value', 'value', 'any', 0)]
    case 'math_add': return [p('a', 'a', 'number', 0), p('b', 'b', 'number', 0)]
    case 'math_sub': return [p('a', 'a', 'number', 0), p('b', 'b', 'number', 0)]
    case 'math_mul': return [p('a', 'a', 'number', 1), p('b', 'b', 'number', 1)]
    case 'math_div': return [p('a', 'a', 'number', 1), p('b', 'b', 'number', 1)]
    case 'math_mod': return [p('a', 'a', 'number', 10), p('b', 'b', 'number', 3)]
    case 'math_random': return [p('min', 'min', 'number', 0), p('max', 'max', 'number', 100)]
    case 'math_clamp': return [p('val', 'value', 'number', 0), p('min', 'min', 'number', 0), p('max', 'max', 'number', 100)]
    case 'math_number': return [p('value', 'value', 'number', 0)]
    case 'move_forward': return [p('steps', 'steps', 'number', 10)]
    case 'move_back': return [p('steps', 'steps', 'number', 10)]
    case 'move_left': return [p('steps', 'steps', 'number', 10)]
    case 'move_right': return [p('steps', 'steps', 'number', 10)]
    case 'rotate': return [p('angle', 'angle', 'number', 15)]
    case 'move_to': return [p('x', 'x', 'number', 0), p('y', 'y', 'number', 0)]
    case 'wait': return [p('ms', 'ms', 'number', 1000)]
    case 'comment': return [p('text', 'text', 'string', 'Kommentar')]
    default: return []
  }
}
