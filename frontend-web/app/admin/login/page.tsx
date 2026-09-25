"use client"

import * as React from "react"
import Link from "next/link"
import { LoaderCircle, LockKeyhole, ShoppingBag } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/toast"
import { API_ENABLED } from "@/lib/api/config"
import { ApiError, apiRequest } from "@/lib/api/client"

export default function AdminLoginPage() {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || !API_ENABLED) return
    const form = new FormData(event.currentTarget)
    const email = String(form.get("email") ?? "").trim().toLowerCase().slice(0, 255)
    const password = String(form.get("password") ?? "").slice(0, 128)
    setPending(true)
    try {
      const result = await apiRequest<{ user: { role?: string } }>("auth/login", { method: "POST", body: JSON.stringify({ email, password }) })
      if (!result.user.role || !["admin", "superadmin"].includes(result.user.role.toLowerCase())) {
        await apiRequest("auth/logout", { method: "POST" }).catch(() => undefined)
        throw new ApiError("Tài khoản không có quyền quản trị", 403)
      }
      toast.add({ title: "Đăng nhập thành công", description: "Đang mở khu vực quản trị.", type: "success" })
      router.replace("/admin")
      router.refresh()
    } catch (error) {
      toast.add({ title: "Không thể đăng nhập", description: error instanceof ApiError ? error.message : "Vui lòng thử lại.", type: "error" })
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#f5f2f6] px-4 py-10">
      <div className="absolute -top-32 -left-32 size-96 rounded-full bg-fuchsia-200/45 blur-3xl" />
      <div className="absolute -right-24 -bottom-24 size-80 rounded-full bg-indigo-200/50 blur-3xl" />
      <section className="relative w-full max-w-md rounded-[2rem] border border-white/80 bg-white/75 p-7 shadow-[0_24px_80px_rgba(66,47,85,.14)] backdrop-blur-2xl sm:p-9">
        <Link href="/" className="mx-auto flex w-fit items-center gap-3">
          <span className="admin-primary flex size-11 items-center justify-center rounded-2xl text-white"><ShoppingBag className="size-5" /></span>
          <span className="text-xl font-bold tracking-tight text-slate-800">Mây Beauty</span>
        </Link>
        <div className="mt-8 text-center">
          <LockKeyhole className="mx-auto size-6 text-slate-500" />
          <h1 className="mt-3 text-2xl font-bold text-slate-900">Đăng nhập quản trị</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">Phiên đăng nhập dùng cookie HttpOnly; mật khẩu không được lưu trong trình duyệt.</p>
        </div>

        {API_ENABLED ? (
          <form onSubmit={submit} className="mt-7 space-y-4">
            <label className="block text-sm font-medium text-slate-700">Email
              <Input name="email" type="email" required maxLength={255} autoComplete="username" className="mt-2 h-11" />
            </label>
            <label className="block text-sm font-medium text-slate-700">Mật khẩu
              <Input name="password" type="password" required maxLength={128} autoComplete="current-password" className="mt-2 h-11" />
            </label>
            <Button type="submit" disabled={pending} className="admin-primary h-11 w-full rounded-xl">
              {pending ? <LoaderCircle className="size-4 animate-spin" /> : null} Đăng nhập
            </Button>
          </form>
        ) : (
          <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            Chưa có <code>NEXT_PUBLIC_API_URL</code>. Giao diện đang ở chế độ demo và không yêu cầu đăng nhập.
            <Button onClick={() => router.replace("/admin")} className="mt-4 w-full rounded-xl">Mở bản demo</Button>
          </div>
        )}
      </section>
    </main>
  )
}
