import { parseDesign, type DesignData } from './design'

const rawFiles = import.meta.glob('../*-DESIGN.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

export const examples = Object.entries(rawFiles)
  .flatMap(([path, raw]) => {
    try {
      return [{
        id: path.split('/').pop() || path,
        data: parseDesign(raw),
      }]
    } catch {
      return []
    }
  })
  .sort((a, b) => a.data.name.localeCompare(b.data.name))

export type StoredDesign = {
  id: string
  data: DesignData
  updatedAt: number
}
