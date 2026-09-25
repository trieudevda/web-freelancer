"use client"

import * as React from "react"
import Image from "next/image"
import { Download, Eye, MoreHorizontal, Pencil, Plus, RotateCcw, Search, Trash2 } from "lucide-react"

import type { AdminRecord, ResourceConfig, ResourceField } from "@/lib/admin-data"
import { adminCacheKey } from "@/lib/admin-data"
import { useLocalCache } from "@/hooks/use-local-cache"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { safeDownloadName } from "@/lib/security"

type ModalState = { mode: "create" | "edit" | "view"; record?: AdminRecord } | null

export function ResourceManager({ config }: { config: ResourceConfig }) {
  const [records, setRecords, resetRecords] = useLocalCache<AdminRecord[]>(adminCacheKey(config.slug), config.items)
  const [query, setQuery] = React.useState("")
  const debouncedQuery = useDebouncedValue(query, 250)
  const [status, setStatus] = React.useState("Tất cả")
  const [modal, setModal] = React.useState<ModalState>(null)
  const [deleteRecord, setDeleteRecord] = React.useState<AdminRecord | null>(null)

  const statuses = React.useMemo(() => ["Tất cả", ...Array.from(new Set(records.map((record) => record.status)))], [records])
  const filtered = React.useMemo(() => {
    const normalized = debouncedQuery.trim().toLocaleLowerCase("vi")
    return records.filter((record) => {
      const matchesQuery = !normalized || Object.values(record).some((value) => String(value ?? "").toLocaleLowerCase("vi").includes(normalized))
      const matchesStatus = status === "Tất cả" || record.status === status
      return matchesQuery && matchesStatus
    })
  }, [debouncedQuery, records, status])

  function saveRecord(nextRecord: AdminRecord) {
    if (modal?.mode === "edit") {
      setRecords((current) => current.map((item) => (item.id === nextRecord.id ? nextRecord : item)))
      toast.add({ title: `Đã cập nhật ${config.singular}`, description: nextRecord.name, type: "success" })
    } else {
      setRecords((current) => [nextRecord, ...current])
      toast.add({ title: `Đã thêm ${config.singular}`, description: nextRecord.name, type: "success" })
    }
    setModal(null)
  }

  function confirmDelete() {
    if (!deleteRecord) return
    setRecords((current) => current.filter((item) => item.id !== deleteRecord.id))
    toast.add({ title: `Đã xóa ${config.singular}`, description: deleteRecord.name, type: "info" })
    setDeleteRecord(null)
  }

  function restoreSeed() {
    resetRecords()
    toast.add({ title: "Đã khôi phục dữ liệu mẫu", description: `${config.items.length} mục đã được khôi phục.`, type: "success" })
  }

  function exportRecords() {
    const blob = new Blob([JSON.stringify(records, null, 2)], { type: "application/json;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = safeDownloadName(`${config.slug}-${new Date().toISOString().slice(0, 10)}.json`)
    anchor.rel = "noopener"
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
    toast.add({ title: "Đã xuất dữ liệu demo", description: `${records.length} mục dạng JSON.`, type: "success" })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><h2 className="text-2xl font-bold tracking-[-0.03em] text-slate-900 sm:text-3xl">{config.title}</h2><p className="mt-2 text-sm text-slate-500">{config.description}</p></div>
        <Button onClick={() => setModal({ mode: "create" })} className="admin-primary h-10 self-start rounded-xl px-4 text-white">
          <Plus data-icon="inline-start" aria-hidden="true" /> Thêm {config.singular}
        </Button>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,.04)]" aria-label={`Danh sách ${config.title.toLocaleLowerCase("vi")}`}>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <Input value={query} maxLength={100} onChange={(event) => setQuery(event.target.value)} placeholder={`Tìm trong ${config.title.toLocaleLowerCase("vi")}...`} className="h-10 rounded-xl border-slate-200 bg-slate-50 pl-10 shadow-none" />
          </div>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" aria-label="Lọc theo trạng thái">
            {statuses.map((item) => <option key={item}>{item}</option>)}
          </select>
          <div className="flex items-center gap-2 sm:ml-auto">
            <Button type="button" variant="outline" onClick={restoreSeed} className="h-10 rounded-xl border-slate-200 text-slate-600"><RotateCcw aria-hidden="true" /> <span className="hidden md:inline">Khôi phục mẫu</span></Button>
            <Button type="button" variant="outline" onClick={exportRecords} className="h-10 rounded-xl border-slate-200 text-slate-600"><Download aria-hidden="true" /> <span className="hidden md:inline">Xuất dữ liệu</span></Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-slate-50/80 text-[11px] tracking-[0.08em] text-slate-400 uppercase">
              <tr>
                {config.columns.map((column) => <th key={column.key} className={`px-5 py-3 font-semibold ${column.align === "right" ? "text-right" : ""}`}>{column.label}</th>)}
                <th className="w-16 px-5 py-3 text-right font-semibold">Tác vụ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((record) => (
                <tr key={record.id} className="transition-colors hover:bg-slate-50/70">
                  {config.columns.map((column, index) => (
                    <td key={column.key} className={`px-5 py-4 ${column.align === "right" ? "text-right" : ""}`}>
                      {column.key === "status" ? <StatusBadge status={record.status} /> : index === 0 ? <PrimaryCell record={record} /> : <span className={column.align === "right" ? "font-semibold text-slate-700" : "text-slate-500"}>{displayValue(record[column.key], column.key)}</span>}
                    </td>
                  ))}
                  <td className="px-5 py-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="inline-flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label={`Tác vụ cho ${record.name}`}><MoreHorizontal className="size-4" /></DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => setModal({ mode: "view", record })}><Eye /> Xem chi tiết</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setModal({ mode: "edit", record })}><Pencil /> Chỉnh sửa</DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onClick={() => setDeleteRecord(record)}><Trash2 /> Xóa</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center"><Search className="size-8 text-slate-300" aria-hidden="true" /><p className="mt-3 font-semibold text-slate-600">Không tìm thấy kết quả</p><p className="mt-1 text-sm text-slate-400">Thử từ khóa hoặc trạng thái khác.</p></div>
        ) : (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs text-slate-400"><span>Hiển thị {filtered.length} / {records.length} mục</span><span>Dữ liệu lưu trong cache trình duyệt</span></div>
        )}
      </section>

      <Dialog open={Boolean(modal)} onOpenChange={(open) => !open && setModal(null)}>
        <DialogContent className="max-h-[88vh] overflow-y-auto rounded-2xl p-0 sm:max-w-2xl">
          {modal ? (
            modal.mode === "view" && modal.record ? <RecordDetails config={config} record={modal.record} onEdit={() => setModal({ mode: "edit", record: modal.record })} /> : <ResourceForm key={`${modal.mode}-${modal.record?.id ?? "new"}`} config={config} record={modal.record} onCancel={() => setModal(null)} onSave={saveRecord} />
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteRecord)} onOpenChange={(open) => !open && setDeleteRecord(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-rose-50 text-rose-600"><Trash2 /></AlertDialogMedia>
            <AlertDialogTitle>Xóa {config.singular}?</AlertDialogTitle>
            <AlertDialogDescription>“{deleteRecord?.name}” sẽ bị xóa khỏi cache trên trình duyệt này. Bạn có thể khôi phục lại dữ liệu mẫu sau.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel className="rounded-xl">Hủy</AlertDialogCancel><AlertDialogAction onClick={confirmDelete} className="rounded-xl bg-rose-600 text-white hover:bg-rose-700">Xóa</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function ResourceForm({ config, record, onCancel, onSave }: { config: ResourceConfig; record?: AdminRecord; onCancel: () => void; onSave: (record: AdminRecord) => void }) {
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const values = Object.fromEntries(config.fields.map((field) => [field.key, String(data.get(field.key) ?? "")]))
    onSave({ ...record, ...values, id: record?.id ?? `${config.idPrefix}-${String(Date.now()).slice(-6)}`, name: values.name || record?.name || config.singular, status: values.status || record?.status || "Mới" })
  }

  return (
    <form onSubmit={submit}>
      <DialogHeader className="border-b border-slate-100 px-6 py-5"><DialogTitle className="text-lg font-semibold text-slate-900">{record ? `Chỉnh sửa ${config.singular}` : `Thêm ${config.singular}`}</DialogTitle><DialogDescription>Mọi thay đổi được lưu cục bộ và không gửi yêu cầu API.</DialogDescription></DialogHeader>
      <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
        {config.fields.map((field) => <FieldInput key={field.key} field={field} defaultValue={record?.[field.key] ?? ""} />)}
      </div>
      <DialogFooter className="mx-0 mb-0 rounded-b-2xl px-6 py-4"><Button type="button" variant="outline" onClick={onCancel} className="rounded-xl">Hủy</Button><Button type="submit" className="admin-primary rounded-xl text-white">{record ? "Lưu thay đổi" : `Thêm ${config.singular}`}</Button></DialogFooter>
    </form>
  )
}

function FieldInput({ field, defaultValue }: { field: ResourceField; defaultValue: string }) {
  const shared = "mt-1.5 w-full rounded-xl border-slate-200 bg-white shadow-none focus:border-indigo-400 focus:ring-indigo-100"
  return (
    <label className={field.type === "textarea" ? "sm:col-span-2" : ""}>
      <span className="text-xs font-semibold text-slate-600">{field.label}{field.required ? <span className="text-rose-500"> *</span> : null}</span>
      {field.type === "textarea" ? (
        <Textarea name={field.key} required={field.required} maxLength={2000} defaultValue={defaultValue} placeholder={field.placeholder} className={`${shared} min-h-24`} />
      ) : field.type === "select" ? (
        <select name={field.key} required={field.required} defaultValue={defaultValue || field.options?.[0]} className={`${shared} h-10 border px-3 text-sm outline-none`}>
          {field.options?.map((option) => <option key={option}>{option}</option>)}
        </select>
      ) : (
        <Input name={field.key} type={field.type} required={field.required} maxLength={255} defaultValue={defaultValue} placeholder={field.placeholder} className={`${shared} h-10`} />
      )}
    </label>
  )
}

function RecordDetails({ config, record, onEdit }: { config: ResourceConfig; record: AdminRecord; onEdit: () => void }) {
  return (
    <>
      <DialogHeader className="border-b border-slate-100 px-6 py-5"><DialogTitle className="text-lg font-semibold text-slate-900">Chi tiết {config.singular}</DialogTitle><DialogDescription>ID: {record.id}</DialogDescription></DialogHeader>
      {record.image ? <div className="relative mx-6 mt-5 aspect-[16/7] overflow-hidden rounded-2xl bg-slate-100"><Image src={record.image} alt="" fill loading="lazy" sizes="600px" className="object-cover" /></div> : null}
      <dl className="grid gap-x-6 gap-y-4 px-6 py-5 sm:grid-cols-2">
        {config.fields.map((field) => <div key={field.key} className={field.type === "textarea" ? "sm:col-span-2" : ""}><dt className="text-xs font-semibold text-slate-400">{field.label}</dt><dd className="mt-1 text-sm font-medium text-slate-700">{displayValue(record[field.key], field.key)}</dd></div>)}
      </dl>
      <DialogFooter className="mx-0 mb-0 rounded-b-2xl px-6 py-4"><Button type="button" onClick={onEdit} className="admin-primary rounded-xl text-white"><Pencil /> Chỉnh sửa</Button></DialogFooter>
    </>
  )
}

function PrimaryCell({ record }: { record: AdminRecord }) {
  return (
    <div className="flex items-center gap-3">
      {record.image ? <div className="relative size-10 shrink-0 overflow-hidden rounded-xl bg-slate-100"><Image src={record.image} alt="" fill loading="lazy" sizes="40px" className="object-cover" /></div> : <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-xs font-bold text-indigo-600">{record.name.slice(0, 2).toLocaleUpperCase("vi")}</span>}
      <div className="min-w-0"><p className="max-w-60 truncate font-semibold text-slate-700">{record.name}</p><p className="mt-0.5 text-[11px] text-slate-400">{record.id}</p></div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const positive = ["Đang bán", "Hoàn tất", "Đã xuất bản", "Đang chạy", "Đang dùng", "Đã duyệt", "Đang hoạt động", "Kim cương"]
  const warning = ["Chờ xác nhận", "Chờ duyệt", "Đang chuẩn bị", "Đã lên lịch", "Hồng", "Ngọc trai", "Mới"]
  const negative = ["Hết hàng", "Đã hủy", "Hết hạn", "Đã ẩn", "Đã khóa"]
  const color = positive.includes(status) ? "bg-emerald-50 text-emerald-700" : warning.includes(status) ? "bg-amber-50 text-amber-700" : negative.includes(status) ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600"
  return <Badge className={`${color} border-0 shadow-none`}>{status}</Badge>
}

function displayValue(value: string | undefined, key: string) {
  if (!value) return "—"
  if (key === "date" || key === "expiry") {
    const date = new Date(`${value}T00:00:00`)
    if (!Number.isNaN(date.valueOf())) return new Intl.DateTimeFormat("vi-VN").format(date)
  }
  return value
}
