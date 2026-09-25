"use client"

import * as React from "react"
import { Heart, Menu, Search, ShoppingBag, Sparkles, UserRound } from "lucide-react"

import { CART_EVENT } from "@/components/shop/product-actions"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

const navItems = [
  ["Sản phẩm", "#san-pham"],
  ["Móng tay giả", "#san-pham"],
  ["Chăm sóc da", "#san-pham"],
  ["Beauty journal", "#nhat-ky"],
]

export function SiteHeader() {
  const [cartCount, setCartCount] = React.useState(2)
  const [cartOpen, setCartOpen] = React.useState(false)

  React.useEffect(() => {
    const incrementCart = () => setCartCount((count) => count + 1)
    const openCart = () => setCartOpen(true)
    const channel = new BroadcastChannel("may-beauty-cart")

    channel.addEventListener("message", incrementCart)
    window.addEventListener(CART_EVENT, incrementCart)
    window.addEventListener("may-beauty:open-cart", openCart)

    return () => {
      channel.removeEventListener("message", incrementCart)
      channel.close()
      window.removeEventListener(CART_EVENT, incrementCart)
      window.removeEventListener("may-beauty:open-cart", openCart)
    }
  }, [])

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-5">
      <div className="glass-header mx-auto flex h-16 max-w-[1400px] items-center justify-between rounded-full px-3 sm:px-5">
        <div className="flex items-center gap-2 lg:hidden"><MobileMenu /></div>
        <a href="#" className="brand-mark" aria-label="Mây Beauty - Trang chủ">mây<span>•</span></a>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Điều hướng chính">
          {navItems.map(([label, href]) => (
            <a key={label} href={href} className="text-sm font-medium text-[#58454e] transition-colors hover:text-[#aa5b7c]">{label}</a>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <HeaderIcon label="Tìm kiếm" className="hidden sm:inline-flex"><Search aria-hidden="true" /></HeaderIcon>
          <HeaderIcon label="Danh sách yêu thích" className="hidden md:inline-flex"><Heart aria-hidden="true" /></HeaderIcon>
          <HeaderIcon label="Tài khoản" className="hidden md:inline-flex"><UserRound aria-hidden="true" /></HeaderIcon>
          <Sheet open={cartOpen} onOpenChange={setCartOpen}>
            <SheetTrigger
              className="relative inline-flex size-10 items-center justify-center rounded-full text-[#54424b] transition-colors hover:bg-white/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a75b7b]"
              aria-label={`Giỏ hàng có ${cartCount} sản phẩm`}
            >
              <ShoppingBag className="size-[18px]" aria-hidden="true" />
              <span className="absolute top-0 right-0 flex size-5 items-center justify-center rounded-full bg-[#a75b7b] text-[10px] font-bold text-white ring-2 ring-white/80">{cartCount}</span>
            </SheetTrigger>
            <SheetContent className="w-[92vw] max-w-md border-white/60 bg-[#fffafc]/92 backdrop-blur-2xl">
              <SheetHeader className="border-b border-[#674657]/10 px-6 py-6">
                <SheetTitle className="text-xl font-semibold">Giỏ hàng của bạn</SheetTitle>
                <SheetDescription>{cartCount} sản phẩm đang chờ được mang về.</SheetDescription>
              </SheetHeader>
              <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-[#f5dfe8] text-[#a75b7b]"><ShoppingBag className="size-7" aria-hidden="true" /></div>
                <h3 className="mt-5 font-semibold text-[#403139]">Giỏ hàng mẫu đã sẵn sàng</h3>
                <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">Dữ liệu sản phẩm sẽ được kết nối với API khi backend có module giỏ hàng.</p>
              </div>
              <SheetFooter className="border-t border-[#674657]/10 bg-white/40 p-6">
                <div className="mb-2 flex items-center justify-between text-sm"><span className="text-muted-foreground">Tạm tính</span><strong>478.000₫</strong></div>
                <Button className="h-11 w-full rounded-full bg-[#3f3038] text-white hover:bg-[#a25574]">Xem giỏ hàng</Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}

function HeaderIcon({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <Button type="button" variant="ghost" size="icon" className={`rounded-full text-[#54424b] hover:bg-white/60 ${className ?? ""}`} aria-label={label}>
      {children}
    </Button>
  )
}

function MobileMenu() {
  return (
    <Sheet>
      <SheetTrigger
        className="inline-flex size-10 items-center justify-center rounded-full text-[#54424b] transition-colors hover:bg-white/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a75b7b]"
        aria-label="Mở menu"
      >
        <Menu className="size-5" aria-hidden="true" />
      </SheetTrigger>
      <SheetContent side="left" className="w-[88vw] border-white/60 bg-[#fffafc]/94 backdrop-blur-2xl">
        <SheetHeader className="px-6 pt-7">
          <SheetTitle className="brand-mark text-left text-3xl">mây<span>•</span></SheetTitle>
          <SheetDescription className="text-left">Nhỏ xinh, dịu dàng, dành riêng cho bạn.</SheetDescription>
        </SheetHeader>
        <nav className="flex flex-col px-4 pt-4" aria-label="Điều hướng mobile">
          {navItems.map(([label, href]) => (
            <a key={label} href={href} className="flex items-center justify-between rounded-2xl px-3 py-4 text-base font-medium text-[#4f3d46] hover:bg-white/60">
              {label}<span aria-hidden="true">→</span>
            </a>
          ))}
        </nav>
        <div className="mx-6 mt-auto mb-6 rounded-3xl bg-gradient-to-br from-[#f8dfe9] to-[#eee4ff] p-5">
          <Sparkles className="size-5 text-[#a75b7b]" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold text-[#47353e]">Ưu đãi riêng cho thành viên mới</p>
          <p className="mt-1 text-xs leading-5 text-[#765f69]">Giảm 10% cho đơn hàng đầu tiên.</p>
        </div>
      </SheetContent>
    </Sheet>
  )
}
