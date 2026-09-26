export type MediaStatus = "active" | "pending_delete"

export type MediaItem = {
  id: string
  originalName: string
  mimeType: string
  mediaType: "image" | "video"
  size: number
  title: string | null
  altText: string | null
  status: MediaStatus
  createdAt: string
  updatedAt?: string
  deletedAt?: string | null
  deleteAfter?: string | null
  source: "api" | "demo"
  assetUrl?: string
  blob?: Blob
}
