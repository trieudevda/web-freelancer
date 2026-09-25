import { apiUrl } from "@/lib/api/config"

type ApiEnvelope<T> = { success: true; data: T } | {
  success: false
  error?: { statusCode?: number; code?: string; message?: string; details?: string[] }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code = `HTTP_${status}`,
    public readonly details: string[] = []
  ) {
    super(message)
    this.name = "ApiError"
  }
}

function readCookie(name: string) {
  if (typeof document === "undefined") return null
  const prefix = `${encodeURIComponent(name)}=`
  const item = document.cookie.split("; ").find((cookie) => cookie.startsWith(prefix))
  return item ? decodeURIComponent(item.slice(prefix.length)) : null
}

function mutation(method: string) {
  return !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase())
}

async function parseError(response: Response) {
  let body: ApiEnvelope<never> | null = null
  try {
    body = await response.json() as ApiEnvelope<never>
  } catch {
    // A proxy can return HTML or an empty response. Do not render it as trusted content.
  }
  if (body && !body.success) {
    return new ApiError(
      body.error?.message ?? "Yêu cầu không thành công",
      response.status,
      body.error?.code,
      body.error?.details
    )
  }
  return new ApiError(`Yêu cầu không thành công (${response.status})`, response.status)
}

export async function apiRequest<T>(path: string, init: RequestInit = {}, timeoutMs = 15_000) {
  const method = (init.method ?? "GET").toUpperCase()
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  const abort = () => controller.abort()
  init.signal?.addEventListener("abort", abort, { once: true })
  const headers = new Headers(init.headers)
  headers.set("Accept", "application/json")

  if (mutation(method)) {
    const csrfToken = readCookie("csrf_token")
    if (csrfToken) headers.set("x-csrf-token", csrfToken)
  }

  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  try {
    const response = await fetch(apiUrl(path), {
      ...init,
      method,
      headers,
      credentials: "include",
      cache: "no-store",
      signal: controller.signal,
    })
    if (!response.ok) throw await parseError(response)
    const payload = await response.json() as ApiEnvelope<T>
    if (!payload.success) {
      throw new ApiError(payload.error?.message ?? "Yêu cầu không thành công", response.status, payload.error?.code, payload.error?.details)
    }
    return payload.data
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("Yêu cầu quá thời gian. Vui lòng thử lại.", 408, "CLIENT_TIMEOUT")
    }
    throw new ApiError("Không thể kết nối máy chủ API.", 0, "NETWORK_ERROR")
  } finally {
    window.clearTimeout(timer)
    init.signal?.removeEventListener("abort", abort)
  }
}

export async function apiBlob(path: string, timeoutMs = 60_000) {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(apiUrl(path), {
      credentials: "include",
      cache: "no-store",
      signal: controller.signal,
      headers: { Accept: "image/*,video/*,application/octet-stream" },
    })
    if (!response.ok) throw await parseError(response)
    return response.blob()
  } finally {
    window.clearTimeout(timer)
  }
}
