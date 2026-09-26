"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  BadgePercent,
  ChevronDown,
  FileText,
  FolderTree,
  Images,
  LayoutDashboard,
  LogOut,
  Menu,
  MessagesSquare,
  Package,
  ReceiptText,
  Search,
  Settings,
  ShoppingBag,
  UserCog,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { ThemeSwitcher } from "@/components/theme/theme-switcher"
import { toast } from "@/components/ui/toast"
import { API_ENABLED } from "@/lib/api/config"
import { apiRequest } from "@/lib/api/client"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

const navigation = [
  { label: "Tổng quan", href: "/admin", icon: LayoutDashboard },
  { label: "Tìm kiếm", href: "/admin/search", icon: Search },
  { label: "Sản phẩm", href: "/admin/products", icon: Package },
  { label: "Danh mục", href: "/admin/categories", icon: FolderTree },
  { label: "Đơn hàng", href: "/admin/orders", icon: ReceiptText, badge: "5" },
  { label: "Bài viết", href: "/admin/posts", icon: FileText },
  { label: "Đánh giá & bình luận", href: "/admin/reviews", icon: MessagesSquare },
  { label: "Khách hàng", href: "/admin/customers", icon: Users },
  { label: "Mã giảm giá", href: "/admin/coupons", icon: BadgePercent },
  { label: "Thư viện ảnh", href: "/admin/media", icon: Images },
  { label: "Nhân sự", href: "/admin/staff", icon: UserCog },
  { label: "Cài đặt chung", href: "/admin/settings", icon: Settings },
]

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const debouncedSearch = useDebouncedValue(searchQuery, 350)
  const lastSearch = React.useRef("")
  const current = navigation.find((item) => item.href === pathname)

  React.useEffect(() => {
    const query = debouncedSearch.trim()
    if (query.length < 2 || query === lastSearch.current) return
    lastSearch.current = query
    router.replace(`/admin/search?q=${encodeURIComponent(query)}`)
  }, [debouncedSearch, router])

  function search(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const query = String(data.get("q") ?? "").trim()
    if (query) {
      lastSearch.current = query
      router.push(`/admin/search?q=${encodeURIComponent(query)}`)
    }
  }

  async function logout() {
    if (!API_ENABLED) return
    try {
      await apiRequest("auth/logout", { method: "POST" })
    } catch {
      // The local UI still returns to login; the server remains authoritative.
    }
    toast.add({ title: "Đã đăng xuất", type: "success" })
    router.replace("/admin/login")
    router.refresh()
  }

  return (
    <div className="admin-app min-h-screen bg-[#f5f6fa] text-[#283044]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-slate-200/80 bg-white lg:block">
        <Sidebar pathname={pathname} />
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-[72px] items-center gap-3 border-b border-slate-200/80 bg-white/88 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              className="inline-flex size-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 lg:hidden"
              aria-label="Mở menu quản trị"
            >
              <Menu className="size-5" aria-hidden="true" />
            </SheetTrigger>
            <SheetContent side="left" className="w-[86vw] max-w-72 gap-0 border-r-slate-200 bg-white p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Điều hướng quản trị</SheetTitle>
                <SheetDescription>Chuyển giữa các trang quản trị.</SheetDescription>
              </SheetHeader>
              <Sidebar pathname={pathname} onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>

          <div className="min-w-0 shrink-0">
            <p className="truncate text-xs font-medium text-slate-400">Mây Beauty / Quản trị</p>
            <h1 className="truncate text-base font-semibold text-slate-800">{current?.label ?? (pathname === "/admin/search" ? "Tìm kiếm" : "Quản trị")}</h1>
          </div>

          <form onSubmit={search} className="relative ml-auto hidden w-full max-w-md sm:block">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <Input name="q" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} maxLength={100} autoComplete="off" aria-label="Tìm kiếm realtime toàn bộ dữ liệu quản trị" placeholder="Tìm sản phẩm, đơn hàng, bài viết..." className="h-10 rounded-xl border-slate-200 bg-slate-50 pr-16 pl-10 shadow-none" />
            <span className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 text-[10px] font-medium text-slate-400 md:block">350ms</span>
          </form>

          <span className="hidden items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500 md:flex" title={API_ENABLED ? "Dữ liệu auth và media dùng API" : "Dữ liệu chỉ lưu trong trình duyệt"}>
            {API_ENABLED ? <Wifi className="size-3.5 text-emerald-600" /> : <WifiOff className="size-3.5 text-amber-600" />}
            {API_ENABLED ? "API" : "Demo"}
          </span>
          <ThemeSwitcher />

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-xl p-1.5 text-left hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-indigo-500">
              <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#8b78dc] to-[#d66f9a] text-sm font-bold text-white">M</span>
              <span className="hidden leading-tight xl:block"><strong className="block text-sm font-semibold text-slate-700">Mây Admin</strong><span className="text-xs text-slate-400">Quản trị viên</span></span>
              <ChevronDown className="hidden size-4 text-slate-400 xl:block" aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Tài khoản quản trị</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem render={<Link href="/" />}>Xem cửa hàng</DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/admin/settings" />}>Cài đặt</DropdownMenuItem>
              {API_ENABLED ? <DropdownMenuItem onClick={logout} variant="destructive"><LogOut />Đăng xuất</DropdownMenuItem> : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </div>
    </div>
  )
}

function Sidebar({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col p-4">
      <Link href="/admin" onClick={onNavigate} className="flex h-14 items-center gap-3 px-2">
        <span className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#826fd1] to-[#d36f9a] text-white shadow-[0_8px_25px_rgba(126,104,202,.25)]">
          <ShoppingBag className="size-5" aria-hidden="true" />
        </span>
        <span><strong className="block text-lg tracking-[-0.03em] text-slate-800">Mây Beauty</strong><span className="block text-[11px] font-semibold tracking-[0.16em] text-slate-400 uppercase">Admin panel</span></span>
      </Link>

      <nav className="mt-6 space-y-1" aria-label="Điều hướng quản trị">
        {navigation.map((item) => {
          const active = item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
                active ? "admin-nav-active" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              )}
            >
              <Icon className="size-[18px]" strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
              <span>{item.label}</span>
              {item.badge ? <span className="ml-auto flex min-w-5 items-center justify-center rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-600">{item.badge}</span> : null}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-rose-50 p-4">
        <p className="text-xs font-semibold text-slate-700">{API_ENABLED ? "Kết nối API" : "Dữ liệu thử nghiệm"}</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">{API_ENABLED ? "Xác thực, tài khoản hiện tại và media dùng API. Các module khác dùng demo." : "Mọi thay đổi chỉ lưu trong cache trình duyệt, không gửi lên máy chủ."}</p>
        <Button render={<Link href="/" />} nativeButton={false} variant="outline" className="mt-3 h-8 w-full rounded-lg border-white bg-white/70 text-xs">Xem cửa hàng</Button>
      </div>
    </div>
  )
}
