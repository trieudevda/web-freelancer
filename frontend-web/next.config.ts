import type { NextConfig } from "next";

const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, "")

function apiOrigin() {
  if (!apiUrl) return ""
  try {
    const parsed = new URL(apiUrl)
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("invalid protocol")
    return parsed.origin
  } catch {
    throw new Error("NEXT_PUBLIC_API_URL phải là URL http(s) hợp lệ, ví dụ http://localhost:3001/api/v1")
  }
}

const origin = apiOrigin()
const productionSecurityHeaders = process.env.NODE_ENV === "production"
  ? [{
      key: "Content-Security-Policy",
      value: [
        "default-src 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "frame-ancestors 'none'",
        "form-action 'self'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline'",
        `connect-src 'self'${origin ? ` ${origin}` : ""}`,
        `img-src 'self' data: blob:${origin ? ` ${origin}` : ""}`,
        `media-src 'self' blob:${origin ? ` ${origin}` : ""}`,
        "font-src 'self' data:",
        "upgrade-insecure-requests",
      ].join("; "),
    }]
  : []

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    const common = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      ...productionSecurityHeaders,
    ]

    return [
      { source: "/:path*", headers: common },
      {
        source: "/admin/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store, max-age=0, must-revalidate" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        ],
      },
    ]
  },
};

export default nextConfig;
