import JSZip from 'jszip'
import { Asset, Project } from '@/types'
import { blobToDataUrl, dataUrlToAssetBlob } from '@/lib/storage'

const fileNameSafe = (name: string) => name.replace(/[^a-z0-9._-]+/gi, '_').toLowerCase()

export const exportProjectZip = async (project: Project) => {
  const zip = new JSZip()
  const assetsFolder = zip.folder('assets')
  const assetManifest = await Promise.all(project.assets.map(async (asset) => {
    const blob = await dataUrlToAssetBlob(asset)
    const extension = asset.mimeType.split('/')[1] || 'bin'
    const fileName = `${fileNameSafe(asset.name)}_${asset.id}.${extension}`
    assetsFolder?.file(fileName, blob)
    return { ...asset, fileName }
  }))

  const serialisable: Project = {
    ...project,
    assets: assetManifest.map(({ fileName, ...asset }) => ({ ...asset })),
    history: project.history,
  }

  zip.file('project.json', JSON.stringify({
    project: serialisable,
    assetFiles: assetManifest.map((item) => ({ id: item.id, fileName: item.fileName })),
  }, null, 2))

  return zip.generateAsync({ type: 'blob' })
}

export const importProjectZip = async (file: File): Promise<Project> => {
  const zip = await JSZip.loadAsync(file)
  const projectJson = zip.file('project.json')
  if (!projectJson) throw new Error('project.json fehlt im Archiv')
  const raw = JSON.parse(await projectJson.async('string')) as { project: Project; assetFiles: { id: string; fileName: string }[] }
  const project = raw.project
  const assets: Asset[] = []
  for (const item of raw.assetFiles ?? []) {
    const fileEntry = zip.file(`assets/${item.fileName}`)
    if (!fileEntry) continue
    const blob = await fileEntry.async('blob')
    const dataUrl = await blobToDataUrl(blob)
    const source = project.assets.find((asset) => asset.id === item.id)
    if (source) assets.push({ ...source, dataUrl })
  }
  return { ...project, assets }
}
