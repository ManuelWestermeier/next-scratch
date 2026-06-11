import type { Project } from '../types'

const PROJECTS_KEY = 'scratchforge:projects'
const PROJECT_KEY = (id: string) => `scratchforge:project:${id}`

export const storage = {
  loadProjects(): Project[] {
    try {
      const index = localStorage.getItem(PROJECTS_KEY)
      if (!index) return []
      const ids: string[] = JSON.parse(index)
      const projects: Project[] = []
      for (const id of ids) {
        const raw = localStorage.getItem(PROJECT_KEY(id))
        if (raw) {
          try {
            projects.push(JSON.parse(raw))
          } catch {
            // skip corrupted
          }
        }
      }
      return projects
    } catch {
      return []
    }
  },

  saveProject(project: Project): void {
    try {
      // Update index
      const raw = localStorage.getItem(PROJECTS_KEY)
      const ids: string[] = raw ? JSON.parse(raw) : []
      if (!ids.includes(project.id)) ids.push(project.id)
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(ids))
      // Save project
      localStorage.setItem(PROJECT_KEY(project.id), JSON.stringify(project))
    } catch (e) {
      console.warn('Storage quota exceeded, attempting to free space', e)
      // Try to free space by removing old history snapshots
      try {
        const proj = { ...project, history: project.history.slice(0, 10) }
        localStorage.setItem(PROJECT_KEY(project.id), JSON.stringify(proj))
      } catch {
        console.error('Failed to save project')
      }
    }
  },

  deleteProject(id: string): void {
    try {
      const raw = localStorage.getItem(PROJECTS_KEY)
      const ids: string[] = raw ? JSON.parse(raw) : []
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(ids.filter(i => i !== id)))
      localStorage.removeItem(PROJECT_KEY(id))
    } catch {
      // ignore
    }
  },

  getStorageUsage(): { used: number; total: number } {
    let used = 0
    for (const key of Object.keys(localStorage)) {
      used += (localStorage.getItem(key) ?? '').length * 2
    }
    return { used, total: 5 * 1024 * 1024 } // ~5MB typical limit
  }
}
