// ─── Core Object Types ────────────────────────────────────────────────────────

export type ObjectKind = 'image' | 'shape' | 'audio'

export interface BaseObject {
  id: string
  name: string
  x: number
  y: number
  w: number
  h: number
  r: number       // rotation in degrees
  visible: boolean
  layer: number
  locked: boolean
  opacity: number
}

export interface ImageObject extends BaseObject {
  kind: 'image'
  assetId: string
}

export interface ShapeObject extends BaseObject {
  kind: 'shape'
  shapeType: 'rect' | 'ellipse' | 'triangle' | 'star'
  fill: string
  stroke: string
  strokeWidth: number
  cornerRadius?: number
}

export interface AudioObject extends BaseObject {
  kind: 'audio'
  assetId: string
  volume: number
  loop: boolean
  autoplay: boolean
}

export type SceneObject = ImageObject | ShapeObject | AudioObject

// ─── Block Types ──────────────────────────────────────────────────────────────

export type BlockCategory =
  | 'lifecycle'
  | 'variable'
  | 'logic'
  | 'loop'
  | 'function'
  | 'math'
  | 'motion'
  | 'control'

export type BlockType =
  // Lifecycle
  | 'setup' | 'loop_tick'
  // Variables
  | 'var_declare' | 'var_set' | 'var_get'
  // Logic
  | 'if' | 'if_else' | 'compare' | 'and' | 'or' | 'not'
  // Loops
  | 'repeat' | 'while' | 'for'
  // Functions
  | 'func_declare' | 'func_call' | 'func_param' | 'return'
  // Math
  | 'math_add' | 'math_sub' | 'math_mul' | 'math_div' | 'math_mod' | 'math_random' | 'math_clamp' | 'math_number'
  // Motion
  | 'move_forward' | 'move_back' | 'move_left' | 'move_right' | 'rotate' | 'move_to'
  // Control
  | 'wait' | 'stop' | 'comment'

export interface BlockParam {
  id: string
  name: string
  type: 'number' | 'string' | 'boolean' | 'any' | 'blockRef'
  defaultValue?: string | number | boolean
  value?: string | number | boolean
  blockId?: string // for inline block references
}

export interface Block {
  id: string
  type: BlockType
  params: BlockParam[]
  children?: Block[]   // nested blocks (for if, loop, etc.)
  elseChildren?: Block[] // for if_else
  next?: Block         // next block in sequence
  comment?: string
  objectId?: string    // which object this block is attached to
  collapsed?: boolean
}

export interface BlockScript {
  id: string
  objectId: string
  trigger: 'setup' | 'loop' | 'event'
  blocks: Block[]
}

// ─── Scene ────────────────────────────────────────────────────────────────────

export interface Scene {
  id: string
  name: string
  objects: SceneObject[]
  scripts: BlockScript[]
  backgroundColor: string
  width: number
  height: number
}

// ─── Asset ────────────────────────────────────────────────────────────────────

export type AssetType = 'image' | 'audio'

export interface Asset {
  id: string
  name: string
  type: AssetType
  dataUrl: string    // base64 data URL
  size: number
  mimeType: string
  width?: number
  height?: number
  duration?: number
}

// ─── History ─────────────────────────────────────────────────────────────────

export interface HistorySnapshot {
  id: string
  timestamp: number
  label: string
  scenes: Scene[]
  assets: Asset[]
}

// ─── Project ─────────────────────────────────────────────────────────────────

export interface Project {
  id: string
  name: string
  description?: string
  createdAt: number
  updatedAt: number
  thumbnail?: string
  scenes: Scene[]
  assets: Asset[]
  history: HistorySnapshot[]
  activeSceneId: string
  variables: VariableDeclaration[]
  functions: FunctionDeclaration[]
}

export interface VariableDeclaration {
  id: string
  name: string
  type: 'number' | 'string' | 'boolean'
  defaultValue: string | number | boolean
}

export interface FunctionDeclaration {
  id: string
  name: string
  params: string[]
  blocks: Block[]
}

// ─── Editor State ─────────────────────────────────────────────────────────────

export type EditorView = 'projects' | 'editor'
export type EditorPanel = 'scene' | 'blocks' | 'properties'

export interface Selection {
  objectIds: string[]
}

export interface CanvasTransform {
  x: number
  y: number
  scale: number
}

export interface EditorState {
  view: EditorView
  activeProjectId: string | null
  activeSceneId: string | null
  selectedObjectIds: string[]
  selectedBlockId: string | null
  canvasTransform: CanvasTransform
  gridSnap: boolean
  gridSize: number
  showGrid: boolean
  isPlaying: boolean
  isDirty: boolean
  activeTab: 'scene' | 'code' | 'assets'
  draggedBlockType: BlockType | null
}

// ─── Runtime ─────────────────────────────────────────────────────────────────

export interface RuntimeVariable {
  name: string
  value: string | number | boolean
}

export interface RuntimeState {
  variables: Record<string, RuntimeVariable>
  objectStates: Record<string, ObjectRuntimeState>
  isRunning: boolean
  tick: number
}

export interface ObjectRuntimeState {
  x: number
  y: number
  r: number
  visible: boolean
  opacity: number
}

// ─── Comparison Operator ─────────────────────────────────────────────────────

export type CompareOp = '==' | '!=' | '<' | '<=' | '>' | '>='
