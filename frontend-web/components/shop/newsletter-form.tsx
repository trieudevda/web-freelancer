"use client"

import * as React from "react"
import { ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/toast"

export function NewsletterForm() {
  const [email, setEmail] = React.useState("")

  function subscribe(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!email.trim()) return

    toast.add({
      title: "Chào mừng bạn đến với Mây",
      description: "Ưu đãi và beauty notes sẽ sớm ghé hộp thư của bạn.",
      type: "success",
    })
    setEmail("")
  }

  return (
    <form
      onSubmit={subscribe}
      className="mx-auto mt-7 flex max-w-lg flex-col gap-2 rounded-[1.35rem] border border-white/75 bg-white/45 p-2 shadow-[0_18px_50px_rgba(115,73,93,.1)] backdrop-blur-xl sm:flex-row sm:rounded-full"
    >
      <label htmlFor="newsletter-email" className="sr-only">Email của bạn</label>
      <Input
        id="newsletter-email"
        type="email"
        required
        autoComplete="email"
        placeholder="Email của bạn"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        className="h-11 flex-1 rounded-full border-0 bg-transparent px-4 shadow-none focus-visible:ring-0"
      />
      <Button type="submit" className="h-11 rounded-full bg-[#3f3038] px-5 text-white hover:bg-[#a25574]">
        Đăng ký <ArrowRight data-icon="inline-end" aria-hidden="true" />
      </Button>
    </form>
  )
}
