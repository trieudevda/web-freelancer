import Image from "next/image"
import Link from "next/link"
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CircleDollarSign,
  Package,
  ShoppingCart,
  Users,
} from "lucide-react"

import { resources } from "@/lib/admin-data"
import { Badge } from "@/components/ui/badge"

const orders = resources.find((resource) => resource.slug === "orders")!.items
const products = resources.find((resource) => resource.slug === "products")!.items

const stats = [
  { label: "Doanh thu tháng", value: "28,6 triệu", change: "+12,4%", trend: "up", icon: CircleDollarSign, tone: "bg-emerald-50 text-emerald-600" },
  { label: "Đơn hàng", value: "186", change: "+8,2%", trend: "up", icon: ShoppingCart, tone: "bg-indigo-50 text-indigo-600" },
  { label: "Khách hàng mới", value: "42", change: "+5,1%", trend: "up", icon: Users, tone: "bg-rose-50 text-rose-600" },
  { label: "Sắp hết hàng", value: "7", change: "-2 sản phẩm", trend: "down", icon: Package, tone: "bg-amber-50 text-amber-600" },
]

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-indigo-600">Thứ sáu, 25 tháng 9</p>
          <h2 className="mt-1 text-2xl font-bold tracking-[-0.03em] text-slate-900 sm:text-3xl">Chào buổi sáng, Mây ✨</h2>
          <p className="mt-2 text-sm text-slate-500">Đây là những gì đang diễn ra với cửa hàng hôm nay.</p>
        </div>
        <Link href="/admin/products" className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700">
          Quản lý sản phẩm <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Chỉ số cửa hàng">
        {stats.map((stat) => {
          const Icon = stat.icon
          const TrendIcon = stat.trend === "up" ? ArrowUpRight : ArrowDownRight
          return (
            <article key={stat.label} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,.04)]">
              <div className="flex items-start justify-between">
                <span className={`flex size-11 items-center justify-center rounded-xl ${stat.tone}`}><Icon className="size-5" aria-hidden="true" /></span>
                <span className={`inline-flex items-center text-xs font-semibold ${stat.trend === "up" ? "text-emerald-600" : "text-amber-600"}`}><TrendIcon className="size-3.5" aria-hidden="true" />{stat.change}</span>
              </div>
              <p className="mt-5 text-2xl font-bold tracking-[-0.03em] text-slate-900">{stat.value}</p>
              <p className="mt-1 text-xs font-medium text-slate-500">{stat.label}</p>
            </article>
          )
        })}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,.04)] sm:p-6" aria-labelledby="revenue-title">
          <div className="flex items-center justify-between">
            <div><h3 id="revenue-title" className="font-semibold text-slate-900">Doanh thu 7 ngày</h3><p className="mt-1 text-xs text-slate-500">So với tuần trước</p></div>
            <Badge className="bg-emerald-50 text-emerald-700">+12,4%</Badge>
          </div>
          <div className="mt-8 flex h-56 items-end gap-3 sm:gap-5" aria-label="Biểu đồ doanh thu từ thứ hai đến chủ nhật">
            {[42, 66, 53, 78, 61, 92, 73].map((height, index) => (
              <div key={height + index} className="group flex h-full flex-1 flex-col items-center justify-end gap-2">
                <span className="text-[10px] font-semibold text-slate-400 opacity-0 transition-opacity group-hover:opacity-100">{Math.round(height * 0.72)}0k</span>
                <div className="w-full max-w-12 rounded-t-lg bg-gradient-to-t from-indigo-500 to-violet-400 transition-opacity hover:opacity-80" style={{ height: `${height}%` }} />
                <span className="text-[11px] text-slate-400">{["T2", "T3", "T4", "T5", "T6", "T7", "CN"][index]}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,.04)] sm:p-6" aria-labelledby="top-products-title">
          <div className="flex items-center justify-between"><h3 id="top-products-title" className="font-semibold text-slate-900">Sản phẩm nổi bật</h3><Link href="/admin/products" className="text-xs font-semibold text-indigo-600 hover:underline">Xem tất cả</Link></div>
          <div className="mt-5 space-y-4">
            {products.slice(0, 4).map((product, index) => (
              <Link key={product.id} href="/admin/products" className="flex items-center gap-3 rounded-xl p-1 transition-colors hover:bg-slate-50">
                <div className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                  <Image src={product.image!} alt="" fill loading="lazy" sizes="48px" className="object-cover" />
                </div>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-700">{product.name}</p><p className="mt-0.5 text-xs text-slate-400">{product.stock} sản phẩm còn lại</p></div>
                <span className="text-xs font-bold text-slate-400">#{index + 1}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,.04)]" aria-labelledby="recent-orders-title">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
          <div><h3 id="recent-orders-title" className="font-semibold text-slate-900">Đơn hàng gần đây</h3><p className="mt-1 text-xs text-slate-500">5 đơn mới nhất trong dữ liệu cache</p></div>
          <Link href="/admin/orders" className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline">Tất cả đơn <ArrowRight className="size-3.5" /></Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50/80 text-[11px] tracking-[0.08em] text-slate-400 uppercase"><tr><th className="px-6 py-3 font-semibold">Mã đơn</th><th className="px-6 py-3 font-semibold">Khách hàng</th><th className="px-6 py-3 font-semibold">Ngày đặt</th><th className="px-6 py-3 text-right font-semibold">Tổng tiền</th><th className="px-6 py-3 font-semibold">Trạng thái</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50/60"><td className="px-6 py-4 font-semibold text-indigo-600">{order.name}</td><td className="px-6 py-4 font-medium text-slate-700">{order.customer}</td><td className="px-6 py-4 text-slate-500">{formatDate(order.date)}</td><td className="px-6 py-4 text-right font-semibold text-slate-700">{order.total}</td><td className="px-6 py-4"><StatusBadge status={order.status} /></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    "Chờ xác nhận": "bg-amber-50 text-amber-700",
    "Đang chuẩn bị": "bg-indigo-50 text-indigo-700",
    "Đang giao": "bg-sky-50 text-sky-700",
    "Hoàn tất": "bg-emerald-50 text-emerald-700",
    "Đã hủy": "bg-rose-50 text-rose-700",
  }
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${colors[status] ?? "bg-slate-100 text-slate-600"}`}>{status}</span>
}

function formatDate(value?: string) {
  if (!value) return "—"
  return new Intl.DateTimeFormat("vi-VN").format(new Date(`${value}T00:00:00`))
}
