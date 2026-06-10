import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { AppSettings, AppState, Asset, BlockNode, HistorySnapshot, Project, Scene, SceneObject, Script } from '@/types'
import { createSampleProject } from '@/data/sample'
import { clone } from '@/lib/clone'
import { uid } from '@/lib/id'

const defaultSettings: AppSettings = {
  theme: 'dark',
  zoom: 1,
  panX: 0,
  panY: 0,
  snapToGrid: true,
  playMode: false,
}

const initialState: AppState = {
  projects: [createSampleProject()],
  activeProjectId: null,
  view: 'dashboard',
  settings: defaultSettings,
}

type Store = AppState & {
  setTheme: (theme: 'dark' | 'light') => void
  setView: (view: AppState['view']) => void
  setActiveProject: (projectId: string | null) => void
  setActiveScene: (sceneId: string) => void
  setZoom: (zoom: number) => void
  setPan: (x: number, y: number) => void
  setSnapToGrid: (value: boolean) => void
  setPlayMode: (value: boolean) => void

  createProject: (name?: string) => string
  importProject: (project: Project) => void
  renameProject: (projectId: string, name: string) => void
  duplicateProject: (projectId: string) => void
  deleteProject: (projectId: string) => void

  addScene: (name?: string) => string
  renameScene: (sceneId: string, name: string) => void
  updateScene: (sceneId: string, patch: Partial<Scene>) => void
  deleteScene: (sceneId: string) => void
  duplicateScene: (sceneId: string) => void

  createObject: (sceneId: string, type: SceneObject['type']) => string
  updateObject: (sceneId: string, objectId: string, patch: Partial<SceneObject>) => void
  deleteObject: (sceneId: string, objectId: string) => void
  duplicateObject: (sceneId: string, objectId: string) => void
  moveObjects: (sceneId: string, objectIds: string[], dx: number, dy: number, snap?: boolean) => void
  reorderObjects: (sceneId: string, orderedIds: string[]) => void
  selectObjects: (sceneId: string, ids: string[]) => void
  replaceScene: (sceneId: string, nextScene: Scene) => void

  addAsset: (projectId: string, asset: Asset) => void
  removeAsset: (projectId: string, assetId: string) => void

  createScript: (sceneId: string, kind: Script['kind'], name?: string) => string
  updateScript: (sceneId: string, scriptId: string, patch: Partial<Script>) => void
  deleteScript: (sceneId: string, scriptId: string) => void
  addBlock: (sceneId: string, scriptId: string, block: BlockNode, parentBlockId?: string, branch?: 'children' | 'elseChildren') => void
  updateBlock: (sceneId: string, scriptId: string, blockId: string, patch: Partial<BlockNode>) => void
  deleteBlock: (sceneId: string, scriptId: string, blockId: string) => void
  reorderBlocks: (sceneId: string, scriptId: string, orderedIds: string[], parentBlockId?: string, branch?: 'children' | 'elseChildren') => void

  snapshotProject: (projectId: string, label?: string) => void
  restoreSnapshot: (projectId: string, snapshotId: string) => void
  touchProject: (projectId: string) => void
}

const replaceById = <T extends { id: string }>(items: T[], item: T) => items.map((x) => (x.id === item.id ? item : x))

const findScene = (project: Project, sceneId: string) => project.scenes.find((scene) => scene.id === sceneId)
const findScript = (scene: Scene, scriptId: string) => scene.scripts.find((script) => script.id === scriptId)
const findBlockRecursive = (blocks: BlockNode[], blockId: string): BlockNode | null => {
  for (const block of blocks) {
    if (block.id === blockId) return block
    const child = findBlockRecursive(block.children, blockId)
    if (child) return child
    const elseChild = block.elseChildren ? findBlockRecursive(block.elseChildren, blockId) : null
    if (elseChild) return elseChild
  }
  return null
}

const removeBlockRecursive = (blocks: BlockNode[], blockId: string): BlockNode[] =>
  blocks
    .map((block) => {
      const children = removeBlockRecursive(block.children, blockId)
      const elseChildren = block.elseChildren ? removeBlockRecursive(block.elseChildren, blockId) : undefined
      return { ...block, children, elseChildren }
    })
    .filter((block) => block.id !== blockId)

