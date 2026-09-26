"use client"

import * as React from "react"
import { Bell, Globe2, Mail, RotateCcw, Save, Search, ShieldCheck, Store } from "lucide-react"

import { useLocalCache } from "@/hooks/use-local-cache"
import { adminCacheKey } from "@/lib/admin-data"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"

type Settings = {
  storeName: string
  tagline: string
  email: string
  phone: string
  address: string
  currency: string
  timezone: string
  orderPrefix: string
  lowStock: string
  metaTitle: string
  metaDescription: string
  maintenance: boolean
  guestCheckout: boolean
  stockAlerts: boolean
  orderEmails: boolean
  reviewModeration: boolean
}

const settingsSeed: Settings = {
  storeName: "Mây Beauty",
  tagline: "Đẹp theo cách rất riêng bạn",
  email: "hello@maybeauty.vn",
  phone: "1900 1234",
  address: "24 Nguyễn Trãi, Quận 1, TP. Hồ Chí Minh",
  currency: "VND",
  timezone: "Asia/Bangkok",
  orderPrefix: "MB",
  lowStock: "10",
  metaTitle: "Mây Beauty — Mỹ phẩm & móng tay giả",
  metaDescription: "Mỹ phẩm dịu nhẹ, móng tay giả và beauty journal dành cho bạn.",
  maintenance: false,
  guestCheckout: true,
  stockAlerts: true,
  orderEmails: true,
  reviewModeration: true,
}

export function SettingsForm() {
  const [settings, setSettings, resetSettings] = useLocalCache<Settings>(adminCacheKey("settings"), settingsSeed)

  return (
    <SettingsEditor
      key={JSON.stringify(settings)}
      initialSettings={settings}
      onSave={(next) => {
        setSettings(next)
        toast.add({ title: "Đã lưu cài đặt", description: "Cấu hình được lưu trong cache trình duyệt.", type: "success" })
      }}
      onRestore={() => {
        resetSettings()
        toast.add({ title: "Đã khôi phục cài đặt mặc định", type: "info" })
      }}
    />
  )
}

