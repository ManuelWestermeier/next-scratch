import { BlockNode, Project, Scene, Script } from '@/types'
import { uid } from '@/lib/id'

const block = (type: BlockNode['type'], label: string, args: Record<string, unknown> = {}, children: BlockNode[] = [], elseChildren?: BlockNode[]): BlockNode => ({
  id: uid('block'),
  type,
  label,
  args,
  children,
  elseChildren,
})

const setupScript: Script = {
  id: uid('script'),
  name: 'Setup',
  kind: 'setup',
  params: [],
  returnType: 'void',
  blocks: [
    block('VAR_CREATE', 'Variable erstellen', { name: 'score', value: 0 }),
    block('MOVE_TO', 'Position setzen', { target: 'selected', x: 280, y: 220 }),
  ],
}

const loopScript: Script = {
  id: uid('script'),
  name: 'Loop',
  kind: 'loop',
  params: [],
  returnType: 'void',
  blocks: [
    block('ROTATE', 'Drehen', { target: 'selected', degrees: 0.2 }),
  ],
}

const functionScript: Script = {
  id: uid('script'),
  name: 'Bounce',
  kind: 'function',
  params: ['target'],
  returnType: 'void',
  blocks: [
    block('GO_RIGHT', 'Bewege rechts', { target: 'selected', distance: 1.5 }),
    block('RETURN', 'Rückgabe', { value: null }),
  ],
}

const scene: Scene = {
  id: uid('scene'),
  name: 'Bühne 1',
  width: 960,
  height: 540,
  background: '#0f172a',
  gridSize: 24,
  objects: [
    {
      id: uid('obj'),
      name: 'Sprite',
      type: 'shape',
      x: 280,
      y: 220,
      w: 120,
      h: 120,
      r: 0,
      visible: true,
      layer: 1,
      shapeKind: 'rect',
      fill: '#6366f1',
      opacity: 1,
      speed: 3,
    },
    {
      id: uid('obj'),
      name: 'Kreis',
      type: 'shape',
      x: 480,
      y: 260,
      w: 100,
      h: 100,
      r: 0,
      visible: true,
      layer: 2,
      shapeKind: 'circle',
      fill: '#22c55e',
      opacity: 1,
      speed: 2,
    },
    {
      id: uid('obj'),
      name: 'Audio',
      type: 'audio',
      x: 680,
      y: 180,
      w: 120,
      h: 80,
      r: 0,
      visible: true,
      layer: 3,
      opacity: 1,
      speed: 0,
    },
  ],
  scripts: [setupScript, loopScript, functionScript],
  selectedObjectIds: [],
  variables: { score: 0 },
  lastUpdatedAt: Date.now(),
}

export const createSampleProject = (): Project => ({
  id: uid('project'),
  name: 'Neues Projekt',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  lastSnapshotAt: 0,
  scenes: [scene],
  activeSceneId: scene.id,
  assets: [],
  history: [],
})
