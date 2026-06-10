import { Asset, Project } from '@/types'

export const STORAGE_KEY = 'scratch-studio-pro:v1'

export interface PersistedState {
  projects: Project[]
  activeProjectId: string | null
  theme: 'dark' | 'light'
}

export const readStorage = (): PersistedState | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) as PersistedState : null
  } catch {
    return null
  }
}

export const writeStorage = (state: PersistedState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export const dataUrlToAssetBlob = async (asset: Asset): Promise<Blob> => {
  const res = await fetch(asset.dataUrl)
  return res.blob()
}

export const blobToDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader()
  reader.onerror = () => reject(new Error('FileReader failed'))
  reader.onload = () => resolve(String(reader.result))
  reader.readAsDataURL(blob)
})
