import type { ReactNode } from "react"
import type { Metadata } from "next"

import { AdminAccessGate } from "@/components/admin/admin-access-gate"

export const metadata: Metadata = {
  title: "Quản trị | Mây Beauty",
  description: "Khu vực quản trị dữ liệu tĩnh của Mây Beauty.",
  robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminAccessGate>{children}</AdminAccessGate>
}
