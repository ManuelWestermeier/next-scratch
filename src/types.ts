export type ThemeMode = 'dark' | 'light'
export type AppView = 'dashboard' | 'editor'
export type AssetType = 'image' | 'audio'
export type ObjectType = 'image' | 'shape' | 'audio'
export type ShapeKind = 'rect' | 'circle' | 'triangle'
export type ScriptKind = 'setup' | 'loop' | 'function'
export type BlockType =
  | 'VAR_CREATE'
  | 'VAR_SET'
  | 'VAR_GET'
  | 'IF'
  | 'ELSE'
  | 'AND'
  | 'OR'
  | 'NOT'
  | 'EQ'
  | 'NEQ'
  | 'GT'
  | 'GTE'
  | 'LT'
  | 'LTE'
  | 'REPEAT'
  | 'WHILE'
  | 'FOR'
  | 'CALL_FUNCTION'
  | 'RETURN'
  | 'ADD'
  | 'SUBTRACT'
  | 'MULTIPLY'
  | 'DIVIDE'
  | 'MODULO'
  | 'RANDOM'
  | 'CLAMP'
  | 'GO_FORWARD'
  | 'GO_BACK'
  | 'GO_LEFT'
  | 'GO_RIGHT'
  | 'ROTATE'
  | 'MOVE_TO'

export interface Asset {
  id: string
  name: string
  type: AssetType
  mimeType: string
  dataUrl: string
  size: number
  createdAt: number
}

export interface SceneObject {
  id: string
  name: string
  type: ObjectType
  x: number
  y: number
  w: number
  h: number
  r: number
  visible: boolean
  layer: number
  assetId?: string
  shapeKind?: ShapeKind
  fill?: string
  opacity?: number
  text?: string
  speed?: number
}

export interface BlockNode {
  id: string
  type: BlockType
  label: string
  args: Record<string, unknown>
  children: BlockNode[]
  elseChildren?: BlockNode[]
  collapsed?: boolean
}

export interface Script {
  id: string
  name: string
  kind: ScriptKind
  params: string[]
  returnType: 'void' | 'number' | 'string' | 'boolean'
  blocks: BlockNode[]
}

export interface Scene {
  id: string
  name: string
  width: number
  height: number
  background: string
  gridSize: number
  objects: SceneObject[]
  scripts: Script[]
  selectedObjectIds: string[]
  variables: Record<string, unknown>
  lastUpdatedAt: number
}

export interface HistorySnapshot {
  id: string
  ts: number
  label: string
  sceneId: string
  projectData: Project
}

export interface Project {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  lastSnapshotAt: number
  scenes: Scene[]
  activeSceneId: string
  assets: Asset[]
  history: HistorySnapshot[]
}

export interface AppSettings {
  theme: ThemeMode
  zoom: number
  panX: number
  panY: number
  snapToGrid: boolean
  playMode: boolean
}

export interface AppState {
  projects: Project[]
  activeProjectId: string | null
  view: AppView
  settings: AppSettings
}
