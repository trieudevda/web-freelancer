const rawApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim()

export const API_BASE_URL = rawApiUrl ? rawApiUrl.replace(/\/+$/, "") : null
export const API_ENABLED = Boolean(API_BASE_URL)

export function apiUrl(path: string) {
  if (!API_BASE_URL) throw new Error("API chưa được cấu hình")
  return `${API_BASE_URL}/${path.replace(/^\/+/, "")}`
}

export function apiOrigin() {
  if (!API_BASE_URL) return null
  try {
    return new URL(API_BASE_URL).origin
  } catch {
    return null
  }
}
