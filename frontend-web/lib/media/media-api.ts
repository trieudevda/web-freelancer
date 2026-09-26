import { apiBlob, apiRequest } from "@/lib/api/client"
import { apiUrl } from "@/lib/api/config"
import type { MediaItem, MediaStatus } from "@/lib/media/types"

type ApiMedia = Omit<MediaItem, "source">
type SearchResult = { items: ApiMedia[]; meta: { page: number; limit: number; total: number; totalPages: number } }

function fromApi(item: ApiMedia): MediaItem {
  return { ...item, source: "api" }
}

export async function searchMedia(query = "", status: MediaStatus = "active") {
  const params = new URLSearchParams({ page: "1", limit: "100", status })
  if (query.trim()) params.set("q", query.trim().slice(0, 100))
  const result = await apiRequest<SearchResult>(`media?${params}`)
  return { ...result, items: result.items.map(fromApi) }
}

export async function uploadMedia(files: File[]) {
  if (files.length === 1) {
    const form = new FormData()
    form.append("file", files[0])
    form.append("title", files[0].name.replace(/\.[^.]+$/, "").slice(0, 255))
    return [fromApi(await apiRequest<ApiMedia>("media", { method: "POST", body: form }, 120_000))]
  }
  const form = new FormData()
  files.forEach((file) => form.append("files", file))
  const result = await apiRequest<{ items: ApiMedia[] }>("media/bulk", { method: "POST", body: form }, 180_000)
  return result.items.map(fromApi)
}

export async function updateMedia(id: string, value: { title: string; altText: string }) {
  return fromApi(await apiRequest<ApiMedia>(`media/${id}`, {
    method: "PATCH",
    body: JSON.stringify(value),
  }))
}

export async function replaceMedia(id: string, file: File) {
  const form = new FormData()
  form.append("file", file)
  const result = await apiRequest<{ media: ApiMedia }>(`media/${id}/file`, { method: "PUT", body: form }, 180_000)
  return fromApi(result.media)
}

export async function trashMedia(id: string) {
  return fromApi(await apiRequest<ApiMedia>(`media/${id}`, { method: "DELETE" }))
}

export async function restoreMedia(id: string) {
  return fromApi(await apiRequest<ApiMedia>(`media/${id}/restore`, { method: "POST" }))
}

export function mediaContent(id: string) {
  return apiBlob(`media/${id}/content`, 180_000)
}

export function mediaContentUrl(id: string) {
  return apiUrl(`media/${encodeURIComponent(id)}/content`)
}
