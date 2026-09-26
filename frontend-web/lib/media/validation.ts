const allowedExtensions: Record<string, string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "image/gif": ["gif"],
  "image/avif": ["avif"],
  "video/mp4": ["mp4"],
  "video/webm": ["webm"],
  "video/quicktime": ["mov"],
}

function positiveNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export const MAX_IMAGE_BYTES = positiveNumber(process.env.NEXT_PUBLIC_MEDIA_MAX_IMAGE_MB, 10) * 1024 * 1024
export const MAX_VIDEO_BYTES = positiveNumber(process.env.NEXT_PUBLIC_MEDIA_MAX_VIDEO_MB, 1024) * 1024 * 1024
export const MEDIA_ACCEPT = Object.keys(allowedExtensions).join(",")

function ascii(bytes: Uint8Array, start: number, length: number) {
  return String.fromCharCode(...bytes.slice(start, start + length))
}

function signatureMatches(mime: string, bytes: Uint8Array) {
  if (mime === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (mime === "image/png") return ascii(bytes, 1, 3) === "PNG" && bytes[0] === 0x89
  if (mime === "image/gif") return ascii(bytes, 0, 6) === "GIF87a" || ascii(bytes, 0, 6) === "GIF89a"
  if (mime === "image/webp") return ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP"
  if (mime === "image/avif") return ascii(bytes, 4, 4) === "ftyp" && ["avif", "avis"].includes(ascii(bytes, 8, 4))
  if (mime === "video/webm") return bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3
  if (mime === "video/mp4" || mime === "video/quicktime") return ascii(bytes, 4, 4) === "ftyp"
  return false
}

export async function validateMediaFile(file: File) {
  const extensions = allowedExtensions[file.type]
  if (!extensions) return "Chỉ chấp nhận JPG, PNG, WebP, GIF, AVIF, MP4, WebM hoặc MOV."

  const extension = file.name.split(".").pop()?.toLowerCase() ?? ""
  if (!extensions.includes(extension)) return `Phần mở rộng .${extension || "?"} không khớp loại tệp.`

  const image = file.type.startsWith("image/")
  const limit = image ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES
  if (file.size <= 0 || file.size > limit) {
    return `Tệp vượt giới hạn ${Math.round(limit / 1024 / 1024)} MB.`
  }

  const bytes = new Uint8Array(await file.slice(0, 32).arrayBuffer())
  if (!signatureMatches(file.type, bytes)) return "Nội dung tệp không khớp định dạng khai báo."
  return null
}
