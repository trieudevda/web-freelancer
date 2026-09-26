import Image from "next/image"
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  ChevronRight,
  Droplets,
  Hand,
  HeartHandshake,
  Leaf,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
} from "lucide-react"

import { NewsletterForm } from "@/components/shop/newsletter-form"
import { ProductActions } from "@/components/shop/product-actions"
import { SiteHeader } from "@/components/shop/site-header"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

const products = [
  {
    id: "pearl-kiss",
    name: "Móng Pearl Kiss",
    category: "Móng tay giả",
    price: "189.000₫",
    oldPrice: "229.000₫",
    image: "/images/nails-pearl-tip.png",
    badge: "Bán chạy",
    rating: "4.9",
  },
  {
    id: "rose-dew",
    name: "Tinh chất Rose Dew",
    category: "Chăm sóc da",
    price: "329.000₫",
    image: "/images/serum-rose-dew.png",
    badge: "Mới",
    rating: "4.8",
  },
  {
    id: "cloud-cream",
    name: "Kem dưỡng Cloud Cream",
    category: "Dưỡng ẩm",
    price: "289.000₫",
    image: "/images/cream-cloud.png",
    badge: "Thuần chay",
    rating: "4.9",
  },
  {
    id: "rose-glaze",
    name: "Dầu môi Rose Glaze",
    category: "Trang điểm",
    price: "219.000₫",
    image: "/images/lip-oil-rose.png",
    badge: "Yêu thích",
    rating: "4.7",
  },
]

const categories = [
  {
    title: "Móng xinh mỗi ngày",
    description: "Mỏng nhẹ, dễ dán và vừa vặn tự nhiên.",
    icon: Hand,
    tone: "from-[#ffe5eb] to-[#f6eaff]",
  },
  {
    title: "Da căng mọng",
    description: "Chu trình dịu nhẹ cho làn da nhạy cảm.",
    icon: Droplets,
    tone: "from-[#e5f5f1] to-[#eef0ff]",
  },
  {
    title: "Trang điểm trong veo",
    description: "Tươi tắn tự nhiên, thoải mái cả ngày.",
    icon: Sparkles,
    tone: "from-[#fff0dc] to-[#ffe8f3]",
  },
]

