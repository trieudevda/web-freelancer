"use client"

import * as React from "react"
import { LoaderCircle, ShieldCheck } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"

import { AdminShell } from "@/components/admin/admin-shell"
import { API_ENABLED } from "@/lib/api/config"
import { ApiError, apiRequest } from "@/lib/api/client"

type PublicUser = { id: string; email: string; role?: string; name?: string }

export function AdminAccessGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const loginPage = pathname === "/admin/login"
  const [state, setState] = React.useState<"checking" | "allowed" | "denied">(
    API_ENABLED ? "checking" : "allowed"
  )

  React.useEffect(() => {
    if (!API_ENABLED || loginPage) return
    let active = true

    async function verify() {
      try {
        const user = await apiRequest<PublicUser>("user/me")
        const role = user.role?.toLowerCase()
        if (!role || !["admin", "superadmin"].includes(role)) throw new ApiError("Tài khoản không có quyền quản trị", 403)
        if (active) setState("allowed")
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          try {
            await apiRequest("auth/refresh", { method: "POST" })
            const user = await apiRequest<PublicUser>("user/me")
            const role = user.role?.toLowerCase()
            if (!role || !["admin", "superadmin"].includes(role)) throw new ApiError("Tài khoản không có quyền quản trị", 403)
            if (active) setState("allowed")
            return
          } catch {
            // Redirect below. Backend remains the source of truth for authorization.
          }
        }
        if (active) {
          setState("denied")
          router.replace("/admin/login")
        }
      }
    }

    void verify()
    return () => { active = false }
  }, [loginPage, router])

  if (loginPage) return children
  if (state !== "allowed") {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 px-4">
        <div className="rounded-3xl border bg-white p-8 text-center shadow-sm">
          {state === "checking" ? <LoaderCircle className="mx-auto size-7 animate-spin text-indigo-600" /> : <ShieldCheck className="mx-auto size-7 text-indigo-600" />}
          <p className="mt-3 text-sm font-medium text-slate-700">Đang kiểm tra phiên quản trị…</p>
        </div>
      </main>
    )
  }
  return <AdminShell>{children}</AdminShell>
}
