"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowRight, FolderTree, Search } from "lucide-react"

import { adminCacheKey, categorySeed, resourceMap, type AdminRecord } from "@/lib/admin-data"
import { useLocalCache } from "@/hooks/use-local-cache"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { API_ENABLED } from "@/lib/api/config"

type SearchItem = { id: string; name: string; detail: string; status: string; href: string; section: string }

export function GlobalSearchFromUrl() {
  const searchParams = useSearchParams()
  const query = searchParams.get("q") ?? ""
  return <GlobalSearch key={query} initialQuery={query} />
}

export function GlobalSearch({ initialQuery }: { initialQuery: string }) {
  const router = useRouter()
  const [query, setQuery] = React.useState(initialQuery)
  const debouncedQuery = useDebouncedValue(query, 300)
  const [products] = useLocalCache<AdminRecord[]>(adminCacheKey("products"), resourceMap.products.items)
  const [orders] = useLocalCache<AdminRecord[]>(adminCacheKey("orders"), resourceMap.orders.items)
  const [posts] = useLocalCache<AdminRecord[]>(adminCacheKey("posts"), resourceMap.posts.items)
  const [customers] = useLocalCache<AdminRecord[]>(adminCacheKey("customers"), resourceMap.customers.items)
  const [coupons] = useLocalCache<AdminRecord[]>(adminCacheKey("coupons"), resourceMap.coupons.items)
  const [reviews] = useLocalCache<AdminRecord[]>(adminCacheKey("reviews"), resourceMap.reviews.items)
  const [staff] = useLocalCache<AdminRecord[]>(adminCacheKey("staff"), resourceMap.staff.items)
  const [media] = useLocalCache<AdminRecord[]>(adminCacheKey("media"), resourceMap.media.items)
  const [categories] = useLocalCache(adminCacheKey("categories"), categorySeed)

  const items = React.useMemo<SearchItem[]>(() => [
    ...mapResource(resourceMap.products.title, "products", products),
    ...mapResource(resourceMap.orders.title, "orders", orders),
    ...mapResource(resourceMap.posts.title, "posts", posts),
    ...mapResource(resourceMap.customers.title, "customers", customers),
    ...mapResource(resourceMap.coupons.title, "coupons", coupons),
    ...mapResource(resourceMap.reviews.title, "reviews", reviews),
    ...(API_ENABLED ? [] : mapResource(resourceMap.staff.title, "staff", staff)),
    ...(API_ENABLED ? [] : mapResource(resourceMap.media.title, "media", media)),
    ...categories.map((category) => ({ id: category.id, name: category.name, detail: `/${category.slug}`, status: category.status, href: "/admin/categories", section: "Danh mục" })),
  ], [categories, coupons, customers, media, orders, posts, products, reviews, staff])

  const results = React.useMemo(() => {
    const normalized = debouncedQuery.trim().toLocaleLowerCase("vi")
    if (!normalized) return []
    return items.filter((item) => [item.name, item.detail, item.id, item.status, item.section].some((value) => value.toLocaleLowerCase("vi").includes(normalized)))
  }, [debouncedQuery, items])

  React.useEffect(() => {
    const value = debouncedQuery.trim()
    const href = value ? `/admin/search?q=${encodeURIComponent(value)}` : "/admin/search"
    router.replace(href, { scroll: false })
  }, [debouncedQuery, router])

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = query.trim()
    router.push(value ? `/admin/search?q=${encodeURIComponent(value)}` : "/admin/search")
  }

  const grouped = results.reduce((groups, item) => {
    const section = groups.get(item.section) ?? []
    section.push(item)
    groups.set(item.section, section)
    return groups
  }, new Map<string, SearchItem[]>())

  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold tracking-[-0.03em] text-slate-900 sm:text-3xl">Tìm kiếm toàn cục</h2><p className="mt-2 text-sm text-slate-500">Tìm đồng thời trong tất cả dữ liệu đang có trong cache.</p></div>
      <form onSubmit={submit} className="relative max-w-2xl"><Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-slate-400" /><Input autoFocus value={query} maxLength={100} onChange={(event) => setQuery(event.target.value)} placeholder="Tên sản phẩm, mã đơn, khách hàng..." aria-label="Tìm kiếm realtime" className="h-13 rounded-2xl border-slate-200 bg-white pr-28 pl-12 text-base shadow-sm" /><button type="submit" className="admin-primary absolute top-1.5 right-1.5 h-10 rounded-xl px-4 text-sm font-semibold text-white">Tìm kiếm</button></form>

      {!debouncedQuery.trim() ? (
        <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 p-8 text-center"><span className="flex size-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500"><Search className="size-6" /></span><h3 className="mt-4 font-semibold text-slate-700">Bạn muốn tìm gì?</h3><p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">Tìm sản phẩm, đơn hàng, bài viết, khách hàng, mã giảm giá, ảnh hoặc danh mục.</p></div>
      ) : results.length === 0 ? (
        <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center"><Search className="size-8 text-slate-300" /><h3 className="mt-4 font-semibold text-slate-700">Không tìm thấy “{debouncedQuery}”</h3><p className="mt-2 text-sm text-slate-400">Thử từ khóa ngắn hơn hoặc kiểm tra lại chính tả.</p></div>
      ) : (
        <div className="space-y-5">
          <p className="text-sm text-slate-500" aria-live="polite">Tìm thấy <strong className="text-slate-800">{results.length}</strong> kết quả cho “{debouncedQuery}”</p>
          {Array.from(grouped.entries()).map(([section, sectionItems]) => (
            <section key={section} className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,.04)]">
              <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3"><FolderTree className="size-4 text-indigo-500" /><h3 className="text-sm font-semibold text-slate-700">{section}</h3><Badge className="ml-auto border-0 bg-slate-100 text-slate-500">{sectionItems.length}</Badge></div>
              <div className="divide-y divide-slate-100">
                {sectionItems.map((item) => <Link key={`${section}-${item.id}`} href={item.href} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-[10px] font-bold text-indigo-600">{item.id.slice(0, 3)}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-700">{item.name}</p><p className="mt-1 truncate text-xs text-slate-400">{item.detail}</p></div><Badge className="hidden border-0 bg-slate-100 text-slate-500 sm:inline-flex">{item.status}</Badge><ArrowRight className="size-4 text-slate-300" /></Link>)}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function mapResource(title: string, slug: string, records: AdminRecord[]): SearchItem[] {
  return records.map((record) => ({ id: record.id, name: record.name, detail: Object.entries(record).filter(([key, value]) => key !== "name" && key !== "image" && value).slice(0, 2).map(([, value]) => value).join(" · "), status: record.status, href: `/admin/${slug}`, section: title }))
}
