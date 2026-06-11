import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type {
  Project, Scene, Asset, HistorySnapshot, SceneObject,
  Block, BlockScript, VariableDeclaration, FunctionDeclaration,
  EditorState, CanvasTransform, BlockType
} from '../types'
import { storage } from '../utils/storage'
import { createDefaultScene } from '../utils/defaults'

// ─── Project Store ────────────────────────────────────────────────────────────

interface ProjectStore {
  projects: Project[]
  editor: EditorState

  // Project CRUD
  loadProjects: () => void
  createProject: (name: string) => Project
  deleteProject: (id: string) => void
  duplicateProject: (id: string) => Project
  renameProject: (id: string, name: string) => void
  openProject: (id: string) => void
  closeProject: () => void
  getActiveProject: () => Project | null

  // Scene management
  createScene: (projectId: string, name: string) => Scene
  deleteScene: (projectId: string, sceneId: string) => void
  renameScene: (projectId: string, sceneId: string, name: string) => void
  setActiveScene: (sceneId: string) => void
  getActiveScene: () => Scene | null

  // Object management
  addObject: (obj: SceneObject) => void
  updateObject: (id: string, changes: Partial<SceneObject>) => void
  deleteObject: (id: string) => void
  duplicateObject: (id: string) => void
  setSelectedObjects: (ids: string[]) => void
  bringForward: (id: string) => void
  sendBackward: (id: string) => void

  // Asset management
  addAsset: (asset: Asset) => void
  deleteAsset: (id: string) => void
  getAssets: () => Asset[]

  // Block/Script management
  addScript: (script: BlockScript) => void
  updateScript: (scriptId: string, blocks: Block[]) => void
  deleteScript: (scriptId: string) => void
  getScriptsForObject: (objectId: string) => BlockScript[]

  // Variable management
  addVariable: (v: VariableDeclaration) => void
  updateVariable: (id: string, changes: Partial<VariableDeclaration>) => void
  deleteVariable: (id: string) => void

  // Function management
  addFunction: (f: FunctionDeclaration) => void
  updateFunction: (id: string, changes: Partial<FunctionDeclaration>) => void
  deleteFunction: (id: string) => void

  // History
  saveSnapshot: (label?: string) => void
  restoreSnapshot: (snapshotId: string) => void
  getHistory: () => HistorySnapshot[]

  // Editor state
  setEditorState: (changes: Partial<EditorState>) => void
  setCanvasTransform: (t: Partial<CanvasTransform>) => void
  setActiveTab: (tab: EditorState['activeTab']) => void
  toggleGrid: () => void
  toggleGridSnap: () => void
  setPlaying: (v: boolean) => void
  setDirty: (v: boolean) => void

  // Persistence
  saveProject: (project: Project) => void
  exportProject: (id: string) => Promise<Blob>
  importProject: (blob: Blob) => Promise<Project>
}

