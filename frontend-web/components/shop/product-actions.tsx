"use client"

import * as React from "react"
import { Check, Heart, ShoppingBag } from "lucide-react"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"

type ProductActionsProps = {
  mode: "cart" | "wishlist"
  productId: string
  productName: string
}

const CART_EVENT = "may-beauty:cart-updated"

export function ProductActions({ mode, productId, productName }: ProductActionsProps) {
  const [liked, setLiked] = React.useState(false)
  const [added, setAdded] = React.useState(false)

  function addToCart() {
    const item = { id: crypto.randomUUID(), productId, createdAt: Date.now() }

    try {
      const channel = new BroadcastChannel("may-beauty-cart")
      channel.postMessage(item)
      channel.close()
    } catch {
      window.dispatchEvent(new CustomEvent(CART_EVENT, { detail: item }))
    }

    setAdded(true)
    window.setTimeout(() => setAdded(false), 1600)
    toast.add({
      title: "Đã thêm vào giỏ hàng",
      description: `${productName} đang chờ bạn trong giỏ.`,
      type: "success",
      actionProps: {
        children: "Xem giỏ",
        onClick: () => window.dispatchEvent(new CustomEvent("may-beauty:open-cart")),
      },
    })
  }

  function toggleWishlist() {
    const next = !liked
    setLiked(next)
    toast.add({
      title: next ? "Đã lưu vào danh sách yêu thích" : "Đã bỏ khỏi danh sách yêu thích",
      description: productName,
      type: next ? "success" : "info",
    })
  }

  if (mode === "wishlist") {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={toggleWishlist}
        aria-label={liked ? `Bỏ thích ${productName}` : `Yêu thích ${productName}`}
        aria-pressed={liked}
        className={cn(
          "absolute top-3 right-3 size-9 rounded-full border border-white/80 bg-white/65 text-[#72515f] shadow-sm backdrop-blur-md hover:bg-white sm:top-4 sm:right-4",
          liked && "bg-[#a95f7f] text-white hover:bg-[#944e6d]"
        )}
      >
        <Heart className={cn("size-4", liked && "fill-current")} aria-hidden="true" />
      </Button>
    )
  }

  return (
    <Button
      type="button"
      onClick={addToCart}
      className="h-9 w-full rounded-full bg-[#3d3037] text-xs text-white shadow-none hover:bg-[#a25574] sm:h-10 sm:text-sm"
    >
      {added ? <Check data-icon="inline-start" aria-hidden="true" /> : <ShoppingBag data-icon="inline-start" aria-hidden="true" />}
      {added ? "Đã thêm" : "Thêm vào giỏ"}
    </Button>
  )
}

export { CART_EVENT }
