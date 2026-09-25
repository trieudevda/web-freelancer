"use client"

import { Cable, ServerCog } from "lucide-react"

export function ApiRequired({ feature }: { feature: string }) {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <section className="w-full max-w-xl rounded-3xl border border-amber-200 bg-white p-7 text-center shadow-sm">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700"><ServerCog className="size-6" /></span>
        <h2 className="mt-5 text-2xl font-bold text-slate-900">{feature} chỉ sử dụng dữ liệu API thật</h2>
        <p className="mt-3 text-sm leading-6 text-slate-500">Không có dữ liệu demo hoặc fallback cache cho khu vực này. Hãy cấu hình URL backend rồi khởi động lại frontend.</p>
        <div className="mt-5 rounded-2xl bg-slate-950 p-4 text-left text-sm text-slate-200"><code>NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1</code></div>
        <p className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400"><Cable className="size-4" /> Backend phải cho phép origin của frontend trong CORS_ORIGINS.</p>
      </section>
    </div>
  )
}