const articles = [
  {
    tag: "Nail guide",
    title: "Chọn dáng móng hợp với đôi tay trong 3 phút",
    description:
      "Một hướng dẫn ngắn để nhận biết dáng tay và tìm bộ móng vừa vặn nhất.",
    image: "/images/nails-pearl-tip.png",
    readingTime: "5 phút đọc",
  },
  {
    tag: "Skin journal",
    title: "Layer serum đúng cách để da đủ ẩm, không bí",
    description:
      "Thứ tự đơn giản giúp mỗi lớp dưỡng phát huy hiệu quả mà vẫn nhẹ mặt.",
    image: "/images/serum-rose-dew.png",
    readingTime: "4 phút đọc",
  },
  {
    tag: "Beauty notes",
    title: "Routine tối giản cho những ngày thật bận",
    description:
      "Ba bước thiết yếu để bạn vẫn chăm sóc bản thân trong lịch trình dày đặc.",
    image: "/images/cream-cloud.png",
    readingTime: "3 phút đọc",
  },
]

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden">
      <div className="announcement-bar">
        <p>Miễn phí giao hàng cho đơn từ 499.000₫</p>
        <span aria-hidden="true">•</span>
        <p>Đổi trả dễ dàng trong 7 ngày</p>
      </div>

      <SiteHeader />

      <section className="page-shell pt-5 sm:pt-7" aria-labelledby="hero-title">
        <div className="hero-panel relative isolate min-h-[620px] overflow-hidden rounded-[2rem] sm:min-h-[670px] lg:min-h-[650px] lg:rounded-[2.5rem]">
          <Image
            src="/images/hero-beauty-liquid.png"
            alt="Bộ sưu tập mỹ phẩm và móng tay giả tông hồng ngọc trai"
            fill
            priority
            sizes="(max-width: 768px) 100vw, 1400px"
            className="object-cover object-[68%_center] sm:object-center"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,250,248,.98)_0%,rgba(255,248,248,.9)_35%,rgba(255,245,247,.28)_66%,rgba(255,255,255,.05)_100%)] max-lg:bg-[linear-gradient(180deg,rgba(255,250,248,.95)_0%,rgba(255,248,248,.74)_48%,rgba(255,244,248,.12)_75%)]" />
          <div className="liquid-orb liquid-orb-one" aria-hidden="true" />
          <div className="liquid-orb liquid-orb-two" aria-hidden="true" />

          <div className="relative z-10 flex min-h-[620px] max-w-2xl flex-col items-start px-6 py-10 sm:min-h-[670px] sm:px-12 sm:py-16 lg:min-h-[650px] lg:justify-center lg:px-20">
            <Badge className="mb-6 border-white/70 bg-white/55 px-3 py-2 text-[11px] font-semibold tracking-[0.16em] text-[#7b5264] uppercase shadow-none backdrop-blur-xl">
              <Sparkles data-icon="inline-start" /> Bộ sưu tập mới
            </Badge>
            <h1
              id="hero-title"
              className="max-w-xl text-[clamp(3.2rem,7vw,6.9rem)] leading-[0.89] font-semibold tracking-[-0.065em] text-[#34252d]"
            >
              Đẹp theo cách
              <span className="block font-serif font-normal text-[#a95f7f] italic">
                rất riêng bạn.
              </span>
            </h1>
            <p className="mt-7 max-w-md text-base leading-7 text-[#6f5b64] sm:text-lg sm:leading-8">
              Mỹ phẩm dịu nhẹ và những bộ móng xinh được chọn lọc để biến mỗi
              ngày chăm sóc bản thân thành một niềm vui nhỏ.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a className="primary-cta" href="#san-pham">
                Khám phá bộ sưu tập
                <ArrowRight className="size-4" aria-hidden="true" />
              </a>
              <a className="glass-cta" href="#nhat-ky">
                Đọc beauty journal
              </a>
            </div>
            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-[#6f5b64]">
              <span className="inline-flex items-center gap-2">
                <Leaf className="size-4 text-[#739678]" aria-hidden="true" />
                Thành phần lành tính
              </span>
              <span className="inline-flex items-center gap-2">
                <HeartHandshake className="size-4 text-[#b96e8c]" aria-hidden="true" />
                Không thử nghiệm động vật
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="page-shell relative z-20 -mt-8" aria-label="Cam kết mua sắm">
        <div className="glass-panel grid gap-3 rounded-[1.75rem] p-4 sm:grid-cols-3 sm:p-5">
          {[
            { icon: Truck, title: "Giao hàng toàn quốc", detail: "Nhanh chóng & an toàn" },
            { icon: ShieldCheck, title: "Thanh toán bảo mật", detail: "Thông tin luôn được bảo vệ" },
            { icon: PackageCheck, title: "Đổi trả dễ dàng", detail: "Hỗ trợ tận tâm trong 7 ngày" },
          ].map(({ icon: Icon, title, detail }) => (
            <div key={title} className="flex items-center gap-3 rounded-2xl px-3 py-3 sm:justify-center">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/75 text-[#a95f7f] shadow-[0_8px_25px_rgba(130,82,104,.09)]">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span>
                <strong className="block text-sm font-semibold text-[#3e3037]">{title}</strong>
                <span className="text-xs text-[#846f78]">{detail}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="page-shell section-space" aria-labelledby="category-title">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">Chọn điều bạn yêu</p>
            <h2 id="category-title" className="section-title">Góc làm đẹp của bạn</h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-muted-foreground sm:text-right">
            Từ một bộ móng mới đến chu trình dưỡng da tối giản — tìm món nhỏ
            khiến bạn thấy vui hơn hôm nay.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {categories.map((category) => {
            const Icon = category.icon
            return (
              <a
                key={category.title}
                href="#san-pham"
                className={`category-card group bg-gradient-to-br ${category.tone}`}
              >
                <div className="liquid-icon">
                  <Icon className="size-7" strokeWidth={1.6} aria-hidden="true" />
                </div>
                <div className="mt-12">
                  <h3 className="text-xl font-semibold tracking-[-0.03em] text-[#3d3037]">{category.title}</h3>
                  <p className="mt-2 max-w-[16rem] text-sm leading-6 text-[#756169]">{category.description}</p>
                </div>
                <span className="absolute right-5 bottom-5 flex size-10 items-center justify-center rounded-full bg-white/65 text-[#7f5367] shadow-sm transition-transform group-hover:translate-x-1">
                  <ChevronRight className="size-4" aria-hidden="true" />
                </span>
              </a>
            )
          })}
        </div>
      </section>

      <section id="san-pham" className="page-shell scroll-mt-28 section-space" aria-labelledby="products-title">
        <SectionHeading eyebrow="Được yêu thích nhất" title="Besties của mọi cô nàng" id="products-title" action="Xem tất cả" />
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {products.map((product) => (
            <Card key={product.id} className="product-card gap-0 rounded-[1.4rem] border-0 bg-white/72 py-0 ring-1 ring-[#593246]/8 sm:rounded-[1.75rem]">
              <div className="relative aspect-square overflow-hidden">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover transition-transform duration-700 group-hover/card:scale-[1.045]"
                />
                <Badge className="absolute top-3 left-3 border-white/80 bg-white/72 text-[#704d5c] shadow-sm backdrop-blur-md sm:top-4 sm:left-4">
                  {product.badge}
                </Badge>
                <ProductActions mode="wishlist" productId={product.id} productName={product.name} />
              </div>
              <CardHeader className="gap-1 px-3 pt-4 sm:px-5">
                <div className="flex items-center justify-between gap-2">
                  <CardDescription className="text-[11px] font-medium tracking-[0.08em] uppercase sm:text-xs">
                    {product.category}
                  </CardDescription>
                  <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-[#725c65]">
                    <Star className="size-3 fill-[#e6ad63] text-[#e6ad63]" aria-hidden="true" />
                    {product.rating}
                  </span>
                </div>
                <CardTitle className="text-sm font-semibold tracking-[-0.02em] sm:text-base">{product.name}</CardTitle>
              </CardHeader>
              <CardContent className="mt-auto flex flex-col gap-3 px-3 pt-3 pb-3 sm:px-5 sm:pb-5">
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-[#a25574]">{product.price}</span>
                  {product.oldPrice ? <span className="text-xs text-muted-foreground line-through">{product.oldPrice}</span> : null}
                </div>
                <ProductActions mode="cart" productId={product.id} productName={product.name} />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="page-shell pb-6 sm:pb-10">
        <div className="care-banner relative overflow-hidden rounded-[2rem] px-6 py-12 sm:px-12 sm:py-16 lg:px-16">
          <div className="care-blob care-blob-one" aria-hidden="true" />
          <div className="care-blob care-blob-two" aria-hidden="true" />
          <div className="relative z-10 max-w-xl">
            <Badge className="mb-5 border-white/70 bg-white/55 text-[#765368] backdrop-blur-md">
              <BadgeCheck data-icon="inline-start" /> Chọn cùng chuyên gia
            </Badge>
            <h2 className="text-3xl leading-tight font-semibold tracking-[-0.045em] text-[#392c34] sm:text-5xl">Chưa biết bắt đầu từ đâu?</h2>
            <p className="mt-4 max-w-lg leading-7 text-[#705e67]">
              Trả lời vài câu hỏi ngắn để tìm routine chăm da và dáng móng phù
              hợp với phong cách của bạn.
            </p>
            <a className="primary-cta mt-7" href="#nhat-ky">
              Khám phá gợi ý riêng <ArrowRight className="size-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      <section id="nhat-ky" className="page-shell scroll-mt-28 section-space" aria-labelledby="journal-title">
        <div className="mb-8 flex items-end justify-between gap-5">
          <div>
            <p className="eyebrow inline-flex items-center gap-2"><BookOpen className="size-4" aria-hidden="true" /> Beauty journal</p>
            <h2 id="journal-title" className="section-title">Đẹp hơn khi hiểu mình</h2>
          </div>
          <a href="#nhat-ky" className="hidden items-center gap-2 text-sm font-semibold text-[#8e526c] hover:text-[#6f3b52] sm:inline-flex">
            Xem mọi bài viết <ArrowRight className="size-4" aria-hidden="true" />
          </a>
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          {articles.map((article) => (
            <article key={article.title} className="journal-card group">
              <a href="#nhat-ky" className="block">
                <div className="relative aspect-[16/11] overflow-hidden rounded-[1.4rem]">
                  <Image src={article.image} alt="" fill sizes="(max-width: 1024px) 100vw, 33vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                </div>
                <div className="px-1 pt-5">
                  <div className="flex items-center gap-3 text-[11px] font-semibold tracking-[0.1em] text-[#9b6a80] uppercase">
                    <span>{article.tag}</span><span className="size-1 rounded-full bg-[#d6a9bb]" /><span>{article.readingTime}</span>
                  </div>
                  <h3 className="mt-3 text-xl leading-snug font-semibold tracking-[-0.03em] text-[#3e3037] transition-colors group-hover:text-[#a25574]">{article.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{article.description}</p>
                </div>
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="page-shell pb-14 sm:pb-20" aria-labelledby="newsletter-title">
        <div className="newsletter-panel relative overflow-hidden rounded-[2rem] px-6 py-12 text-center sm:px-12 sm:py-16">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-white/65 text-[#a45777] shadow-[0_12px_35px_rgba(111,71,91,.12)] backdrop-blur-md">
            <Sparkles className="size-5" aria-hidden="true" />
          </div>
          <h2 id="newsletter-title" className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-[#3b2e35] sm:text-4xl">Một chút xinh gửi đến hộp thư</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#79656e] sm:text-base">
            Nhận bí quyết làm đẹp, câu chuyện mới và ưu đãi riêng. Không spam,
            chỉ những điều thật sự đáng yêu.
          </p>
          <NewsletterForm />
        </div>
      </section>

      <Footer />
    </main>
  )
}

function SectionHeading({ eyebrow, title, id, action }: { eyebrow: string; title: string; id: string; action: string }) {
  return (
    <div className="mb-8 flex items-end justify-between gap-5">
      <div><p className="eyebrow">{eyebrow}</p><h2 id={id} className="section-title">{title}</h2></div>
      <a href="#san-pham" className="hidden items-center gap-2 text-sm font-semibold text-[#8e526c] hover:text-[#6f3b52] sm:inline-flex">
        {action} <ArrowRight className="size-4" aria-hidden="true" />
      </a>
    </div>
  )
}

function Footer() {
  return (
    <footer className="border-t border-[#684658]/10 bg-white/50">
      <div className="page-shell py-10 sm:py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.35fr_.8fr_.8fr_1fr]">
          <div>
            <a href="#" className="brand-mark" aria-label="Mây Beauty - Trang chủ">mây<span>•</span></a>
            <p className="mt-4 max-w-xs text-sm leading-6 text-muted-foreground">Những sản phẩm làm đẹp dịu dàng, được chọn với sự tử tế dành cho bạn và hành tinh.</p>
          </div>
          <FooterLinks title="Khám phá" links={["Sản phẩm mới", "Móng tay giả", "Chăm sóc da", "Trang điểm"]} />
          <FooterLinks title="Hỗ trợ" links={["Hướng dẫn mua hàng", "Giao hàng & đổi trả", "Liên hệ", "Câu hỏi thường gặp"]} />
          <div>
            <h3 className="text-sm font-semibold text-[#413239]">Chăm sóc khách hàng</h3>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">Thứ 2 – Thứ 7, 9:00 – 18:00</p>
            <a className="mt-2 block text-sm font-semibold text-[#95556f]" href="tel:19001234">1900 1234</a>
            <a className="mt-1 block text-sm text-muted-foreground" href="mailto:hello@maybeauty.vn">hello@maybeauty.vn</a>
          </div>
        </div>
        <Separator className="my-8 bg-[#684658]/10" />
        <div className="flex flex-col gap-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Mây Beauty. Dịu dàng từ những điều nhỏ nhất.</p>
          <div className="flex gap-5"><a href="#" className="hover:text-foreground">Chính sách bảo mật</a><a href="#" className="hover:text-foreground">Điều khoản sử dụng</a></div>
        </div>
      </div>
    </footer>
  )
}

function FooterLinks({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-[#413239]">{title}</h3>
      <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
        {links.map((link) => <li key={link}><a href="#" className="transition-colors hover:text-[#95556f]">{link}</a></li>)}
      </ul>
    </div>
  )
}
