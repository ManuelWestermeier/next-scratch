import { useEffect } from 'react'
import { Dashboard } from '@/components/Dashboard'
import { Editor } from '@/components/Editor'
import { useAppStore } from '@/store/useAppStore'

export default function App() {
  const view = useAppStore((s) => s.view)
  const activeProjectId = useAppStore((s) => s.activeProjectId)
  const theme = useAppStore((s) => s.settings.theme)
  const snapshotProject = useAppStore((s) => s.snapshotProject)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.body.classList.toggle('bg-slate-950', theme === 'dark')
    document.body.classList.toggle('text-slate-100', theme === 'dark')
    document.body.classList.toggle('bg-white', theme === 'light')
    document.body.classList.toggle('text-slate-900', theme === 'light')
  }, [theme])

  useEffect(() => {
    const interval = window.setInterval(() => {
      const state = useAppStore.getState()
      state.projects.forEach((project) => {
        if (project.updatedAt > project.lastSnapshotAt) {
          snapshotProject(project.id, 'Auto-Snapshot')
        }
      })
    }, 30_000)
    return () => window.clearInterval(interval)
  }, [snapshotProject])

  if (view === 'dashboard' || !activeProjectId) return <Dashboard />
  return <Editor projectId={activeProjectId} />
}
