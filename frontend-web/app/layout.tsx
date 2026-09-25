import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"

import { Toaster } from "@/components/ui/toast"
import { ThemeProvider } from "@/components/theme/theme-provider"

import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "vietnamese"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "vietnamese"],
})

export const metadata: Metadata = {
  title: "Mây Beauty — Đẹp theo cách rất riêng bạn",
  description:
    "Mỹ phẩm dịu nhẹ, móng tay giả và những câu chuyện làm đẹp được chọn lọc dành cho bạn.",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body>
        <ThemeProvider>
          <div className="app-root isolate">{children}</div>
          <Toaster timeout={4200} limit={3} />
        </ThemeProvider>
      </body>
    </html>
  )
}
