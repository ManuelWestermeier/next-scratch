import { useRef, useState } from 'react'
import { Download, FolderPlus, Import, Pencil, Play, Trash2, Copy } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { Button, Input, Panel } from '@/components/ui'
import { exportProjectZip, importProjectZip } from '@/lib/zip'

export const Dashboard = () => {
  const projects = useAppStore((s) => s.projects)
  const createProject = useAppStore((s) => s.createProject)
  const renameProject = useAppStore((s) => s.renameProject)
  const duplicateProject = useAppStore((s) => s.duplicateProject)
  const deleteProject = useAppStore((s) => s.deleteProject)
  const setActiveProject = useAppStore((s) => s.setActiveProject)
  const importProject = useAppStore((s) => s.importProject)
  const [name, setName] = useState('')
  const fileRef = useRef<HTMLInputElement | null>(null)

  const handleImport = async (file: File | null) => {
    if (!file) return
    const project = await importProjectZip(file)
    importProject(project)
  }

  const handleExport = async (projectId: string) => {
    const project = projects.find((item) => item.id === projectId)
    if (!project) return
    const blob = await exportProjectZip(project)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${project.name.replace(/\s+/g, '_').toLowerCase()}.zip`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-soft backdrop-blur">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-2xl font-semibold text-slate-100">Scratch Studio Pro</div>
            <div className="mt-1 text-sm text-slate-400">Komplett clientseitig · LocalStorage · ZIP Import/Export · 30 FPS Canvas Runtime</div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => fileRef.current?.click()}><Import size={16} className="mr-2" />Import ZIP</Button>
            <input ref={fileRef} type="file" accept=".zip" className="hidden" onChange={(e) => handleImport(e.target.files?.[0] ?? null)} />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Neues Projekt" />
          <Button variant="primary" onClick={() => { createProject(name.trim() || 'Neues Projekt'); setName('') }}>
            <FolderPlus size={16} className="mr-2" />Projekt erstellen
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => (
          <Panel key={project.id} className="overflow-hidden">
            <div className="border-b border-slate-800 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-slate-100">{project.name}</div>
                  <div className="text-xs text-slate-500">{project.scenes.length} Szenen · {project.assets.length} Assets · {project.history.length} Snapshots</div>
                </div>
                <div className="rounded-full border border-slate-800 px-2 py-1 text-[11px] uppercase tracking-wider text-slate-400">Aktiv</div>
              </div>
            </div>
            <div className="space-y-2 p-4">
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => setActiveProject(project.id)}><Play size={16} className="mr-2" />Öffnen</Button>
                <Button variant="ghost" onClick={() => duplicateProject(project.id)}><Copy size={16} className="mr-2" />Duplizieren</Button>
                <Button variant="ghost" onClick={() => handleExport(project.id)}><Download size={16} className="mr-2" />ZIP</Button>
                <Button variant="ghost" onClick={() => {
                  const next = prompt('Neuer Projektname', project.name)
                  if (next) renameProject(project.id, next)
                }}><Pencil size={16} className="mr-2" />Umbenennen</Button>
              </div>
              <Button variant="danger" onClick={() => deleteProject(project.id)} className="w-full"><Trash2 size={16} className="mr-2" />Löschen</Button>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  )
}
