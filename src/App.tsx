import { useEffect } from 'react'
import { useProjectStore } from './store/projectStore'
import { ProjectsView } from './components/projects/ProjectsView'
import { EditorView } from './components/editor/EditorView'

export default function App() {
  const { editor, loadProjects } = useProjectStore()

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  return (
    <div className="h-screen w-screen overflow-hidden bg-surface-950 text-surface-100 font-sans">
      {editor.view === 'projects' ? <ProjectsView /> : <EditorView />}
    </div>
  )
}
