"use client"
/* eslint-disable @next/next/no-img-element -- Authenticated blob URLs cannot use the Next image optimizer. */

import * as React from "react"
import {
  Download, FileVideo2, Grid2X2, ImageIcon, List, LoaderCircle, MoreHorizontal,
  Pencil, Plus, RefreshCw, Replace, RotateCcw, Search, Trash2, UploadCloud,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { API_ENABLED } from "@/lib/api/config"
import { ApiError } from "@/lib/api/client"
import { cleanText, safeDownloadName } from "@/lib/security"
import { deleteDemoMedia, listDemoMedia, saveDemoMedia, seedDemoMedia } from "@/lib/media/media-cache"
import { mediaContent, mediaContentUrl, replaceMedia, restoreMedia, searchMedia, trashMedia, updateMedia, uploadMedia } from "@/lib/media/media-api"
import type { MediaItem, MediaStatus } from "@/lib/media/types"
import { MEDIA_ACCEPT, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, validateMediaFile } from "@/lib/media/validation"
import { useDebouncedValue } from "@/hooks/use-debounced-value"

const demoSeeds: MediaItem[] = [
  ["IMG-801", "nails-pearl-tip.png", "/images/nails-pearl-tip.png", "Bộ móng Pearl Kiss"],
  ["IMG-802", "serum-rose-dew.png", "/images/serum-rose-dew.png", "Tinh chất Rose Dew"],
  ["IMG-803", "cream-cloud.png", "/images/cream-cloud.png", "Kem dưỡng Cloud Cream"],
  ["IMG-804", "lip-oil-rose.png", "/images/lip-oil-rose.png", "Dầu môi Rose Glaze"],
  ["IMG-805", "hero-beauty-liquid.png", "/images/hero-beauty-liquid.png", "Bộ sưu tập Mây Beauty"],
].map(([id, originalName, assetUrl, altText], index) => ({
  id, originalName, assetUrl, altText, title: originalName.replace(/\.[^.]+$/, ""), mimeType: "image/png",
  mediaType: "image", size: 1_300_000 + index * 150_000, status: "active", createdAt: `2026-09-${23 - index}T08:00:00.000Z`, source: "demo",
}))

type Editor = { mode: "preview" | "edit" | "delete"; item: MediaItem } | null

function message(error: unknown) {
  return error instanceof ApiError || error instanceof Error ? error.message : "Vui lòng thử lại."
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(bytes > 10 * 1024 * 1024 ? 0 : 1)} MB`
}

function revokeObjectUrls(items: MediaItem[]) {
  items.forEach((item) => {
    if (item.assetUrl?.startsWith("blob:")) URL.revokeObjectURL(item.assetUrl)
  })
}

function withObjectUrl(item: MediaItem): MediaItem {
  return item.blob ? { ...item, assetUrl: URL.createObjectURL(item.blob) } : item
}

export function MediaLibrary() {
  const [items, setItems] = React.useState<MediaItem[]>([])
  const [query, setQuery] = React.useState("")
  const debouncedQuery = useDebouncedValue(query, 250)
  const [status, setStatus] = React.useState<MediaStatus>("active")
  const [kind, setKind] = React.useState<"all" | "image" | "video">("all")
  const [view, setView] = React.useState<"grid" | "list">("grid")
  const [busy, setBusy] = React.useState(true)
  const [uploading, setUploading] = React.useState(false)
  const [dragging, setDragging] = React.useState(false)
  const [editor, setEditor] = React.useState<Editor>(null)
  const fileInput = React.useRef<HTMLInputElement>(null)

  const load = React.useCallback(async () => {
    setBusy(true)
    try {
      const next = API_ENABLED
        ? (await searchMedia(debouncedQuery, status)).items
        : (await seedDemoMedia(demoSeeds)).filter((item) => item.status === status).map(withObjectUrl)
      setItems((current) => {
        revokeObjectUrls(current)
        return next
      })
    } catch (error) {
      toast.add({ title: "Không tải được thư viện", description: message(error), type: "error" })
    } finally {
      setBusy(false)
    }
  }, [debouncedQuery, status])

  React.useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const filtered = React.useMemo(() => {
    const normalized = debouncedQuery.trim().toLocaleLowerCase("vi")
    return items.filter((item) => {
      const matchesKind = kind === "all" || item.mediaType === kind
      const haystack = `${item.originalName} ${item.title ?? ""} ${item.altText ?? ""}`.toLocaleLowerCase("vi")
      return matchesKind && (!normalized || haystack.includes(normalized))
    })
  }, [debouncedQuery, items, kind])

  async function addFiles(input: FileList | File[]) {
    if (uploading) return
    const files = Array.from(input).slice(0, 20)
    if (!files.length) return
    if (input.length > 20) toast.add({ title: "Chỉ nhận 20 tệp mỗi lượt", type: "warning" })
    setUploading(true)
    try {
      const accepted: File[] = []
      for (const file of files) {
        const error = await validateMediaFile(file)
        if (error) toast.add({ title: `Bỏ qua ${safeDownloadName(file.name)}`, description: error, type: "warning" })
        else accepted.push(file)
      }
      if (!accepted.length) return

      if (API_ENABLED) {
        await uploadMedia(accepted)
      } else {
        await Promise.all(accepted.map((file) => saveDemoMedia({
          id: crypto.randomUUID(), originalName: safeDownloadName(file.name), mimeType: file.type,
          mediaType: file.type.startsWith("image/") ? "image" : "video", size: file.size,
          title: cleanText(file.name.replace(/\.[^.]+$/, ""), 255), altText: "", status: "active",
          createdAt: new Date().toISOString(), source: "demo", blob: file,
        })))
      }
      toast.add({ title: "Tải tệp thành công", description: `${accepted.length} tệp đã được thêm vào thư viện.`, type: "success" })
      setStatus("active")
      await load()
    } catch (error) {
      toast.add({ title: "Tải tệp thất bại", description: message(error), type: "error" })
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ""
    }
  }

  async function saveMetadata(item: MediaItem, value: { title: string; altText: string }) {
    try {
      if (API_ENABLED) await updateMedia(item.id, value)
      else await saveDemoMedia({ ...item, ...value, assetUrl: item.assetUrl?.startsWith("blob:") ? undefined : item.assetUrl, updatedAt: new Date().toISOString() })
      toast.add({ title: "Đã lưu thông tin media", type: "success" })
      setEditor(null)
      await load()
    } catch (error) {
      toast.add({ title: "Không thể lưu", description: message(error), type: "error" })
    }
  }

  async function replace(item: MediaItem, file: File) {
    const error = await validateMediaFile(file)
    if (error) {
      toast.add({ title: "Tệp thay thế không hợp lệ", description: error, type: "error" })
      return
    }
    try {
      if (API_ENABLED) await replaceMedia(item.id, file)
      else await saveDemoMedia({ ...item, originalName: safeDownloadName(file.name), mimeType: file.type, mediaType: file.type.startsWith("image/") ? "image" : "video", size: file.size, blob: file, assetUrl: undefined, updatedAt: new Date().toISOString() })
      toast.add({ title: "Đã thay tệp", description: file.name, type: "success" })
      setEditor(null)
      await load()
    } catch (reason) {
      toast.add({ title: "Không thể thay tệp", description: message(reason), type: "error" })
    }
  }

  async function remove(item: MediaItem) {
    try {
      if (API_ENABLED) await trashMedia(item.id)
      else await saveDemoMedia({ ...item, status: "pending_delete", deletedAt: new Date().toISOString(), deleteAfter: new Date(Date.now() + 7 * 86400000).toISOString(), assetUrl: item.assetUrl?.startsWith("blob:") ? undefined : item.assetUrl })
      toast.add({ title: "Đã chuyển vào thùng rác", description: "Có thể khôi phục trong 7 ngày.", type: "info" })
      setEditor(null)
      await load()
    } catch (error) {
      toast.add({ title: "Không thể xóa", description: message(error), type: "error" })
    }
  }

  async function restore(item: MediaItem) {
    try {
      if (API_ENABLED) await restoreMedia(item.id)
      else await saveDemoMedia({ ...item, status: "active", deletedAt: null, deleteAfter: null, assetUrl: item.assetUrl?.startsWith("blob:") ? undefined : item.assetUrl })
      toast.add({ title: "Đã khôi phục media", type: "success" })
      await load()
    } catch (error) {
      toast.add({ title: "Không thể khôi phục", description: message(error), type: "error" })
    }
  }

  async function download(item: MediaItem) {
    try {
      const blob: Blob = API_ENABLED
        ? await mediaContent(item.id)
        : item.blob ?? await fetch(item.assetUrl ?? "").then((response) => response.blob())
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = safeDownloadName(item.originalName)
      anchor.rel = "noopener"
      anchor.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
    } catch (error) {
      toast.add({ title: "Không thể tải xuống", description: message(error), type: "error" })
    }
  }

  async function clearDemoTrash() {
    const trashed = await listDemoMedia()
    await Promise.all(trashed.filter((item) => item.status === "pending_delete").map((item) => deleteDemoMedia(item.id)))
    toast.add({ title: "Đã dọn thùng rác demo", type: "success" })
    await load()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-3"><h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Thư viện media</h2><Badge className={API_ENABLED ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}>{API_ENABLED ? "API" : "IndexedDB demo"}</Badge></div>
          <p className="mt-2 text-sm text-slate-500">Upload, xem trước, tải xuống, sửa thông tin và stream ảnh/video mà không phải nhập đường dẫn thủ công.</p>
        </div>
        <Button onClick={() => fileInput.current?.click()} disabled={uploading} className="admin-primary h-10 self-start rounded-xl px-4 text-white">
          {uploading ? <LoaderCircle className="animate-spin" /> : <Plus />} Tải media
        </Button>
        <input ref={fileInput} type="file" className="sr-only" accept={MEDIA_ACCEPT} multiple onChange={(event) => event.target.files && void addFiles(event.target.files)} />
      </div>

      <button
        type="button"
        disabled={uploading}
        onClick={() => fileInput.current?.click()}
        onDragEnter={(event) => { event.preventDefault(); setDragging(true) }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => { if (event.currentTarget === event.target) setDragging(false) }}
        onDrop={(event) => { event.preventDefault(); setDragging(false); void addFiles(event.dataTransfer.files) }}
        className={`block w-full rounded-2xl border-2 border-dashed p-5 text-center transition-colors disabled:cursor-wait disabled:opacity-70 ${dragging ? "border-[var(--admin-accent)] bg-[var(--admin-accent-soft)]" : "border-slate-200 bg-white/70 hover:border-[var(--admin-accent)] hover:bg-[var(--admin-accent-soft)]"}`}
      >
        {uploading ? <LoaderCircle className="mx-auto size-7 animate-spin text-slate-400" /> : <UploadCloud className="mx-auto size-7 text-slate-400" />}
        <p className="mt-2 text-sm font-semibold text-slate-700">Nhấn để chọn hoặc kéo thả tối đa 20 ảnh/video</p>
        <p className="mt-1 text-xs text-slate-400">Ảnh tối đa {Math.round(MAX_IMAGE_BYTES / 1024 / 1024)} MB · Video tối đa {Math.round(MAX_VIDEO_BYTES / 1024 / 1024)} MB · kiểm tra phần mở rộng, MIME và chữ ký tệp.</p>
      </button>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,.04)]">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1 lg:max-w-sm"><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" /><Input value={query} maxLength={100} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm tên, tiêu đề, alt text…" className="h-10 rounded-xl bg-slate-50 pl-10" /></div>
          <select value={kind} onChange={(event) => setKind(event.target.value as typeof kind)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="all">Tất cả định dạng</option><option value="image">Ảnh</option><option value="video">Video</option></select>
          <select value={status} onChange={(event) => setStatus(event.target.value as MediaStatus)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="active">Đang dùng</option><option value="pending_delete">Thùng rác</option></select>
          <div className="flex items-center gap-2 lg:ml-auto">
            <Button variant="outline" size="icon" onClick={() => void load()} aria-label="Tải lại"><RefreshCw className={busy ? "animate-spin" : ""} /></Button>
            {!API_ENABLED && status === "pending_delete" ? <Button variant="outline" onClick={() => void clearDemoTrash()}><Trash2 /> Dọn demo</Button> : null}
            <div className="flex rounded-xl border p-1"><button type="button" onClick={() => setView("grid")} aria-label="Dạng lưới" className={`rounded-lg p-1.5 ${view === "grid" ? "admin-nav-active" : "text-slate-400"}`}><Grid2X2 className="size-4" /></button><button type="button" onClick={() => setView("list")} aria-label="Dạng danh sách" className={`rounded-lg p-1.5 ${view === "list" ? "admin-nav-active" : "text-slate-400"}`}><List className="size-4" /></button></div>
          </div>
        </div>

        {busy ? <div className="grid min-h-64 place-items-center"><LoaderCircle className="size-7 animate-spin text-slate-400" /></div> : filtered.length === 0 ? (
          <div className="grid min-h-64 place-items-center p-8 text-center"><div><ImageIcon className="mx-auto size-9 text-slate-300" /><p className="mt-3 font-semibold text-slate-600">Chưa có media phù hợp</p><p className="mt-1 text-sm text-slate-400">Kéo thả tệp vào vùng phía trên để bắt đầu.</p></div></div>
        ) : view === "grid" ? (
          <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filtered.map((item) => <MediaCard key={item.id} item={item} onPreview={() => setEditor({ mode: "preview", item })} onEdit={() => setEditor({ mode: "edit", item })} onDelete={() => setEditor({ mode: "delete", item })} onDownload={() => void download(item)} onRestore={() => void restore(item)} />)}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">{filtered.map((item) => <MediaRow key={item.id} item={item} onPreview={() => setEditor({ mode: "preview", item })} onEdit={() => setEditor({ mode: "edit", item })} onDelete={() => setEditor({ mode: "delete", item })} onDownload={() => void download(item)} onRestore={() => void restore(item)} />)}</div>
        )}
        <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">{filtered.length} media · ảnh được lazy-load · video chỉ tải khi mở xem trước</div>
      </section>

      <Dialog open={Boolean(editor)} onOpenChange={(open) => !open && setEditor(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl p-0 sm:max-w-3xl">
          {editor?.mode === "preview" ? <PreviewDialog item={editor.item} onDownload={() => void download(editor.item)} /> : null}
          {editor?.mode === "edit" ? <EditDialog item={editor.item} onSave={(value) => void saveMetadata(editor.item, value)} onReplace={(file) => void replace(editor.item, file)} /> : null}
          {editor?.mode === "delete" ? <DeleteDialog item={editor.item} onConfirm={() => void remove(editor.item)} /> : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

type MediaActions = { item: MediaItem; onPreview: () => void; onEdit: () => void; onDelete: () => void; onDownload: () => void; onRestore: () => void }

function MediaCard(props: MediaActions) {
  const { item } = props
  return <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-white">
    <button type="button" onClick={props.onPreview} className="relative block aspect-[4/3] w-full overflow-hidden bg-slate-100 text-left"><MediaAsset item={item} /><span className="absolute top-3 left-3 rounded-full bg-black/55 px-2 py-1 text-[10px] font-bold tracking-wide text-white uppercase">{item.mediaType}</span></button>
    <div className="flex items-start gap-2 p-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-700">{item.title || item.originalName}</p><p className="mt-1 text-xs text-slate-400">{formatSize(item.size)} · {new Intl.DateTimeFormat("vi-VN").format(new Date(item.createdAt))}</p></div><ActionMenu {...props} /></div>
  </article>
}

function MediaRow(props: MediaActions) {
  const { item } = props
  return <article className="flex items-center gap-4 p-4 hover:bg-slate-50"><button type="button" onClick={props.onPreview} className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-slate-100"><MediaAsset item={item} /></button><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-700">{item.title || item.originalName}</p><p className="mt-1 truncate text-xs text-slate-400">{item.mimeType} · {formatSize(item.size)} · {item.altText || "Chưa có alt text"}</p></div><ActionMenu {...props} /></article>
}

function ActionMenu(props: MediaActions) {
  return <DropdownMenu><DropdownMenuTrigger className="inline-flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100" aria-label={`Tác vụ cho ${props.item.originalName}`}><MoreHorizontal className="size-4" /></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-44"><DropdownMenuItem onClick={props.onPreview}><ImageIcon /> Xem trước</DropdownMenuItem><DropdownMenuItem onClick={props.onDownload}><Download /> Tải xuống</DropdownMenuItem>{props.item.status === "active" ? <><DropdownMenuItem onClick={props.onEdit}><Pencil /> Chỉnh sửa</DropdownMenuItem><DropdownMenuItem variant="destructive" onClick={props.onDelete}><Trash2 /> Chuyển vào rác</DropdownMenuItem></> : <DropdownMenuItem onClick={props.onRestore}><RotateCcw /> Khôi phục</DropdownMenuItem>}</DropdownMenuContent></DropdownMenu>
}

function MediaAsset({ item, contain = false }: { item: MediaItem; contain?: boolean }) {
  const source = item.assetUrl ?? (item.source === "api" && item.mediaType === "image" ? mediaContentUrl(item.id) : "")
  return <div className="absolute inset-0 grid place-items-center">
    {item.mediaType === "image" && source ? <img src={source} crossOrigin={item.source === "api" ? "use-credentials" : undefined} alt={item.altText || ""} loading="lazy" decoding="async" className={`size-full ${contain ? "object-contain" : "object-cover"}`} /> : item.mediaType === "video" ? <FileVideo2 className="size-10 text-slate-300" /> : <LoaderCircle className="size-5 animate-spin text-slate-300" />}
  </div>
}

function PreviewDialog({ item, onDownload }: { item: MediaItem; onDownload: () => void }) {
  const source = item.assetUrl ?? (item.source === "api" ? mediaContentUrl(item.id) : "")
  const credentials = item.source === "api" ? "use-credentials" as const : undefined
  return <><DialogHeader className="border-b px-6 py-5"><DialogTitle className="truncate pr-8">{item.title || item.originalName}</DialogTitle><DialogDescription>{item.mimeType} · {formatSize(item.size)}</DialogDescription></DialogHeader><div className="relative mx-6 my-2 grid min-h-72 place-items-center overflow-hidden rounded-2xl bg-slate-950/95">{!source ? <LoaderCircle className="size-7 animate-spin text-white/60" /> : item.mediaType === "video" ? <video src={source} crossOrigin={credentials} controls preload="metadata" playsInline className="max-h-[60vh] w-full" /> : <img src={source} crossOrigin={credentials} alt={item.altText || ""} className="max-h-[60vh] w-full object-contain" />}</div><div className="px-6 pb-5 text-sm text-slate-500"><p className="truncate"><strong className="text-slate-700">Tệp:</strong> {item.originalName}</p><p className="mt-1"><strong className="text-slate-700">Alt:</strong> {item.altText || "Chưa có"}</p></div><DialogFooter className="mx-0 mb-0 rounded-b-2xl px-6 py-4"><Button onClick={onDownload}><Download /> Tải xuống</Button></DialogFooter></>
}

function EditDialog({ item, onSave, onReplace }: { item: MediaItem; onSave: (value: { title: string; altText: string }) => void; onReplace: (file: File) => void }) {
  const replaceInput = React.useRef<HTMLInputElement>(null)
  function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); onSave({ title: cleanText(String(data.get("title") ?? ""), 255), altText: cleanText(String(data.get("altText") ?? ""), 500) }) }
  return <form onSubmit={submit}><DialogHeader className="border-b px-6 py-5"><DialogTitle>Chỉnh sửa media</DialogTitle><DialogDescription>Không chèn HTML; nội dung được hiển thị dưới dạng văn bản an toàn.</DialogDescription></DialogHeader><div className="space-y-4 px-6 py-5"><label className="block text-sm font-medium text-slate-700">Tiêu đề<Input name="title" maxLength={255} defaultValue={item.title ?? ""} className="mt-2" /></label><label className="block text-sm font-medium text-slate-700">Văn bản thay thế<Textarea name="altText" maxLength={500} defaultValue={item.altText ?? ""} className="mt-2 min-h-24" /></label><div className="rounded-xl border border-slate-200 p-4"><p className="text-sm font-semibold text-slate-700">Thay file, giữ nguyên ID</p><p className="mt-1 text-xs text-slate-400">File cũ được backend đưa vào thùng rác 7 ngày.</p><Button type="button" variant="outline" onClick={() => replaceInput.current?.click()} className="mt-3"><Replace /> Chọn file thay thế</Button><input ref={replaceInput} type="file" accept={MEDIA_ACCEPT} className="sr-only" onChange={(event) => event.target.files?.[0] && onReplace(event.target.files[0])} /></div></div><DialogFooter className="mx-0 mb-0 rounded-b-2xl px-6 py-4"><Button type="submit" className="admin-primary">Lưu thay đổi</Button></DialogFooter></form>
}

function DeleteDialog({ item, onConfirm }: { item: MediaItem; onConfirm: () => void }) {
  return <><DialogHeader className="px-6 pt-6"><div className="mb-2 flex size-11 items-center justify-center rounded-full bg-rose-50 text-rose-600"><Trash2 /></div><DialogTitle>Chuyển media vào thùng rác?</DialogTitle><DialogDescription>“{item.title || item.originalName}” có thể khôi phục trong 7 ngày trước khi backend xóa vĩnh viễn.</DialogDescription></DialogHeader><DialogFooter className="mx-0 mb-0 mt-4 rounded-b-2xl px-6 py-4"><Button type="button" variant="destructive" onClick={onConfirm}>Chuyển vào rác</Button></DialogFooter></>
}
