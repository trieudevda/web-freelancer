export type FieldType = "text" | "number" | "date" | "textarea" | "select"

export type ResourceField = {
  key: string
  label: string
  type: FieldType
  required?: boolean
  options?: string[]
  placeholder?: string
}

export type ResourceColumn = {
  key: string
  label: string
  align?: "left" | "right"
}

export type AdminRecord = {
  id: string
  name: string
  status: string
  image?: string
  [key: string]: string | undefined
}

export type ResourceConfig = {
  slug: string
  title: string
  singular: string
  description: string
  icon: string
  idPrefix: string
  columns: ResourceColumn[]
  fields: ResourceField[]
  items: AdminRecord[]
}

export const resources: ResourceConfig[] = [
  {
    slug: "products",
    title: "Sản phẩm",
    singular: "sản phẩm",
    description: "Quản lý mỹ phẩm, móng tay giả, giá bán và tồn kho.",
    icon: "package",
    idPrefix: "SP",
    columns: [
      { key: "name", label: "Sản phẩm" },
      { key: "category", label: "Danh mục" },
      { key: "price", label: "Giá bán", align: "right" },
      { key: "stock", label: "Tồn kho", align: "right" },
      { key: "status", label: "Trạng thái" },
    ],
    fields: [
      { key: "name", label: "Tên sản phẩm", type: "text", required: true, placeholder: "Ví dụ: Móng Pearl Kiss" },
      { key: "category", label: "Danh mục", type: "select", required: true, options: ["Móng tay giả", "Chăm sóc da", "Trang điểm", "Dụng cụ"] },
      { key: "price", label: "Giá bán", type: "text", required: true, placeholder: "189.000₫" },
      { key: "stock", label: "Tồn kho", type: "number", required: true },
      { key: "sku", label: "SKU", type: "text", required: true },
      { key: "status", label: "Trạng thái", type: "select", required: true, options: ["Đang bán", "Bản nháp", "Hết hàng"] },
      { key: "description", label: "Mô tả ngắn", type: "textarea", placeholder: "Điểm nổi bật của sản phẩm" },
    ],
    items: [
      { id: "SP-1001", name: "Móng Pearl Kiss", category: "Móng tay giả", price: "189.000₫", stock: "48", sku: "NAIL-PK01", status: "Đang bán", description: "Móng oval ngọc trai tông nude.", image: "/images/nails-pearl-tip.png" },
      { id: "SP-1002", name: "Tinh chất Rose Dew", category: "Chăm sóc da", price: "329.000₫", stock: "32", sku: "SKIN-RD02", status: "Đang bán", description: "Tinh chất cấp ẩm dịu nhẹ.", image: "/images/serum-rose-dew.png" },
      { id: "SP-1003", name: "Kem dưỡng Cloud Cream", category: "Chăm sóc da", price: "289.000₫", stock: "21", sku: "SKIN-CC03", status: "Đang bán", description: "Kem dưỡng ẩm kết cấu mây.", image: "/images/cream-cloud.png" },
      { id: "SP-1004", name: "Dầu môi Rose Glaze", category: "Trang điểm", price: "219.000₫", stock: "0", sku: "MAKE-RG04", status: "Hết hàng", description: "Dầu môi bóng nhẹ màu hồng trà.", image: "/images/lip-oil-rose.png" },
      { id: "SP-1005", name: "Móng Lavender Veil", category: "Móng tay giả", price: "199.000₫", stock: "15", sku: "NAIL-LV05", status: "Bản nháp", description: "Bộ móng tím sương dáng hạnh nhân.", image: "/images/nails-pearl-tip.png" },
    ],
  },
  {
    slug: "orders",
    title: "Đơn hàng",
    singular: "đơn hàng",
    description: "Theo dõi đơn, thanh toán và trạng thái giao hàng.",
    icon: "receipt",
    idPrefix: "DH",
    columns: [
      { key: "name", label: "Mã đơn" },
      { key: "customer", label: "Khách hàng" },
      { key: "total", label: "Tổng tiền", align: "right" },
      { key: "date", label: "Ngày đặt" },
      { key: "status", label: "Trạng thái" },
    ],
    fields: [
      { key: "name", label: "Mã đơn", type: "text", required: true },
      { key: "customer", label: "Khách hàng", type: "text", required: true },
      { key: "total", label: "Tổng tiền", type: "text", required: true },
      { key: "date", label: "Ngày đặt", type: "date", required: true },
      { key: "payment", label: "Thanh toán", type: "select", options: ["Đã thanh toán", "COD", "Hoàn tiền"] },
      { key: "status", label: "Trạng thái", type: "select", required: true, options: ["Chờ xác nhận", "Đang chuẩn bị", "Đang giao", "Hoàn tất", "Đã hủy"] },
      { key: "note", label: "Ghi chú", type: "textarea" },
    ],
    items: [
      { id: "DH-2048", name: "#MB2048", customer: "Nguyễn Minh Anh", total: "518.000₫", date: "2026-09-25", payment: "Đã thanh toán", status: "Chờ xác nhận", note: "Giao giờ hành chính" },
      { id: "DH-2047", name: "#MB2047", customer: "Trần Gia Hân", total: "329.000₫", date: "2026-09-25", payment: "COD", status: "Đang chuẩn bị", note: "" },
      { id: "DH-2046", name: "#MB2046", customer: "Lê Ngọc Mai", total: "736.000₫", date: "2026-09-24", payment: "Đã thanh toán", status: "Đang giao", note: "Gọi trước khi giao" },
      { id: "DH-2045", name: "#MB2045", customer: "Phạm Khánh Vy", total: "189.000₫", date: "2026-09-24", payment: "Đã thanh toán", status: "Hoàn tất", note: "" },
      { id: "DH-2044", name: "#MB2044", customer: "Võ Hà My", total: "408.000₫", date: "2026-09-23", payment: "Hoàn tiền", status: "Đã hủy", note: "Khách đổi ý" },
    ],
  },
  {
    slug: "posts",
    title: "Bài viết",
    singular: "bài viết",
    description: "Quản lý nội dung Beauty Journal và lịch xuất bản.",
    icon: "file-text",
    idPrefix: "BV",
    columns: [
      { key: "name", label: "Tiêu đề" },
      { key: "category", label: "Chuyên mục" },
      { key: "author", label: "Tác giả" },
      { key: "date", label: "Ngày đăng" },
      { key: "status", label: "Trạng thái" },
    ],
    fields: [
      { key: "name", label: "Tiêu đề", type: "text", required: true },
      { key: "category", label: "Chuyên mục", type: "select", options: ["Nail guide", "Skin journal", "Beauty notes", "Tin thương hiệu"] },
      { key: "author", label: "Tác giả", type: "text", required: true },
      { key: "date", label: "Ngày đăng", type: "date" },
      { key: "status", label: "Trạng thái", type: "select", options: ["Đã xuất bản", "Bản nháp", "Đã lên lịch"] },
      { key: "description", label: "Mô tả", type: "textarea", required: true },
    ],
    items: [
      { id: "BV-301", name: "Chọn dáng móng hợp với đôi tay", category: "Nail guide", author: "Mây Editorial", date: "2026-09-22", status: "Đã xuất bản", description: "Hướng dẫn chọn dáng móng nhanh." },
      { id: "BV-302", name: "Layer serum đúng cách", category: "Skin journal", author: "Hà Linh", date: "2026-09-20", status: "Đã xuất bản", description: "Routine serum không gây bí da." },
      { id: "BV-303", name: "Routine tối giản cho ngày bận", category: "Beauty notes", author: "Mây Editorial", date: "2026-09-28", status: "Đã lên lịch", description: "Ba bước dưỡng da thiết yếu." },
      { id: "BV-304", name: "Bảng màu mùa thu 2026", category: "Nail guide", author: "Khánh An", date: "", status: "Bản nháp", description: "Các sắc móng được yêu thích." },
    ],
  },
  {
    slug: "customers",
    title: "Khách hàng",
    singular: "khách hàng",
    description: "Quản lý hồ sơ, hạng thành viên và lịch sử mua hàng.",
    icon: "users",
    idPrefix: "KH",
    columns: [
      { key: "name", label: "Khách hàng" },
      { key: "email", label: "Email" },
      { key: "orders", label: "Số đơn", align: "right" },
      { key: "spent", label: "Đã chi", align: "right" },
      { key: "status", label: "Hạng" },
    ],
    fields: [
      { key: "name", label: "Họ và tên", type: "text", required: true },
      { key: "email", label: "Email", type: "text", required: true },
      { key: "phone", label: "Số điện thoại", type: "text" },
      { key: "orders", label: "Số đơn", type: "number" },
      { key: "spent", label: "Đã chi", type: "text" },
      { key: "status", label: "Hạng thành viên", type: "select", options: ["Mới", "Hồng", "Ngọc trai", "Kim cương"] },
      { key: "note", label: "Ghi chú", type: "textarea" },
    ],
    items: [
      { id: "KH-501", name: "Nguyễn Minh Anh", email: "minhanh@example.com", phone: "0901 234 567", orders: "12", spent: "4.280.000₫", status: "Kim cương", note: "Ưu tiên sản phẩm dịu nhẹ" },
      { id: "KH-502", name: "Trần Gia Hân", email: "giahan@example.com", phone: "0912 330 221", orders: "7", spent: "2.190.000₫", status: "Ngọc trai", note: "" },
      { id: "KH-503", name: "Lê Ngọc Mai", email: "ngocmai@example.com", phone: "0988 412 220", orders: "4", spent: "1.460.000₫", status: "Hồng", note: "Thích móng dáng oval" },
      { id: "KH-504", name: "Phạm Khánh Vy", email: "khanhvy@example.com", phone: "0935 908 118", orders: "1", spent: "189.000₫", status: "Mới", note: "" },
    ],
  },
  {
    slug: "coupons",
    title: "Mã giảm giá",
    singular: "mã giảm giá",
    description: "Tạo và kiểm soát các chương trình ưu đãi.",
    icon: "badge-percent",
    idPrefix: "GG",
    columns: [
      { key: "name", label: "Mã" },
      { key: "value", label: "Ưu đãi" },
      { key: "usage", label: "Đã dùng", align: "right" },
      { key: "expiry", label: "Hết hạn" },
      { key: "status", label: "Trạng thái" },
    ],
    fields: [
      { key: "name", label: "Mã giảm giá", type: "text", required: true },
      { key: "value", label: "Giá trị", type: "text", required: true, placeholder: "10% hoặc 50.000₫" },
      { key: "usage", label: "Lượt sử dụng", type: "number" },
      { key: "limit", label: "Giới hạn", type: "number" },
      { key: "expiry", label: "Ngày hết hạn", type: "date" },
      { key: "status", label: "Trạng thái", type: "select", options: ["Đang chạy", "Đã lên lịch", "Hết hạn", "Tạm dừng"] },
      { key: "description", label: "Điều kiện", type: "textarea" },
    ],
    items: [
      { id: "GG-701", name: "WELCOME10", value: "10%", usage: "86", limit: "200", expiry: "2026-12-31", status: "Đang chạy", description: "Đơn đầu tiên từ 299.000₫" },
      { id: "GG-702", name: "NAIL50", value: "50.000₫", usage: "34", limit: "100", expiry: "2026-10-15", status: "Đang chạy", description: "Đơn móng từ 399.000₫" },
      { id: "GG-703", name: "PINKDAY", value: "15%", usage: "0", limit: "150", expiry: "2026-10-20", status: "Đã lên lịch", description: "Toàn bộ mỹ phẩm" },
      { id: "GG-704", name: "SUMMER20", value: "20%", usage: "150", limit: "150", expiry: "2026-08-31", status: "Hết hạn", description: "Chương trình mùa hè" },
    ],
  },
  {
    slug: "reviews",
    title: "Đánh giá & bình luận",
    singular: "đánh giá",
    description: "Kiểm duyệt đánh giá sản phẩm và bình luận bài viết.",
    icon: "messages-square",
    idPrefix: "DG",
    columns: [
      { key: "name", label: "Người gửi" },
      { key: "target", label: "Nội dung liên quan" },
      { key: "type", label: "Loại" },
      { key: "rating", label: "Điểm", align: "right" },
      { key: "status", label: "Trạng thái" },
    ],
    fields: [
      { key: "name", label: "Người gửi", type: "text", required: true },
      { key: "target", label: "Sản phẩm / bài viết", type: "text", required: true },
      { key: "type", label: "Loại", type: "select", options: ["Đánh giá sản phẩm", "Bình luận bài viết"] },
      { key: "rating", label: "Điểm đánh giá", type: "select", options: ["5", "4", "3", "2", "1", "—"] },
      { key: "status", label: "Trạng thái", type: "select", options: ["Đã duyệt", "Chờ duyệt", "Đã ẩn"] },
      { key: "content", label: "Nội dung", type: "textarea", required: true },
    ],
    items: [
      { id: "DG-901", name: "Nguyễn Minh Anh", target: "Móng Pearl Kiss", type: "Đánh giá sản phẩm", rating: "5", status: "Đã duyệt", content: "Móng rất xinh, form vừa tay và dễ dán." },
      { id: "DG-902", name: "Trần Gia Hân", target: "Tinh chất Rose Dew", type: "Đánh giá sản phẩm", rating: "5", status: "Chờ duyệt", content: "Kết cấu nhẹ và thấm nhanh." },
      { id: "DG-903", name: "Lê Ngọc Mai", target: "Layer serum đúng cách", type: "Bình luận bài viết", rating: "—", status: "Chờ duyệt", content: "Bài viết rất dễ áp dụng." },
      { id: "DG-904", name: "Tài khoản ẩn danh", target: "Dầu môi Rose Glaze", type: "Đánh giá sản phẩm", rating: "2", status: "Đã ẩn", content: "Nội dung cần kiểm duyệt." },
    ],
  },
  {
    slug: "staff",
    title: "Nhân sự & phân quyền",
    singular: "tài khoản nhân sự",
    description: "Quản lý tài khoản truy cập và vai trò trong khu quản trị.",
    icon: "user-cog",
    idPrefix: "NV",
    columns: [
      { key: "name", label: "Nhân sự" },
      { key: "email", label: "Email" },
      { key: "role", label: "Vai trò" },
      { key: "lastActive", label: "Hoạt động gần nhất" },
      { key: "status", label: "Trạng thái" },
    ],
    fields: [
      { key: "name", label: "Họ và tên", type: "text", required: true },
      { key: "email", label: "Email", type: "text", required: true },
      { key: "role", label: "Vai trò", type: "select", options: ["Quản trị viên", "Quản lý cửa hàng", "Biên tập viên", "Chăm sóc khách hàng"] },
      { key: "lastActive", label: "Hoạt động gần nhất", type: "text" },
      { key: "status", label: "Trạng thái", type: "select", options: ["Đang hoạt động", "Đã khóa", "Chờ xác nhận"] },
      { key: "note", label: "Ghi chú quyền hạn", type: "textarea" },
    ],
    items: [
      { id: "NV-101", name: "Mây Admin", email: "admin@maybeauty.vn", role: "Quản trị viên", lastActive: "Vừa xong", status: "Đang hoạt động", note: "Toàn quyền" },
      { id: "NV-102", name: "Hà Linh", email: "linh@maybeauty.vn", role: "Biên tập viên", lastActive: "25/09/2026", status: "Đang hoạt động", note: "Quản lý bài viết và media" },
      { id: "NV-103", name: "Khánh An", email: "an@maybeauty.vn", role: "Chăm sóc khách hàng", lastActive: "24/09/2026", status: "Đang hoạt động", note: "Đơn hàng và khách hàng" },
      { id: "NV-104", name: "Tài khoản mới", email: "new@maybeauty.vn", role: "Quản lý cửa hàng", lastActive: "—", status: "Chờ xác nhận", note: "" },
    ],
  },
  {
    slug: "media",
    title: "Thư viện ảnh",
    singular: "tệp ảnh",
    description: "Quản lý ảnh sản phẩm và nội dung truyền thông.",
    icon: "images",
    idPrefix: "IMG",
    columns: [
      { key: "name", label: "Tên tệp" },
      { key: "type", label: "Nhóm" },
      { key: "size", label: "Dung lượng", align: "right" },
      { key: "date", label: "Ngày thêm" },
      { key: "status", label: "Trạng thái" },
    ],
    fields: [
      { key: "name", label: "Tên tệp", type: "text", required: true },
      { key: "type", label: "Nhóm", type: "select", options: ["Sản phẩm", "Banner", "Bài viết", "Khác"] },
      { key: "size", label: "Dung lượng", type: "text" },
      { key: "date", label: "Ngày thêm", type: "date" },
      { key: "status", label: "Trạng thái", type: "select", options: ["Đang dùng", "Chưa dùng"] },
      { key: "alt", label: "Văn bản thay thế", type: "textarea" },
    ],
    items: [
      { id: "IMG-801", name: "nails-pearl-tip.png", type: "Sản phẩm", size: "1.8 MB", date: "2026-09-23", status: "Đang dùng", alt: "Bộ móng Pearl Kiss", image: "/images/nails-pearl-tip.png" },
      { id: "IMG-802", name: "serum-rose-dew.png", type: "Sản phẩm", size: "1.3 MB", date: "2026-09-23", status: "Đang dùng", alt: "Tinh chất Rose Dew", image: "/images/serum-rose-dew.png" },
      { id: "IMG-803", name: "cream-cloud.png", type: "Sản phẩm", size: "1.6 MB", date: "2026-09-23", status: "Đang dùng", alt: "Kem dưỡng Cloud Cream", image: "/images/cream-cloud.png" },
      { id: "IMG-804", name: "lip-oil-rose.png", type: "Sản phẩm", size: "2.0 MB", date: "2026-09-23", status: "Đang dùng", alt: "Dầu môi Rose Glaze", image: "/images/lip-oil-rose.png" },
      { id: "IMG-805", name: "hero-beauty-liquid.png", type: "Banner", size: "1.7 MB", date: "2026-09-23", status: "Đang dùng", alt: "Bộ sưu tập Mây Beauty", image: "/images/hero-beauty-liquid.png" },
    ],
  },
]

