"use client"

import * as React from "react"

export type ThemeMode = "brand" | "light" | "dark" | "system"
export type ThemeAccent = "rose" | "violet" | "blue" | "emerald" | "amber"
type ThemeValue = { mode: ThemeMode; accent: ThemeAccent }

const STORAGE_KEY = "may-beauty:theme:v1"
const EVENT_NAME = "may-beauty:theme-change"
const DEFAULT_THEME: ThemeValue = { mode: "brand", accent: "rose" }
let cachedRaw: string | null | undefined
let cachedTheme = DEFAULT_THEME

function isTheme(value: unknown): value is ThemeValue {
  if (!value || typeof value !== "object") return false
  const item = value as Record<string, unknown>
  return ["brand", "light", "dark", "system"].includes(String(item.mode)) &&
    ["rose", "violet", "blue", "emerald", "amber"].includes(String(item.accent))
}

function readTheme() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw === cachedRaw) return cachedTheme
    const value = JSON.parse(raw ?? "null") as unknown
    cachedRaw = raw
    cachedTheme = isTheme(value) ? value : DEFAULT_THEME
    return cachedTheme
  } catch {
    return DEFAULT_THEME
  }
}

function subscribe(notify: () => void) {
  window.addEventListener(EVENT_NAME, notify)
  window.addEventListener("storage", notify)
  return () => {
    window.removeEventListener(EVENT_NAME, notify)
    window.removeEventListener("storage", notify)
  }
}

export function useTheme() {
  const value = React.useSyncExternalStore(subscribe, readTheme, () => DEFAULT_THEME)
  const setTheme = React.useCallback((next: Partial<ThemeValue>) => {
    const value = { ...readTheme(), ...next }
    const raw = JSON.stringify(value)
    window.localStorage.setItem(STORAGE_KEY, raw)
    cachedRaw = raw
    cachedTheme = value
    window.dispatchEvent(new Event(EVENT_NAME))
  }, [])
  return { ...value, setTheme }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { mode, accent } = useTheme()

  React.useEffect(() => {
    const root = document.documentElement
    const preference = window.matchMedia("(prefers-color-scheme: dark)")
    const apply = () => {
      const dark = mode === "dark" || (mode === "system" && preference.matches)
      root.dataset.mode = dark ? "dark" : mode === "brand" ? "brand" : "light"
      root.dataset.accent = accent
      root.classList.toggle("dark", dark)
    }
    apply()
    if (mode === "system") preference.addEventListener("change", apply)
    return () => preference.removeEventListener("change", apply)
  }, [accent, mode])

  return children
}