const reorderBlockTree = (blocks: BlockNode[], orderedIds: string[]): BlockNode[] => {
  const map = new Map(blocks.map((block) => [block.id, block]))
  const ordered: BlockNode[] = []
  orderedIds.forEach((id) => {
    const item = map.get(id)
    if (item) ordered.push(item)
  })
  return ordered
}

const defaultScript = (kind: Script['kind'], name?: string): Script => ({
  id: uid('script'),
  name: name ?? (kind === 'function' ? 'Funktion' : kind === 'setup' ? 'Setup' : 'Loop'),
  kind,
  params: kind === 'function' ? ['value'] : [],
  returnType: 'void',
  blocks: [],
})

export const useAppStore = create<Store>()(
  persist(
    (set, get) => ({
      ...initialState,
      activeProjectId: initialState.projects[0].id,
      setTheme: (theme) => set((state) => ({ settings: { ...state.settings, theme } })),
      setView: (view) => set({ view }),
      setActiveProject: (projectId) => set({ activeProjectId: projectId, view: projectId ? 'editor' : 'dashboard' }),
      setActiveScene: (sceneId) => set((state) => {
        if (!state.activeProjectId) return {}
        return {
          projects: state.projects.map((project) =>
            project.id !== state.activeProjectId
              ? project
              : { ...project, activeSceneId: sceneId, updatedAt: Date.now() }
          ),
        }
      }),
      setZoom: (zoom) => set((state) => ({ settings: { ...state.settings, zoom } })),
      setPan: (x, y) => set((state) => ({ settings: { ...state.settings, panX: x, panY: y } })),
      setSnapToGrid: (value) => set((state) => ({ settings: { ...state.settings, snapToGrid: value } })),
      setPlayMode: (value) => set((state) => ({ settings: { ...state.settings, playMode: value } })),

      createProject: (name = 'Neues Projekt') => {
        const project: Project = createSampleProject()
        project.id = uid('project')
        project.name = name
        project.createdAt = Date.now()
        project.updatedAt = Date.now()
        project.lastSnapshotAt = 0
        set((state) => ({
          projects: [project, ...state.projects],
          activeProjectId: project.id,
          view: 'editor',
        }))
        return project.id
      },
      importProject: (project) => set((state) => {
        const existingIds = new Set(state.projects.map((item) => item.id))
        const importedId = project.id && !existingIds.has(project.id) ? project.id : uid('project')
        const imported = { ...project, id: importedId }
        return {
          projects: [imported, ...state.projects],
          activeProjectId: imported.id,
          view: 'editor',
        }
      }),
      renameProject: (projectId, name) => set((state) => ({
        projects: state.projects.map((project) => project.id === projectId ? { ...project, name, updatedAt: Date.now() } : project),
      })),
      duplicateProject: (projectId) => set((state) => {
        const source = state.projects.find((project) => project.id === projectId)
        if (!source) return state
        const copy = clone(source)
        copy.id = uid('project')
        copy.name = `${source.name} Kopie`
        copy.createdAt = Date.now()
        copy.updatedAt = Date.now()
        copy.lastSnapshotAt = 0
        copy.history = []
        copy.scenes = copy.scenes.map((scene) => ({ ...scene, id: uid('scene'), selectedObjectIds: [], lastUpdatedAt: Date.now(), objects: scene.objects.map((obj) => ({ ...obj, id: uid('obj') })), scripts: scene.scripts.map((script) => ({ ...script, id: uid('script'), blocks: script.blocks.map((block) => clone(block)) })) }))
        copy.assets = copy.assets.map((asset) => ({ ...asset, id: uid('asset') }))
        return { projects: [copy, ...state.projects] }
      }),
      deleteProject: (projectId) => set((state) => {
        const remaining = state.projects.filter((project) => project.id !== projectId)
        return {
          projects: remaining.length ? remaining : [createSampleProject()],
          activeProjectId: state.activeProjectId === projectId ? (remaining[0]?.id ?? null) : state.activeProjectId,
          view: remaining.length ? state.view : 'dashboard',
        }
      }),

      addScene: (name = 'Neue Szene') => {
        const sceneId = uid('scene')
        set((state) => {
          if (!state.activeProjectId) return {}
          return {
            projects: state.projects.map((project) => {
              if (project.id !== state.activeProjectId) return project
              const scene: Scene = {
                id: sceneId,
                name,
                width: 960,
                height: 540,
                background: '#0f172a',
                gridSize: 24,
                objects: [],
                scripts: [
                  defaultScript('setup', 'Setup'),
                  defaultScript('loop', 'Loop'),
                ],
                selectedObjectIds: [],
                variables: {},
                lastUpdatedAt: Date.now(),
              }
              return { ...project, scenes: [scene, ...project.scenes], activeSceneId: scene.id, updatedAt: Date.now() }
            }),
          }
        })
        return sceneId
      },
      renameScene: (sceneId, name) => set((state) => ({
        projects: state.projects.map((project) => ({
          ...project,
          scenes: project.scenes.map((scene) => scene.id === sceneId ? { ...scene, name, lastUpdatedAt: Date.now() } : scene),
          updatedAt: project.scenes.some((scene) => scene.id === sceneId) ? Date.now() : project.updatedAt,
        })),
      })),
      updateScene: (sceneId, patch) => set((state) => ({
        projects: state.projects.map((project) => {
          if (!project.scenes.some((scene) => scene.id === sceneId)) return project
          return {
            ...project,
            scenes: project.scenes.map((scene) => scene.id === sceneId ? { ...scene, ...patch, lastUpdatedAt: Date.now() } : scene),
            updatedAt: Date.now(),
          }
        }),
      })),
      deleteScene: (sceneId) => set((state) => ({
        projects: state.projects.map((project) => {
          if (!project.scenes.some((scene) => scene.id === sceneId)) return project
          const scenes = project.scenes.filter((scene) => scene.id !== sceneId)
          const fallback = scenes[0] ?? null
          return { ...project, scenes: scenes.length ? scenes : project.scenes, activeSceneId: fallback?.id ?? project.activeSceneId, updatedAt: Date.now() }
        }),
      })),
      duplicateScene: (sceneId) => set((state) => ({
        projects: state.projects.map((project) => {
          const source = project.scenes.find((scene) => scene.id === sceneId)
          if (!source) return project
          const copy = clone(source)
          copy.id = uid('scene')
          copy.name = `${source.name} Kopie`
          copy.objects = copy.objects.map((obj) => ({ ...obj, id: uid('obj') }))
          copy.scripts = copy.scripts.map((script) => ({ ...script, id: uid('script'), blocks: script.blocks.map((block) => clone(block)) }))
          copy.selectedObjectIds = []
          copy.lastUpdatedAt = Date.now()
          return { ...project, scenes: [copy, ...project.scenes], activeSceneId: copy.id, updatedAt: Date.now() }
        }),
      })),

      createObject: (sceneId, type) => {
        const objectId = uid('obj')
        set((state) => ({
          projects: state.projects.map((project) => {
            const scene = findScene(project, sceneId)
            if (!scene) return project
            const nextLayer = (scene.objects.reduce((m, obj) => Math.max(m, obj.layer), 0) ?? 0) + 1
            const object: SceneObject = {
              id: objectId,
              name: `${type === 'shape' ? 'Form' : type === 'image' ? 'Bild' : 'Audio'} ${scene.objects.length + 1}`,
              type,
              x: scene.width / 2 - 60,
              y: scene.height / 2 - 60,
              w: 120,
              h: 120,
              r: 0,
              visible: true,
              layer: nextLayer,
              shapeKind: 'rect',
              fill: type === 'shape' ? '#6366f1' : '#22c55e',
              opacity: 1,
              speed: 0,
            }
            return { ...project, scenes: project.scenes.map((s) => s.id === sceneId ? { ...scene, objects: [...scene.objects, object], selectedObjectIds: [object.id], lastUpdatedAt: Date.now() } : s), updatedAt: Date.now() }
          }),
        }))
        return objectId
      },
      updateObject: (sceneId, objectId, patch) => set((state) => ({
        projects: state.projects.map((project) => {
          const scene = findScene(project, sceneId)
          if (!scene) return project
          const objects = scene.objects.map((obj) => obj.id === objectId ? { ...obj, ...patch } : obj)
          return { ...project, scenes: project.scenes.map((s) => s.id === sceneId ? { ...scene, objects, lastUpdatedAt: Date.now() } : s), updatedAt: Date.now() }
        }),
      })),
      deleteObject: (sceneId, objectId) => set((state) => ({
        projects: state.projects.map((project) => {
          const scene = findScene(project, sceneId)
          if (!scene) return project
          return {
            ...project,
            scenes: project.scenes.map((s) => s.id === sceneId ? { ...scene, objects: scene.objects.filter((obj) => obj.id !== objectId), selectedObjectIds: scene.selectedObjectIds.filter((id) => id !== objectId), lastUpdatedAt: Date.now() } : s),
            updatedAt: Date.now(),
          }
        }),
      })),
      duplicateObject: (sceneId, objectId) => set((state) => ({
        projects: state.projects.map((project) => {
          const scene = findScene(project, sceneId)
          if (!scene) return project
          const source = scene.objects.find((obj) => obj.id === objectId)
          if (!source) return project
          const copy = { ...clone(source), id: uid('obj'), x: source.x + 24, y: source.y + 24, layer: source.layer + 1, name: `${source.name} Kopie` }
          const objects = [...scene.objects, copy].sort((a, b) => a.layer - b.layer)
          return { ...project, scenes: project.scenes.map((s) => s.id === sceneId ? { ...scene, objects, selectedObjectIds: [copy.id], lastUpdatedAt: Date.now() } : s), updatedAt: Date.now() }
        }),
      })),
      moveObjects: (sceneId, objectIds, dx, dy, snap = false) => set((state) => ({
        projects: state.projects.map((project) => {
          const scene = findScene(project, sceneId)
          if (!scene) return project
          const objects = scene.objects.map((obj) => {
            if (!objectIds.includes(obj.id)) return obj
            const x = obj.x + dx
            const y = obj.y + dy
            return { ...obj, x: snap ? Math.round(x / scene.gridSize) * scene.gridSize : x, y: snap ? Math.round(y / scene.gridSize) * scene.gridSize : y }
          })
          return { ...project, scenes: project.scenes.map((s) => s.id === sceneId ? { ...scene, objects, lastUpdatedAt: Date.now() } : s), updatedAt: Date.now() }
        }),
      })),
      reorderObjects: (sceneId, orderedIds) => set((state) => ({
        projects: state.projects.map((project) => {
          const scene = findScene(project, sceneId)
          if (!scene) return project
          const byId = new Map(scene.objects.map((obj) => [obj.id, obj]))
          const objects = orderedIds.map((id, index) => ({ ...byId.get(id)! , layer: index + 1 })).filter(Boolean) as SceneObject[]
          return { ...project, scenes: project.scenes.map((s) => s.id === sceneId ? { ...scene, objects, lastUpdatedAt: Date.now() } : s), updatedAt: Date.now() }
        }),
      })),
      selectObjects: (sceneId, ids) => set((state) => ({
        projects: state.projects.map((project) => {
          const scene = findScene(project, sceneId)
          if (!scene) return project
          return { ...project, scenes: project.scenes.map((s) => s.id === sceneId ? { ...scene, selectedObjectIds: ids, lastUpdatedAt: Date.now() } : s), updatedAt: Date.now() }
        }),
      })),
      replaceScene: (sceneId, nextScene) => set((state) => ({
        projects: state.projects.map((project) => project.scenes.some((scene) => scene.id === sceneId)
          ? { ...project, scenes: project.scenes.map((scene) => scene.id === sceneId ? { ...nextScene, lastUpdatedAt: Date.now() } : scene), updatedAt: Date.now() }
          : project),
      })),

      addAsset: (projectId, asset) => set((state) => ({
        projects: state.projects.map((project) => project.id === projectId ? { ...project, assets: [asset, ...project.assets], updatedAt: Date.now() } : project),
      })),
      removeAsset: (projectId, assetId) => set((state) => ({
        projects: state.projects.map((project) => {
          if (project.id !== projectId) return project
          return {
            ...project,
            assets: project.assets.filter((asset) => asset.id !== assetId),
            scenes: project.scenes.map((scene) => ({
              ...scene,
              objects: scene.objects.map((obj) => obj.assetId === assetId ? { ...obj, assetId: undefined } : obj),
            })),
            updatedAt: Date.now(),
          }
        }),
      })),

      createScript: (sceneId, kind, name) => {
        const script = defaultScript(kind, name)
        set((state) => ({
          projects: state.projects.map((project) => {
            const scene = findScene(project, sceneId)
            if (!scene) return project
            return {
              ...project,
              scenes: project.scenes.map((s) => s.id === sceneId ? { ...scene, scripts: [script, ...scene.scripts], lastUpdatedAt: Date.now() } : s),
              updatedAt: Date.now(),
            }
          }),
        }))
        return script.id
      },
      updateScript: (sceneId, scriptId, patch) => set((state) => ({
        projects: state.projects.map((project) => {
          const scene = findScene(project, sceneId)
          if (!scene) return project
          const scripts = scene.scripts.map((script) => script.id === scriptId ? { ...script, ...patch } : script)
          return { ...project, scenes: project.scenes.map((s) => s.id === sceneId ? { ...scene, scripts, lastUpdatedAt: Date.now() } : s), updatedAt: Date.now() }
        }),
      })),
      deleteScript: (sceneId, scriptId) => set((state) => ({
        projects: state.projects.map((project) => {
          const scene = findScene(project, sceneId)
          if (!scene) return project
          return { ...project, scenes: project.scenes.map((s) => s.id === sceneId ? { ...scene, scripts: scene.scripts.filter((script) => script.id !== scriptId), lastUpdatedAt: Date.now() } : s), updatedAt: Date.now() }
        }),
      })),
      addBlock: (sceneId, scriptId, block, parentBlockId, branch = 'children') => set((state) => ({
        projects: state.projects.map((project) => {
          const scene = findScene(project, sceneId)
          if (!scene) return project
          const script = findScript(scene, scriptId)
          if (!script) return project

          const insertInto = (blocks: BlockNode[]): BlockNode[] => {
            if (!parentBlockId) return [...blocks, block]
            return blocks.map((current) => {
              if (current.id === parentBlockId) {
                const target = branch === 'elseChildren' ? (current.elseChildren ?? []) : current.children
                const next = branch === 'elseChildren' ? { ...current, elseChildren: [...target, block] } : { ...current, children: [...target, block] }
                return next
              }
              return {
                ...current,
                children: insertInto(current.children),
                elseChildren: current.elseChildren ? insertInto(current.elseChildren) : undefined,
              }
            })
          }

          const scripts = scene.scripts.map((item) => item.id === scriptId ? { ...item, blocks: insertInto(item.blocks) } : item)
          return { ...project, scenes: project.scenes.map((s) => s.id === sceneId ? { ...scene, scripts, lastUpdatedAt: Date.now() } : s), updatedAt: Date.now() }
        }),
      })),
      updateBlock: (sceneId, scriptId, blockId, patch) => set((state) => ({
        projects: state.projects.map((project) => {
          const scene = findScene(project, sceneId)
          if (!scene) return project
          const mutate = (blocks: BlockNode[]): BlockNode[] =>
            blocks.map((block) => {
              if (block.id === blockId) return { ...block, ...patch }
              return {
                ...block,
                children: mutate(block.children),
                elseChildren: block.elseChildren ? mutate(block.elseChildren) : undefined,
              }
            })
          return { ...project, scenes: project.scenes.map((s) => s.id === sceneId ? { ...scene, scripts: scene.scripts.map((script) => script.id === scriptId ? { ...script, blocks: mutate(script.blocks), } : script), lastUpdatedAt: Date.now() } : s), updatedAt: Date.now() }
        }),
      })),
      deleteBlock: (sceneId, scriptId, blockId) => set((state) => ({
        projects: state.projects.map((project) => {
          const scene = findScene(project, sceneId)
          if (!scene) return project
          const scripts = scene.scripts.map((script) => script.id === scriptId ? { ...script, blocks: removeBlockRecursive(script.blocks, blockId) } : script)
          return { ...project, scenes: project.scenes.map((s) => s.id === sceneId ? { ...scene, scripts, lastUpdatedAt: Date.now() } : s), updatedAt: Date.now() }
        }),
      })),
      reorderBlocks: (sceneId, scriptId, orderedIds, parentBlockId, branch = 'children') => set((state) => ({
        projects: state.projects.map((project) => {
          const scene = findScene(project, sceneId)
          if (!scene) return project
          const reorderIn = (blocks: BlockNode[]): BlockNode[] => {
            if (!parentBlockId) return reorderBlockTree(blocks, orderedIds)
            return blocks.map((block) => {
              if (block.id === parentBlockId) {
                return branch === 'elseChildren'
                  ? { ...block, elseChildren: reorderBlockTree(block.elseChildren ?? [], orderedIds) }
                  : { ...block, children: reorderBlockTree(block.children, orderedIds) }
              }
              return {
                ...block,
                children: reorderIn(block.children),
                elseChildren: block.elseChildren ? reorderIn(block.elseChildren) : undefined,
              }
            })
          }
          const scripts = scene.scripts.map((script) => script.id === scriptId ? { ...script, blocks: reorderIn(script.blocks) } : script)
          return { ...project, scenes: project.scenes.map((s) => s.id === sceneId ? { ...scene, scripts, lastUpdatedAt: Date.now() } : s), updatedAt: Date.now() }
        }),
      })),

      snapshotProject: (projectId, label = 'Auto-Snapshot') => set((state) => ({
        projects: state.projects.map((project) => {
          if (project.id !== projectId) return project
          const projectData = clone({ ...project, history: [] })
          const snapshot: HistorySnapshot = {
            id: uid('snap'),
            ts: Date.now(),
            label,
            sceneId: project.activeSceneId,
            projectData,
          }
          const history = [snapshot, ...project.history].slice(0, 50)
          return { ...project, history, lastSnapshotAt: Date.now(), updatedAt: Date.now() }
        }),
      })),
      restoreSnapshot: (projectId, snapshotId) => set((state) => ({
        projects: state.projects.map((project) => {
          if (project.id !== projectId) return project
          const snapshot = project.history.find((item) => item.id === snapshotId)
          if (!snapshot) return project
          const restored = clone(snapshot.projectData)
          return {
            ...restored,
            id: project.id,
            name: project.name,
            createdAt: project.createdAt,
            history: project.history,
            lastSnapshotAt: project.lastSnapshotAt,
            updatedAt: Date.now(),
          }
        }),
      })),
      touchProject: (projectId) => set((state) => ({
        projects: state.projects.map((project) => project.id === projectId ? { ...project, updatedAt: Date.now() } : project),
      })),
    }),
    {
      name: 'scratch-studio-pro-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        projects: state.projects,
        activeProjectId: state.activeProjectId,
        view: state.view,
        settings: state.settings,
      }),
      version: 1,
      merge: (persisted, current) => {
        const data = persisted as Partial<AppState> | undefined
        if (!data?.projects?.length) return current
        return {
          ...current,
          ...data,
          settings: { ...current.settings, ...data.settings },
        }
      },
    },
  ),
)

export const getActiveProject = () => {
  const state = useAppStore.getState()
  return state.projects.find((project) => project.id === state.activeProjectId) ?? null
}

export const getActiveScene = () => {
  const project = getActiveProject()
  if (!project) return null
  return project.scenes.find((scene) => scene.id === project.activeSceneId) ?? project.scenes[0] ?? null
}
