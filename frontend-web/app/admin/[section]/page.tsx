import { notFound } from "next/navigation"

import { ResourceManager } from "@/components/admin/resource-manager"
import { resourceMap, resources } from "@/lib/admin-data"

export function generateStaticParams() {
  return resources.map((resource) => ({ section: resource.slug }))
}

export default async function ResourcePage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params
  const config = resourceMap[section]
  if (!config) notFound()
  return <ResourceManager config={config} />
}
