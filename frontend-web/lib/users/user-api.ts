import { apiRequest } from "@/lib/api/client"

export type AccountRole = "superadmin" | "admin" | "editor" | "sales" | "user"
export type AccountStatus = "active" | "inactive" | "suspended" | "banned" | "pending"

export type ManagedUser = {
  id: number
  firstname: string
  lastname: string
  phone: string
  email: string
  address: string
  role: AccountRole
  status: AccountStatus
  version: number
  createdAt: string
  updatedAt: string
}

export type UserDirectoryResult = {
  items: ManagedUser[]
  meta: { page: number; limit: number; total: number; totalPages: number }
}

export type ManagedUserUpdate = {
  version: number
  firstname: string
  lastname: string
  phone: string
  address: string
  status: AccountStatus
  role?: Exclude<AccountRole, "user">
}

export type CreateStaffInput = Omit<ManagedUserUpdate, "version" | "status"> & {
  email: string
  password: string
  role: Exclude<AccountRole, "user">
}

export function searchUsers(kind: "staff" | "customers", query: string, status: AccountStatus | "") {
  const params = new URLSearchParams({ page: "1", limit: "100" })
  if (query.trim()) params.set("q", query.trim().slice(0, 100))
  if (status) params.set("status", status)
  return apiRequest<UserDirectoryResult>(`admin/users/${kind}?${params}`)
}

export function createStaff(input: CreateStaffInput) {
  return apiRequest<ManagedUser>("admin/users/staff", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export function updateManagedUser(kind: "staff" | "customers", id: number, input: ManagedUserUpdate) {
  return apiRequest<ManagedUser>(`admin/users/${kind}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  })
}

export function deleteManagedUser(kind: "staff" | "customers", id: number, version: number) {
  const params = new URLSearchParams({ version: String(version) })
  return apiRequest<{ id: number; deleted: true }>(`admin/users/${kind}/${id}?${params}`, { method: "DELETE" })
}