export const resourceMap = Object.fromEntries(resources.map((resource) => [resource.slug, resource])) as Record<string, ResourceConfig>

export type CategoryRecord = {
  id: string
  name: string
  slug: string
  kind: string
  count: number
  status: string
  parentId: string | null
}

export const categorySeed: CategoryRecord[] = [
  { id: "CAT-01", name: "Sản phẩm", slug: "san-pham", kind: "Sản phẩm", count: 5, status: "Hiển thị", parentId: null },
  { id: "CAT-02", name: "Móng tay giả", slug: "mong-tay-gia", kind: "Sản phẩm", count: 2, status: "Hiển thị", parentId: "CAT-01" },
  { id: "CAT-03", name: "Dáng oval", slug: "dang-oval", kind: "Sản phẩm", count: 1, status: "Hiển thị", parentId: "CAT-02" },
  { id: "CAT-04", name: "Dáng hạnh nhân", slug: "dang-hanh-nhan", kind: "Sản phẩm", count: 1, status: "Hiển thị", parentId: "CAT-02" },
  { id: "CAT-05", name: "Chăm sóc da", slug: "cham-soc-da", kind: "Sản phẩm", count: 2, status: "Hiển thị", parentId: "CAT-01" },
  { id: "CAT-06", name: "Trang điểm", slug: "trang-diem", kind: "Sản phẩm", count: 1, status: "Hiển thị", parentId: "CAT-01" },
  { id: "CAT-07", name: "Beauty Journal", slug: "beauty-journal", kind: "Bài viết", count: 4, status: "Hiển thị", parentId: null },
  { id: "CAT-08", name: "Nail guide", slug: "nail-guide", kind: "Bài viết", count: 2, status: "Hiển thị", parentId: "CAT-07" },
  { id: "CAT-09", name: "Skin journal", slug: "skin-journal", kind: "Bài viết", count: 1, status: "Hiển thị", parentId: "CAT-07" },
  { id: "CAT-10", name: "Beauty notes", slug: "beauty-notes", kind: "Bài viết", count: 1, status: "Ẩn", parentId: "CAT-07" },
]

export const adminCacheKey = (slug: string) => `may-beauty:admin:${slug}:v1`
