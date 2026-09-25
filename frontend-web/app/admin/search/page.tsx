import { Suspense } from "react"

import { GlobalSearchFromUrl } from "@/components/admin/global-search"
import { Skeleton } from "@/components/ui/skeleton"

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchFallback />}>
      <GlobalSearchFromUrl />
    </Suspense>
  )
}

function SearchFallback() {
  return (
    <div className="space-y-6">
      <div className="space-y-2"><Skeleton className="h-9 w-60" /><Skeleton className="h-4 w-96 max-w-full" /></div>
      <Skeleton className="h-13 max-w-2xl rounded-2xl" />
      <Skeleton className="h-80 rounded-2xl" />
    </div>
  )
}
