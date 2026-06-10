import { useMemo, useState } from 'react'
import { ArrowLeft, Copy, Download, Plus, MoonStar, SunMedium, Layers3, Image, Blocks } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { Button, Input, Panel, SectionTitle } from '@/components/ui'
import { SceneCanvas } from '@/components/SceneCanvas'
import { PropertiesPanel } from '@/components/PropertiesPanel'
import { BlocksPanel } from '@/components/BlocksPanel'
import { AssetsPanel } from '@/components/AssetsPanel'
import { exportProjectZip } from '@/lib/zip'

type Tab = 'objects' | 'blocks' | 'assets'

export const Editor = ({ projectId }: { projectId: string }) => {
  const project = useAppStore((s) => s.projects.find((item) => item.id === projectId) ?? null)
  const renameProject = useAppStore((s) => s.renameProject)
  const duplicateProject = useAppStore((s) => s.duplicateProject)
  const setActiveProject = useAppStore((s) => s.setActiveProject)
  const setTheme = useAppStore((s) => s.setTheme)
  const theme = useAppStore((s) => s.settings.theme)
  const createScene = useAppStore((s) => s.addScene)
  const renameScene = useAppStore((s) => s.renameScene)
  const deleteScene = useAppStore((s) => s.deleteScene)
  const duplicateScene = useAppStore((s) => s.duplicateScene)
  const setActiveScene = useAppStore((s) => s.setActiveScene)
  const updateScene = useAppStore((s) => s.updateScene)
  const [tab, setTab] = useState<Tab>('objects')

  const scene = useMemo(() => {
    if (!project) return null
    return project.scenes.find((item) => item.id === project.activeSceneId) ?? project.scenes[0] ?? null
  }, [project])

  if (!project || !scene) return null

  const handleExport = async () => {
    const blob = await exportProjectZip(project)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${project.name.replace(/\s+/g, '_').toLowerCase()}.zip`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-[1800px] flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Button variant="ghost" onClick={() => setActiveProject(null)}><ArrowLeft size={16} className="mr-2" />Dashboard</Button>
            <div className="min-w-0 flex-1">
              <Input value={project.name} onChange={(e) => renameProject(project.id, e.target.value)} className="max-w-md" />
            </div>
            <Button variant="ghost" onClick={() => duplicateProject(project.id)}><Copy size={16} /></Button>
            <Button variant="ghost" onClick={handleExport}><Download size={16} /></Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? <SunMedium size={16} className="mr-2" /> : <MoonStar size={16} className="mr-2" />}
              {theme === 'dark' ? 'Light' : 'Dark'}
            </Button>
            <Button variant="ghost" onClick={() => duplicateScene(scene.id)}><Layers3 size={16} className="mr-2" />Szene duplizieren</Button>
            <Button variant="primary" onClick={() => createScene('Neue Szene')}><Plus size={16} className="mr-2" />Szene</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[1800px] flex-1 gap-4 p-4 xl:grid-cols-[360px_minmax(0,1fr)_400px]">
        <aside className="flex min-h-0 flex-col gap-4">
          <Panel>
            <SectionTitle title="Szenen" action={<Button variant="ghost" onClick={() => createScene('Neue Szene')}><Plus size={16} /></Button>} />
            <div className="space-y-2 p-4">
              {project.scenes.map((item) => (
                <div
                  key={item.id}
                  className={`w-full rounded-2xl border px-3 py-3 text-left transition ${item.id === scene.id ? 'border-sky-500 bg-sky-500/10' : 'border-slate-800 bg-slate-950/60 hover:bg-slate-900'}`}
                >
                  <button type="button" className="w-full text-left" onClick={() => setActiveScene(item.id)}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-100">{item.name}</div>
                        <div className="text-xs text-slate-500">{item.objects.length} Objekte · {item.scripts.length} Skripte</div>
                      </div>
                    </div>
                  </button>
                  <div className="mt-2 flex gap-1">
                    <button type="button" className="rounded-lg border border-slate-800 px-2 py-1 text-xs text-slate-400" onClick={() => renameScene(item.id, prompt('Neuer Name', item.name) ?? item.name)}>R</button>
                    <button type="button" className="rounded-lg border border-slate-800 px-2 py-1 text-xs text-slate-400" onClick={() => duplicateScene(item.id)}>D</button>
                    <button type="button" className="rounded-lg border border-slate-800 px-2 py-1 text-xs text-rose-300" onClick={() => deleteScene(item.id)}>X</button>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="min-h-0 flex-1">
            <SectionTitle
              title="Editor"
              action={
                <div className="flex gap-1">
                  <Button variant={tab === 'objects' ? 'primary' : 'ghost'} onClick={() => setTab('objects')}><Image size={15} /></Button>
                  <Button variant={tab === 'blocks' ? 'primary' : 'ghost'} onClick={() => setTab('blocks')}><Blocks size={15} /></Button>
                  <Button variant={tab === 'assets' ? 'primary' : 'ghost'} onClick={() => setTab('assets')}><Layers3 size={15} /></Button>
                </div>
              }
            />
            <div className="min-h-0 flex-1 overflow-auto p-4">
              {tab === 'objects' && (
                <div className="space-y-2">
                  {scene.objects
                    .slice()
                    .sort((a, b) => a.layer - b.layer)
                    .map((object) => (
                      <button
                        key={object.id}
                        onClick={() => useAppStore.getState().selectObjects(scene.id, [object.id])}
                        className={`w-full rounded-2xl border px-3 py-3 text-left transition ${scene.selectedObjectIds.includes(object.id) ? 'border-sky-500 bg-sky-500/10' : 'border-slate-800 bg-slate-950/60 hover:bg-slate-900'}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-semibold">{object.name}</div>
                            <div className="text-xs text-slate-500">{object.type} · Layer {object.layer}</div>
                          </div>
                          <div className="text-xs text-slate-500">{object.visible ? 'Visible' : 'Hidden'}</div>
                        </div>
                      </button>
                    ))}
                  {!scene.objects.length && <div className="rounded-2xl border border-dashed border-slate-800 p-4 text-sm text-slate-500">Keine Objekte vorhanden.</div>}
                </div>
              )}
              {tab === 'blocks' && <BlocksPanel scene={scene} />}
              {tab === 'assets' && project && <AssetsPanel projectId={project.id} />}
            </div>
          </Panel>
        </aside>

        <section className="min-h-0">
          <SceneCanvas scene={scene} projectId={project.id} />
        </section>

        <aside className="min-h-0">
          <PropertiesPanel scene={scene} />
        </aside>
      </main>
    </div>
  )
}
