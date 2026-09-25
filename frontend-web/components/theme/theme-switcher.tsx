"use client"

import { Check, Moon, Palette, Sparkles, Sun } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { type ThemeAccent, type ThemeMode, useTheme } from "@/components/theme/theme-provider"

const modes: Array<{ value: ThemeMode; label: string; icon: typeof Sun }> = [
  { value: "brand", label: "Hiện tại", icon: Sparkles },
  { value: "light", label: "Sáng", icon: Sun },
  { value: "dark", label: "Tối", icon: Moon },
  { value: "system", label: "Theo thiết bị", icon: Palette },
]

const accents: Array<{ value: ThemeAccent; label: string; color: string }> = [
  { value: "rose", label: "Hồng", color: "#d45d88" },
  { value: "violet", label: "Tím", color: "#7661d1" },
  { value: "blue", label: "Xanh lam", color: "#287cc1" },
  { value: "emerald", label: "Ngọc lục", color: "#16866b" },
  { value: "amber", label: "Hổ phách", color: "#bb7417" },
]

export function ThemeSwitcher() {
  const { mode, accent, setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={`${buttonVariants({ variant: "outline", size: "icon" })} rounded-xl`} aria-label="Đổi giao diện">
        <Palette className="size-4" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 p-2">
        <DropdownMenuLabel>Chế độ giao diện</DropdownMenuLabel>
        {modes.map((item) => {
          const Icon = item.icon
          return (
            <DropdownMenuItem key={item.value} onClick={() => setTheme({ mode: item.value })} className="py-2">
              <Icon className="size-4" /> {item.label}
              {mode === item.value ? <Check className="ml-auto size-4" /> : null}
            </DropdownMenuItem>
          )
        })}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Màu chủ đạo</DropdownMenuLabel>
        <div className="grid grid-cols-5 gap-2 px-1.5 pb-2" aria-label="Chọn màu chủ đạo">
          {accents.map((item) => (
            <button
              key={item.value}
              type="button"
              title={item.label}
              aria-label={item.label}
              aria-pressed={accent === item.value}
              onClick={() => setTheme({ accent: item.value })}
              className="flex size-8 items-center justify-center rounded-full ring-offset-2 transition-transform hover:scale-110 aria-pressed:ring-2"
              style={{ backgroundColor: item.color, color: "white" }}
            >
              {accent === item.value ? <Check className="size-4" /> : null}
            </button>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
