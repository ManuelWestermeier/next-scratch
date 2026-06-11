import { v4 as uuidv4 } from 'uuid'
import type {
  Scene, ShapeObject, ImageObject, Block, BlockParam, BlockType,
  Asset, Project, SceneFunction, SceneVariable
} from '../types'

function svgDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function makeAsset(name: string, svg: string, width: number, height: number): Asset {
  return {
    id: uuidv4(),
    name,
    type: 'image',
    dataUrl: svgDataUri(svg),
    size: svg.length,
    mimeType: 'image/svg+xml',
    width,
    height,
  }
}

export function createDefaultScene(name = 'Szene 1'): Scene {
  return {
    id: uuidv4(),
    name,
    objects: [],
    scripts: [],
    backgroundColor: '#0f172a',
    width: 960,
    height: 540,
    variables: [],
    functions: [],
  }
}

export function createImageObject(overrides: Partial<ImageObject> = {}): ImageObject {
  return {
    id: uuidv4(),
    name: 'Bild',
    kind: 'image',
    x: 100,
    y: 100,
    w: 80,
    h: 80,
    r: 0,
    visible: true,
    layer: 0,
    locked: false,
    opacity: 1,
    assetId: '',
    ...overrides,
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
  return ['if', 'if_else', 'repeat', 'while', 'for', 'setup', 'loop_tick', 'func_declare', 'on_click', 'on_key_down'].includes(type)
}

function getDefaultParams(type: BlockType): BlockParam[] {
  const p = (id: string, name: string, t: BlockParam['type'], def: BlockParam['defaultValue'] = ''): BlockParam => ({
    id, name, type: t, defaultValue: def, value: def
  })

  switch (type) {
    case 'on_key_down': return [p('key', 'key', 'string', 'ArrowUp')]
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

export function createDemoProject(): Project {
  const triangleAsset = makeAsset(
    'Triangle Player',
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
      <polygon points="64,10 118,116 10,116" fill="#f8fafc" stroke="#0f172a" stroke-width="8" stroke-linejoin="round"/>
      <polygon points="64,26 101,108 27,108" fill="#38bdf8" opacity="0.18"/>
    </svg>`,
    128,
    128,
  )

  const platformAsset = makeAsset(
    'Platform',
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 80">
      <rect x="4" y="4" width="392" height="72" rx="18" fill="#334155" stroke="#94a3b8" stroke-width="8"/>
      <rect x="26" y="18" width="348" height="12" rx="6" fill="#475569" opacity="0.8"/>
    </svg>`,
    400,
    80,
  )

  const wallAsset = makeAsset(
    'Wall',
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 240">
      <rect x="8" y="8" width="104" height="224" rx="18" fill="#1f2937" stroke="#64748b" stroke-width="8"/>
      <rect x="28" y="28" width="64" height="64" rx="12" fill="#334155" opacity="0.65"/>
      <rect x="28" y="112" width="64" height="48" rx="12" fill="#334155" opacity="0.55"/>
    </svg>`,
    120,
    240,
  )

  const finishAsset = makeAsset(
    'Finish',
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 160">
      <rect x="56" y="8" width="16" height="144" rx="8" fill="#e2e8f0"/>
      <path d="M72 22 L118 36 L72 54 Z" fill="#22c55e"/>
      <path d="M72 54 L118 36 L72 18 Z" fill="#16a34a" opacity="0.6"/>
      <circle cx="64" cy="136" r="22" fill="#f59e0b" stroke="#0f172a" stroke-width="8"/>
      <path d="M52 136 L60 144 L76 124" fill="none" stroke="#0f172a" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
    128,
    160,
  )

  const scene = createDefaultScene('Parkour-Demo')
  scene.backgroundColor = '#0f172a'
  scene.width = 960
  scene.height = 540

  const playerStartX = 72
  const playerStartY = 430
  const speed = 12

  const variables: SceneVariable[] = [
    { id: 'speed', name: 'speed', type: 'number', defaultValue: speed },
    { id: 'startX', name: 'startX', type: 'number', defaultValue: playerStartX },
    { id: 'startY', name: 'startY', type: 'number', defaultValue: playerStartY },
  ]

  const player = createImageObject({
    name: 'Spieler',
    x: playerStartX,
    y: playerStartY,
    w: 42,
    h: 42,
    layer: 10,
    assetId: triangleAsset.id,
  })

  const ground = createImageObject({
    name: 'Boden',
    x: 28,
    y: 470,
    w: 904,
    h: 60,
    layer: 1,
    assetId: platformAsset.id,
  })

  const platform1 = createImageObject({
    name: 'Plattform 1',
    x: 140,
    y: 390,
    w: 180,
    h: 36,
    layer: 2,
    assetId: platformAsset.id,
  })

  const wall1 = createImageObject({
    name: 'Wand 1',
    x: 330,
    y: 260,
    w: 52,
    h: 160,
    layer: 3,
    assetId: wallAsset.id,
  })

  const platform2 = createImageObject({
    name: 'Plattform 2',
    x: 420,
    y: 310,
    w: 200,
    h: 36,
    layer: 2,
    assetId: platformAsset.id,
  })

  const wall2 = createImageObject({
    name: 'Wand 2',
    x: 640,
    y: 190,
    w: 52,
    h: 180,
    layer: 3,
    assetId: wallAsset.id,
  })

  const platform3 = createImageObject({
    name: 'Plattform 3',
    x: 700,
    y: 360,
    w: 180,
    h: 36,
    layer: 2,
    assetId: platformAsset.id,
  })

  const finish = createImageObject({
    name: 'Ziel',
    x: 860,
    y: 220,
    w: 56,
    h: 70,
    layer: 5,
    assetId: finishAsset.id,
  })

  const setupScript = {
    id: uuidv4(),
    objectId: player.id,
    trigger: 'setup' as const,
    blocks: [
      createBlock('setup'),
      createBlock('var_declare', { name: 'speed', value: speed }),
      createBlock('var_declare', { name: 'startX', value: playerStartX }),
      createBlock('var_declare', { name: 'startY', value: playerStartY }),
    ],
  }

  setupScript.blocks[0].children = setupScript.blocks.slice(1)

  const makeMoveScript = (key: string, type: 'move_forward' | 'move_back' | 'move_left' | 'move_right') => {
    const root = createBlock('on_key_down', { key })
    root.children = [createBlock(type, { steps: speed })]
    return {
      id: uuidv4(),
      objectId: player.id,
      trigger: 'keydown' as const,
      blocks: [root],
    }
  }

  const clickRoot = createBlock('on_click')
  clickRoot.children = [createBlock('move_to', { x: playerStartX, y: playerStartY })]

  scene.objects = [ground, platform1, wall1, platform2, wall2, platform3, finish, player]
  scene.scripts = [
    setupScript,
    makeMoveScript('ArrowUp', 'move_forward'),
    makeMoveScript('ArrowDown', 'move_back'),
    makeMoveScript('ArrowLeft', 'move_left'),
    makeMoveScript('ArrowRight', 'move_right'),
    {
      id: uuidv4(),
      objectId: player.id,
      trigger: 'click' as const,
      blocks: [clickRoot],
    },
  ]
  scene.variables = variables
  scene.functions = []

  return {
    id: uuidv4(),
    name: 'Demo-Level',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    scenes: [scene],
    assets: [triangleAsset, platformAsset, wallAsset, finishAsset],
    history: [],
    activeSceneId: scene.id,
    variables: [],
    functions: [],
  }
}