function SettingsEditor({ initialSettings, onSave, onRestore }: { initialSettings: Settings; onSave: (settings: Settings) => void; onRestore: () => void }) {
  const [draft, setDraft] = React.useState(initialSettings)

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSave(draft)
  }

  function restore() {
    setDraft(settingsSeed)
    onRestore()
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><h2 className="text-2xl font-bold tracking-[-0.03em] text-slate-900 sm:text-3xl">Cài đặt chung</h2><p className="mt-2 text-sm text-slate-500">Thiết lập thông tin cửa hàng, bán hàng, thông báo và SEO.</p></div>
        <div className="flex gap-2"><Button type="button" variant="outline" onClick={restore} className="h-10 rounded-xl border-slate-200"><RotateCcw /> Khôi phục</Button><Button type="submit" className="h-10 rounded-xl bg-indigo-600 px-4 text-white hover:bg-indigo-700"><Save /> Lưu cài đặt</Button></div>
      </div>

      <SettingsSection icon={Store} title="Thông tin cửa hàng" description="Thông tin nhận diện cơ bản hiển thị trên website.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tên cửa hàng"><Input value={draft.storeName} onChange={(event) => update("storeName", event.target.value)} /></Field>
          <Field label="Thông điệp ngắn"><Input value={draft.tagline} onChange={(event) => update("tagline", event.target.value)} /></Field>
          <Field label="Email hỗ trợ"><Input type="email" value={draft.email} onChange={(event) => update("email", event.target.value)} /></Field>
          <Field label="Số điện thoại"><Input value={draft.phone} onChange={(event) => update("phone", event.target.value)} /></Field>
          <Field label="Địa chỉ" wide><Textarea value={draft.address} onChange={(event) => update("address", event.target.value)} /></Field>
        </div>
      </SettingsSection>

      <SettingsSection icon={Globe2} title="Khu vực & đơn hàng" description="Định dạng tiền tệ và quy ước xử lý đơn hàng.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Tiền tệ"><select value={draft.currency} onChange={(event) => update("currency", event.target.value)} className="admin-control"><option>VND</option><option>USD</option></select></Field>
          <Field label="Múi giờ"><select value={draft.timezone} onChange={(event) => update("timezone", event.target.value)} className="admin-control"><option>Asia/Bangkok</option><option>Asia/Ho_Chi_Minh</option></select></Field>
          <Field label="Tiền tố đơn hàng"><Input value={draft.orderPrefix} onChange={(event) => update("orderPrefix", event.target.value)} /></Field>
          <Field label="Cảnh báo tồn kho dưới"><Input type="number" min="0" value={draft.lowStock} onChange={(event) => update("lowStock", event.target.value)} /></Field>
        </div>
      </SettingsSection>

      <SettingsSection icon={Bell} title="Vận hành & thông báo" description="Bật hoặc tắt các hành vi của cửa hàng.">
        <div className="divide-y divide-slate-100">
          <SettingToggle label="Cho phép thanh toán không cần tài khoản" detail="Khách có thể hoàn tất đơn nhanh dưới dạng khách." checked={draft.guestCheckout} onCheckedChange={(checked) => update("guestCheckout", checked)} />
          <SettingToggle label="Cảnh báo sắp hết hàng" detail="Hiện cảnh báo khi tồn kho thấp hơn ngưỡng đã đặt." checked={draft.stockAlerts} onCheckedChange={(checked) => update("stockAlerts", checked)} />
          <SettingToggle label="Email trạng thái đơn hàng" detail="Gửi thông báo khi đơn chuyển trạng thái." checked={draft.orderEmails} onCheckedChange={(checked) => update("orderEmails", checked)} />
          <SettingToggle label="Kiểm duyệt đánh giá" detail="Đánh giá mới cần được duyệt trước khi hiển thị." checked={draft.reviewModeration} onCheckedChange={(checked) => update("reviewModeration", checked)} />
          <SettingToggle label="Chế độ bảo trì" detail="Tạm ẩn cửa hàng với khách truy cập." checked={draft.maintenance} onCheckedChange={(checked) => update("maintenance", checked)} danger />
        </div>
      </SettingsSection>

      <SettingsSection icon={Search} title="SEO mặc định" description="Nội dung dự phòng cho tiêu đề và mô tả tìm kiếm.">
        <div className="grid gap-4">
          <Field label="Meta title"><Input value={draft.metaTitle} maxLength={60} onChange={(event) => update("metaTitle", event.target.value)} /><small>{draft.metaTitle.length}/60 ký tự</small></Field>
          <Field label="Meta description"><Textarea value={draft.metaDescription} maxLength={160} onChange={(event) => update("metaDescription", event.target.value)} /><small>{draft.metaDescription.length}/160 ký tự</small></Field>
        </div>
      </SettingsSection>

      <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800"><ShieldCheck className="size-5 shrink-0" /><p><strong>Không có dữ liệu nào được gửi đi.</strong> Toàn bộ cài đặt hiện chỉ tồn tại trong cache của trình duyệt này.</p></div>
    </form>
  )
}

function SettingsSection({ icon: Icon, title, description, children }: { icon: typeof Mail; title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,.04)]">
      <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4 sm:px-6"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><Icon className="size-5" /></span><div><h3 className="font-semibold text-slate-800">{title}</h3><p className="mt-1 text-xs text-slate-400">{description}</p></div></div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  )
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return <label className={wide ? "sm:col-span-2" : ""}><span className="text-xs font-semibold text-slate-600">{label}</span><div className="mt-1.5 [&_input]:h-10 [&_input]:rounded-xl [&_input]:border-slate-200 [&_input]:shadow-none [&_textarea]:min-h-20 [&_textarea]:rounded-xl [&_textarea]:border-slate-200 [&_textarea]:shadow-none">{children}</div></label>
}

function SettingToggle({ label, detail, checked, onCheckedChange, danger }: { label: string; detail: string; checked: boolean; onCheckedChange: (checked: boolean) => void; danger?: boolean }) {
  return <div className="flex items-center justify-between gap-5 py-4 first:pt-0 last:pb-0"><div><p className={`text-sm font-semibold ${danger ? "text-rose-700" : "text-slate-700"}`}>{label}</p><p className="mt-1 text-xs leading-5 text-slate-400">{detail}</p></div><Switch checked={checked} onCheckedChange={onCheckedChange} className={danger ? "data-checked:bg-rose-600" : "data-checked:bg-indigo-600"} /></div>
}