const initialEditorState: EditorState = {
  view: 'projects',
  activeProjectId: null,
  activeSceneId: null,
  selectedObjectIds: [],
  selectedBlockId: null,
  canvasTransform: { x: 0, y: 0, scale: 1 },
  gridSnap: true,
  gridSize: 20,
  showGrid: true,
  isPlaying: false,
  isDirty: false,
  activeTab: 'scene',
  draggedBlockType: null,
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  editor: initialEditorState,

  loadProjects: () => {
    const projects = storage.loadProjects()
    set({ projects })
  },

  createProject: (name) => {
    const scene = createDefaultScene()
    const project: Project = {
      id: uuidv4(),
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      scenes: [scene],
      assets: [],
      history: [],
      activeSceneId: scene.id,
      variables: [],
      functions: [],
    }
    set(s => ({ projects: [...s.projects, project] }))
    storage.saveProject(project)
    return project
  },

  deleteProject: (id) => {
    set(s => ({ projects: s.projects.filter(p => p.id !== id) }))
    storage.deleteProject(id)
  },

  duplicateProject: (id) => {
    const src = get().projects.find(p => p.id === id)
    if (!src) throw new Error('Project not found')
    const scene = createDefaultScene()
    const dup: Project = {
      ...JSON.parse(JSON.stringify(src)),
      id: uuidv4(),
      name: `${src.name} (Kopie)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      history: [],
    }
    set(s => ({ projects: [...s.projects, dup] }))
    storage.saveProject(dup)
    return dup
  },

  renameProject: (id, name) => {
    set(s => ({
      projects: s.projects.map(p => p.id === id ? { ...p, name, updatedAt: Date.now() } : p)
    }))
    const p = get().projects.find(p => p.id === id)
    if (p) storage.saveProject(p)
  },

  openProject: (id) => {
    const project = get().projects.find(p => p.id === id)
    if (!project) return
    set(s => ({
      editor: {
        ...s.editor,
        view: 'editor',
        activeProjectId: id,
        activeSceneId: project.activeSceneId || project.scenes[0]?.id || null,
        selectedObjectIds: [],
        isDirty: false,
      }
    }))
  },

  closeProject: () => {
    set(s => ({
      editor: { ...s.editor, view: 'projects', activeProjectId: null, activeSceneId: null }
    }))
  },

  getActiveProject: () => {
    const { activeProjectId } = get().editor
    if (!activeProjectId) return null
    return get().projects.find(p => p.id === activeProjectId) ?? null
  },

  createScene: (projectId, name) => {
    const scene = createDefaultScene(name)
    set(s => ({
      projects: s.projects.map(p =>
        p.id === projectId ? { ...p, scenes: [...p.scenes, scene], updatedAt: Date.now() } : p
      )
    }))
    const proj = get().projects.find(p => p.id === projectId)
    if (proj) storage.saveProject(proj)
    return scene
  },

  deleteScene: (projectId, sceneId) => {
    set(s => ({
      projects: s.projects.map(p => {
        if (p.id !== projectId) return p
        const scenes = p.scenes.filter(sc => sc.id !== sceneId)
        return { ...p, scenes, updatedAt: Date.now() }
      })
    }))
    const proj = get().projects.find(p => p.id === projectId)
    if (proj) storage.saveProject(proj)
  },

  renameScene: (projectId, sceneId, name) => {
    set(s => ({
      projects: s.projects.map(p =>
        p.id !== projectId ? p : {
          ...p,
          scenes: p.scenes.map(sc => sc.id === sceneId ? { ...sc, name } : sc),
          updatedAt: Date.now()
        }
      )
    }))
    const proj = get().projects.find(p => p.id === projectId)
    if (proj) storage.saveProject(proj)
  },

  setActiveScene: (sceneId) => {
    const { activeProjectId } = get().editor
    if (!activeProjectId) return
    set(s => ({
      editor: { ...s.editor, activeSceneId: sceneId, selectedObjectIds: [] },
      projects: s.projects.map(p =>
        p.id === activeProjectId ? { ...p, activeSceneId: sceneId } : p
      )
    }))
  },

  getActiveScene: () => {
    const { activeProjectId, activeSceneId } = get().editor
    if (!activeProjectId || !activeSceneId) return null
    const proj = get().projects.find(p => p.id === activeProjectId)
    return proj?.scenes.find(s => s.id === activeSceneId) ?? null
  },

  addObject: (obj) => {
    const { activeProjectId, activeSceneId } = get().editor
    if (!activeProjectId || !activeSceneId) return
    set(s => ({
      projects: s.projects.map(p =>
        p.id !== activeProjectId ? p : {
          ...p,
          scenes: p.scenes.map(sc =>
            sc.id !== activeSceneId ? sc : { ...sc, objects: [...sc.objects, obj] }
          ),
          updatedAt: Date.now()
        }
      ),
      editor: { ...s.editor, isDirty: true }
    }))
    const proj = get().projects.find(p => p.id === activeProjectId)
    if (proj) storage.saveProject(proj)
  },

  updateObject: (id, changes) => {
    const { activeProjectId, activeSceneId } = get().editor
    if (!activeProjectId || !activeSceneId) return
    set(s => ({
      projects: s.projects.map(p =>
        p.id !== activeProjectId ? p : {
          ...p,
          scenes: p.scenes.map(sc =>
            sc.id !== activeSceneId ? sc : {
              ...sc,
              objects: sc.objects.map(o =>
                o.id === id ? { ...o, ...changes } as SceneObject : o
              )
            }
          ),
          updatedAt: Date.now()
        }
      ),
      editor: { ...s.editor, isDirty: true }
    }))
    const proj = get().projects.find(p => p.id === activeProjectId)
    if (proj) storage.saveProject(proj)
  },

  deleteObject: (id) => {
    const { activeProjectId, activeSceneId } = get().editor
    if (!activeProjectId || !activeSceneId) return
    set(s => ({
      projects: s.projects.map(p =>
        p.id !== activeProjectId ? p : {
          ...p,
          scenes: p.scenes.map(sc =>
            sc.id !== activeSceneId ? sc : {
              ...sc,
              objects: sc.objects.filter(o => o.id !== id)
            }
          ),
          updatedAt: Date.now()
        }
      ),
      editor: {
        ...s.editor,
        selectedObjectIds: s.editor.selectedObjectIds.filter(sid => sid !== id),
        isDirty: true
      }
    }))
    const proj = get().projects.find(p => p.id === activeProjectId)
    if (proj) storage.saveProject(proj)
  },

  duplicateObject: (id) => {
    const scene = get().getActiveScene()
    if (!scene) return
    const obj = scene.objects.find(o => o.id === id)
    if (!obj) return
    const dup: SceneObject = { ...JSON.parse(JSON.stringify(obj)), id: uuidv4(), name: `${obj.name} (Kopie)`, x: obj.x + 20, y: obj.y + 20 }
    get().addObject(dup)
  },

  setSelectedObjects: (ids) => {
    set(s => ({ editor: { ...s.editor, selectedObjectIds: ids } }))
  },

  bringForward: (id) => {
    const scene = get().getActiveScene()
    if (!scene) return
    const obj = scene.objects.find(o => o.id === id)
    if (!obj) return
    get().updateObject(id, { layer: obj.layer + 1 })
  },

  sendBackward: (id) => {
    const scene = get().getActiveScene()
    if (!scene) return
    const obj = scene.objects.find(o => o.id === id)
    if (!obj) return
    get().updateObject(id, { layer: Math.max(0, obj.layer - 1) })
  },

  addAsset: (asset) => {
    const { activeProjectId } = get().editor
    if (!activeProjectId) return
    set(s => ({
      projects: s.projects.map(p =>
        p.id !== activeProjectId ? p : { ...p, assets: [...p.assets, asset], updatedAt: Date.now() }
      )
    }))
    const proj = get().projects.find(p => p.id === activeProjectId)
    if (proj) storage.saveProject(proj)
  },

  deleteAsset: (id) => {
    const { activeProjectId } = get().editor
    if (!activeProjectId) return
    set(s => ({
      projects: s.projects.map(p =>
        p.id !== activeProjectId ? p : { ...p, assets: p.assets.filter(a => a.id !== id), updatedAt: Date.now() }
      )
    }))
    const proj = get().projects.find(p => p.id === activeProjectId)
    if (proj) storage.saveProject(proj)
  },

  getAssets: () => {
    const proj = get().getActiveProject()
    return proj?.assets ?? []
  },

  addScript: (script) => {
    const { activeProjectId, activeSceneId } = get().editor
    if (!activeProjectId || !activeSceneId) return
    set(s => ({
      projects: s.projects.map(p =>
        p.id !== activeProjectId ? p : {
          ...p,
          scenes: p.scenes.map(sc =>
            sc.id !== activeSceneId ? sc : { ...sc, scripts: [...sc.scripts, script] }
          ),
          updatedAt: Date.now()
        }
      ),
      editor: { ...s.editor, isDirty: true }
    }))
    const proj = get().projects.find(p => p.id === activeProjectId)
    if (proj) storage.saveProject(proj)
  },

  updateScript: (scriptId, blocks) => {
    const { activeProjectId, activeSceneId } = get().editor
    if (!activeProjectId || !activeSceneId) return
    set(s => ({
      projects: s.projects.map(p =>
        p.id !== activeProjectId ? p : {
          ...p,
          scenes: p.scenes.map(sc =>
            sc.id !== activeSceneId ? sc : {
              ...sc,
              scripts: sc.scripts.map(scr => scr.id === scriptId ? { ...scr, blocks } : scr)
            }
          ),
          updatedAt: Date.now()
        }
      ),
      editor: { ...s.editor, isDirty: true }
    }))
    const proj = get().projects.find(p => p.id === activeProjectId)
    if (proj) storage.saveProject(proj)
  },

  deleteScript: (scriptId) => {
    const { activeProjectId, activeSceneId } = get().editor
    if (!activeProjectId || !activeSceneId) return
    set(s => ({
      projects: s.projects.map(p =>
        p.id !== activeProjectId ? p : {
          ...p,
          scenes: p.scenes.map(sc =>
            sc.id !== activeSceneId ? sc : {
              ...sc,
              scripts: sc.scripts.filter(scr => scr.id !== scriptId)
            }
          ),
          updatedAt: Date.now()
        }
      )
    }))
    const proj = get().projects.find(p => p.id === activeProjectId)
    if (proj) storage.saveProject(proj)
  },

  getScriptsForObject: (objectId) => {
    const scene = get().getActiveScene()
    return scene?.scripts.filter(s => s.objectId === objectId) ?? []
  },

  addVariable: (v) => {
    const { activeProjectId } = get().editor
    if (!activeProjectId) return
    set(s => ({
      projects: s.projects.map(p =>
        p.id !== activeProjectId ? p : { ...p, variables: [...p.variables, v] }
      )
    }))
    const proj = get().projects.find(p => p.id === activeProjectId)
    if (proj) storage.saveProject(proj)
  },

  updateVariable: (id, changes) => {
    const { activeProjectId } = get().editor
    if (!activeProjectId) return
    set(s => ({
      projects: s.projects.map(p =>
        p.id !== activeProjectId ? p : {
          ...p,
          variables: p.variables.map(v => v.id === id ? { ...v, ...changes } : v)
        }
      )
    }))
    const proj = get().projects.find(p => p.id === activeProjectId)
    if (proj) storage.saveProject(proj)
  },

  deleteVariable: (id) => {
    const { activeProjectId } = get().editor
    if (!activeProjectId) return
    set(s => ({
      projects: s.projects.map(p =>
        p.id !== activeProjectId ? p : { ...p, variables: p.variables.filter(v => v.id !== id) }
      )
    }))
    const proj = get().projects.find(p => p.id === activeProjectId)
    if (proj) storage.saveProject(proj)
  },

  addFunction: (f) => {
    const { activeProjectId } = get().editor
    if (!activeProjectId) return
    set(s => ({
      projects: s.projects.map(p =>
        p.id !== activeProjectId ? p : { ...p, functions: [...p.functions, f] }
      )
    }))
    const proj = get().projects.find(p => p.id === activeProjectId)
    if (proj) storage.saveProject(proj)
  },

  updateFunction: (id, changes) => {
    const { activeProjectId } = get().editor
    if (!activeProjectId) return
    set(s => ({
      projects: s.projects.map(p =>
        p.id !== activeProjectId ? p : {
          ...p,
          functions: p.functions.map(f => f.id === id ? { ...f, ...changes } : f)
        }
      )
    }))
    const proj = get().projects.find(p => p.id === activeProjectId)
    if (proj) storage.saveProject(proj)
  },

  deleteFunction: (id) => {
    const { activeProjectId } = get().editor
    if (!activeProjectId) return
    set(s => ({
      projects: s.projects.map(p =>
        p.id !== activeProjectId ? p : { ...p, functions: p.functions.filter(f => f.id !== id) }
      )
    }))
    const proj = get().projects.find(p => p.id === activeProjectId)
    if (proj) storage.saveProject(proj)
  },

  saveSnapshot: (label = 'Auto-Snapshot') => {
    const { activeProjectId } = get().editor
    if (!activeProjectId) return
    const proj = get().projects.find(p => p.id === activeProjectId)
    if (!proj) return
    const snapshot: HistorySnapshot = {
      id: uuidv4(),
      timestamp: Date.now(),
      label,
      scenes: JSON.parse(JSON.stringify(proj.scenes)),
      assets: proj.assets.map(a => ({ ...a, dataUrl: '' })), // don't snapshot full assets
    }
    set(s => ({
      projects: s.projects.map(p =>
        p.id !== activeProjectId ? p : {
          ...p,
          history: [snapshot, ...p.history].slice(0, 50),
          updatedAt: Date.now()
        }
      )
    }))
    const updated = get().projects.find(p => p.id === activeProjectId)
    if (updated) storage.saveProject(updated)
  },

  restoreSnapshot: (snapshotId) => {
    const { activeProjectId } = get().editor
    if (!activeProjectId) return
    const proj = get().projects.find(p => p.id === activeProjectId)
    if (!proj) return
    const snap = proj.history.find(h => h.id === snapshotId)
    if (!snap) return
    set(s => ({
      projects: s.projects.map(p =>
        p.id !== activeProjectId ? p : {
          ...p,
          scenes: JSON.parse(JSON.stringify(snap.scenes)),
          updatedAt: Date.now()
        }
      )
    }))
    const updated = get().projects.find(p => p.id === activeProjectId)
    if (updated) storage.saveProject(updated)
  },

  getHistory: () => {
    const proj = get().getActiveProject()
    return proj?.history ?? []
  },

  setEditorState: (changes) => {
    set(s => ({ editor: { ...s.editor, ...changes } }))
  },

  setCanvasTransform: (t) => {
    set(s => ({ editor: { ...s.editor, canvasTransform: { ...s.editor.canvasTransform, ...t } } }))
  },

  setActiveTab: (tab) => {
    set(s => ({ editor: { ...s.editor, activeTab: tab } }))
  },

  toggleGrid: () => {
    set(s => ({ editor: { ...s.editor, showGrid: !s.editor.showGrid } }))
  },

  toggleGridSnap: () => {
    set(s => ({ editor: { ...s.editor, gridSnap: !s.editor.gridSnap } }))
  },

  setPlaying: (v) => {
    set(s => ({ editor: { ...s.editor, isPlaying: v } }))
  },

  setDirty: (v) => {
    set(s => ({ editor: { ...s.editor, isDirty: v } }))
  },

  saveProject: (project) => {
    storage.saveProject(project)
  },

  exportProject: async (id) => {
    const JSZip = (await import('jszip')).default
    const proj = get().projects.find(p => p.id === id)
    if (!proj) throw new Error('Project not found')
    const zip = new JSZip()
    const data = JSON.parse(JSON.stringify(proj))
    zip.file('project.json', JSON.stringify(data, null, 2))
    return zip.generateAsync({ type: 'blob' })
  },

  importProject: async (blob) => {
    const JSZip = (await import('jszip')).default
    const zip = await JSZip.loadAsync(blob)
    const json = await zip.file('project.json')?.async('string')
    if (!json) throw new Error('Invalid ZIP: no project.json')
    const proj: Project = JSON.parse(json)
    proj.id = uuidv4()
    proj.name = `${proj.name} (Import)`
    proj.createdAt = Date.now()
    proj.updatedAt = Date.now()
    set(s => ({ projects: [...s.projects, proj] }))
    storage.saveProject(proj)
    return proj
  },
}))
