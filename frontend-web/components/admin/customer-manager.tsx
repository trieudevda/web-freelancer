"use client"

import { ApiRequired } from "@/components/admin/api-required"
import { UserDirectory } from "@/components/admin/user-directory"
import { API_ENABLED } from "@/lib/api/config"

export function CustomerManager() {
  if (!API_ENABLED) return <ApiRequired feature="Khách hàng" />
  return <UserDirectory kind="customers" />
}
