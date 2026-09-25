"use client"

import { ApiRequired } from "@/components/admin/api-required"
import { UserDirectory } from "@/components/admin/user-directory"
import { API_ENABLED } from "@/lib/api/config"

export function StaffManager() {
  if (!API_ENABLED) return <ApiRequired feature="Nhân sự" />
  return <UserDirectory kind="staff" />
}
