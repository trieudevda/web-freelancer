"use client"

import * as React from "react"
import { ChevronDown, ChevronRight, Folder, FolderPlus, Pencil, Plus, RotateCcw, Search, Trash2 } from "lucide-react"

import { adminCacheKey, categorySeed, type CategoryRecord } from "@/lib/admin-data"
import { useLocalCache } from "@/hooks/use-local-cache"
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/toast"

type EditState = { record?: CategoryRecord; parentId?: string } | null

export function CategoryManager() {
  const [categories, setCategories, resetCategories] = useLocalCache<CategoryRecord[]>(adminCacheKey("categories"), categorySeed)
  const [expanded, setExpanded] = React.useState(() => new Set(categorySeed.map((category) => category.id)))
  const [query, setQuery] = React.useState("")
  const [editor, setEditor] = React.useState<EditState>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<CategoryRecord | null>(null)

  const visibleRows = React.useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("vi")
    if (normalized) {
      return categories
        .filter((category) => [category.name, category.slug, category.kind].some((value) => value.toLocaleLowerCase("vi").includes(normalized)))
        .map((category) => ({ category, depth: getDepth(category, categories) }))
    }
    return flattenTree(categories, expanded)
  }, [categories, expanded, query])

  function save(next: CategoryRecord) {
    setCategories((current) => current.some((item) => item.id === next.id) ? current.map((item) => item.id === next.id ? next : item) : [...current, next])
    if (next.parentId) setExpanded((current) => new Set(current).add(next.parentId!))
    toast.add({ title: editor?.record ? "Đã cập nhật danh mục" : "Đã thêm danh mục", description: next.name, type: "success" })
    setEditor(null)
  }

  function confirmDelete() {
    if (!deleteTarget) return
    const ids = collectDescendantIds(deleteTarget.id, categories)
    setCategories((current) => current.filter((item) => !ids.has(item.id)))
    toast.add({ title: "Đã xóa danh mục", description: ids.size > 1 ? `Đã xóa ${ids.size} danh mục gồm các mục con.` : deleteTarget.name, type: "info" })
    setDeleteTarget(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><h2 className="text-2xl font-bold tracking-[-0.03em] text-slate-900 sm:text-3xl">Danh mục dạng cây</h2><p className="mt-2 text-sm text-slate-500">Sắp xếp cấu trúc sản phẩm và bài viết theo cấp cha – con.</p></div>
        <Button onClick={() => setEditor({})} className="h-10 self-start rounded-xl bg-indigo-600 px-4 text-white hover:bg-indigo-700"><Plus /> Thêm danh mục gốc</Button>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,.04)]">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-sm"><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm tên hoặc slug..." className="h-10 rounded-xl border-slate-200 bg-slate-50 pl-10 shadow-none" /></div>
          <Button variant="outline" onClick={() => { resetCategories(); setExpanded(new Set(categorySeed.map((item) => item.id))); toast.add({ title: "Đã khôi phục cây danh mục", type: "success" }) }} className="h-10 rounded-xl border-slate-200 text-slate-600 sm:ml-auto"><RotateCcw /> Khôi phục mẫu</Button>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[720px]">
            <div className="grid grid-cols-[minmax(300px,1fr)_130px_90px_100px_116px] bg-slate-50/80 px-5 py-3 text-[11px] font-semibold tracking-[.08em] text-slate-400 uppercase">
              <span>Danh mục</span><span>Loại</span><span className="text-right">Số mục</span><span>Trạng thái</span><span className="text-right">Tác vụ</span>
            </div>
            <div className="divide-y divide-slate-100">
              {visibleRows.map(({ category, depth }) => {
                const hasChildren = categories.some((item) => item.parentId === category.id)
                const isExpanded = expanded.has(category.id)
                return (
                  <div key={category.id} className="grid min-h-16 grid-cols-[minmax(300px,1fr)_130px_90px_100px_116px] items-center px-5 text-sm hover:bg-slate-50/70">
                    <div className="flex min-w-0 items-center gap-2" style={{ paddingLeft: `${depth * 28}px` }}>
                      {hasChildren && !query ? (
                        <button type="button" onClick={() => setExpanded((current) => { const next = new Set(current); if (next.has(category.id)) next.delete(category.id); else next.add(category.id); return next })} className="flex size-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100" aria-label={isExpanded ? "Thu gọn" : "Mở rộng"}>
                          {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                        </button>
                      ) : <span className="w-7" />}
                      <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${depth === 0 ? "bg-indigo-50 text-indigo-600" : "bg-slate-50 text-slate-400"}`}><Folder className="size-4" /></span>
                      <div className="min-w-0"><p className="truncate font-semibold text-slate-700">{category.name}</p><p className="truncate text-[11px] text-slate-400">/{category.slug}</p></div>
                    </div>
                    <span className="text-slate-500">{category.kind}</span>
                    <span className="text-right font-semibold text-slate-600">{category.count}</span>
                    <span><Badge className={category.status === "Hiển thị" ? "border-0 bg-emerald-50 text-emerald-700" : "border-0 bg-slate-100 text-slate-500"}>{category.status}</Badge></span>
                    <div className="flex justify-end gap-1">
                      <Button type="button" variant="ghost" size="icon-sm" onClick={() => setEditor({ parentId: category.id })} className="rounded-lg text-slate-400 hover:text-indigo-600" aria-label={`Thêm danh mục con cho ${category.name}`}><FolderPlus /></Button>
                      <Button type="button" variant="ghost" size="icon-sm" onClick={() => setEditor({ record: category })} className="rounded-lg text-slate-400 hover:text-indigo-600" aria-label={`Sửa ${category.name}`}><Pencil /></Button>
                      <Button type="button" variant="ghost" size="icon-sm" onClick={() => setDeleteTarget(category)} className="rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label={`Xóa ${category.name}`}><Trash2 /></Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">{categories.length} danh mục · Tối đa 3 cấp được khuyến nghị để dễ điều hướng.</div>
      </section>

      <Dialog open={Boolean(editor)} onOpenChange={(open) => !open && setEditor(null)}>
        <DialogContent className="rounded-2xl p-0 sm:max-w-lg">
          {editor ? <CategoryForm key={editor.record?.id ?? editor.parentId ?? "new"} categories={categories} record={editor.record} defaultParentId={editor.parentId} onCancel={() => setEditor(null)} onSave={save} /> : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader><AlertDialogMedia className="bg-rose-50 text-rose-600"><Trash2 /></AlertDialogMedia><AlertDialogTitle>Xóa danh mục?</AlertDialogTitle><AlertDialogDescription>“{deleteTarget?.name}” và toàn bộ danh mục con sẽ bị xóa khỏi cache trình duyệt.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel className="rounded-xl">Hủy</AlertDialogCancel><AlertDialogAction onClick={confirmDelete} className="rounded-xl bg-rose-600 text-white hover:bg-rose-700">Xóa cây danh mục</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function CategoryForm({ categories, record, defaultParentId, onCancel, onSave }: { categories: CategoryRecord[]; record?: CategoryRecord; defaultParentId?: string; onCancel: () => void; onSave: (record: CategoryRecord) => void }) {
  const availableParents = categories.filter((item) => item.id !== record?.id && !collectDescendantIds(record?.id ?? "", categories).has(item.id))

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    onSave({
      id: record?.id ?? `CAT-${String(Date.now()).slice(-6)}`,
      name: String(data.get("name") ?? ""),
      slug: String(data.get("slug") ?? ""),
      kind: String(data.get("kind") ?? "Sản phẩm"),
      count: record?.count ?? 0,
      status: String(data.get("status") ?? "Hiển thị"),
      parentId: String(data.get("parentId") ?? "") || null,
    })
  }

  return (
    <form onSubmit={submit}>
      <DialogHeader className="border-b border-slate-100 px-6 py-5"><DialogTitle className="text-lg">{record ? "Chỉnh sửa danh mục" : defaultParentId ? "Thêm danh mục con" : "Thêm danh mục gốc"}</DialogTitle><DialogDescription>Danh mục được lưu trong cache và cập nhật ngay trên cây.</DialogDescription></DialogHeader>
      <div className="space-y-4 px-6 py-5">
        <AdminLabel label="Tên danh mục" required><Input name="name" required defaultValue={record?.name} placeholder="Ví dụ: Dáng móng oval" className="mt-1.5 h-10 rounded-xl border-slate-200 shadow-none" /></AdminLabel>
        <AdminLabel label="Slug" required><Input name="slug" required defaultValue={record?.slug} placeholder="dang-mong-oval" pattern="[a-z0-9-]+" className="mt-1.5 h-10 rounded-xl border-slate-200 shadow-none" /></AdminLabel>
        <div className="grid gap-4 sm:grid-cols-2">
          <AdminLabel label="Loại"><select name="kind" defaultValue={record?.kind ?? "Sản phẩm"} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option>Sản phẩm</option><option>Bài viết</option></select></AdminLabel>
          <AdminLabel label="Trạng thái"><select name="status" defaultValue={record?.status ?? "Hiển thị"} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option>Hiển thị</option><option>Ẩn</option></select></AdminLabel>
        </div>
        <AdminLabel label="Danh mục cha"><select name="parentId" defaultValue={record?.parentId ?? defaultParentId ?? ""} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="">— Danh mục gốc —</option>{availableParents.map((item) => <option key={item.id} value={item.id}>{"—".repeat(getDepth(item, categories))} {item.name}</option>)}</select></AdminLabel>
      </div>
      <DialogFooter className="mx-0 mb-0 rounded-b-2xl px-6 py-4"><Button type="button" variant="outline" onClick={onCancel} className="rounded-xl">Hủy</Button><Button type="submit" className="rounded-xl bg-indigo-600 text-white hover:bg-indigo-700">Lưu danh mục</Button></DialogFooter>
    </form>
  )
}

function AdminLabel({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className="block"><span className="text-xs font-semibold text-slate-600">{label}{required ? <span className="text-rose-500"> *</span> : null}</span>{children}</label>
}

function flattenTree(categories: CategoryRecord[], expanded: Set<string>, parentId: string | null = null, depth = 0): { category: CategoryRecord; depth: number }[] {
  return categories.filter((category) => category.parentId === parentId).flatMap((category) => [{ category, depth }, ...(expanded.has(category.id) ? flattenTree(categories, expanded, category.id, depth + 1) : [])])
}

function getDepth(category: CategoryRecord, categories: CategoryRecord[]) {
  let depth = 0
  let current = category
  while (current.parentId && depth < 10) {
    const parent = categories.find((item) => item.id === current.parentId)
    if (!parent) break
    depth += 1
    current = parent
  }
  return depth
}

function collectDescendantIds(id: string, categories: CategoryRecord[]) {
  const ids = new Set<string>(id ? [id] : [])
  let changed = true
  while (changed) {
    changed = false
    for (const category of categories) {
      if (category.parentId && ids.has(category.parentId) && !ids.has(category.id)) { ids.add(category.id); changed = true }
    }
  }
  return ids
}
