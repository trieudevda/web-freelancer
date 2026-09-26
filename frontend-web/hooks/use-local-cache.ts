"use client"

import * as React from "react"

const CACHE_EVENT = "may-beauty:cache-update"
const MAX_CACHE_CHARS = 2_000_000

export function useLocalCache<T>(key: string, seed: T) {
  const snapshot = React.useRef<{ raw: string | null; value: T }>({ raw: null, value: seed })

  const getSnapshot = React.useCallback(() => {
    try {
      const raw = window.localStorage.getItem(key)
      if (raw === snapshot.current.raw) return snapshot.current.value
      if (raw && raw.length > MAX_CACHE_CHARS) return seed
      const value = raw ? (JSON.parse(raw) as T) : seed
      snapshot.current = { raw, value }
      return value
    } catch {
      return snapshot.current.value
    }
  }, [key, seed])

  const getServerSnapshot = React.useCallback(() => seed, [seed])

  const subscribe = React.useCallback(
    (notify: () => void) => {
      const onCacheUpdate = (event: Event) => {
        if ((event as CustomEvent<{ key: string }>).detail.key === key) notify()
      }
      const onStorage = (event: StorageEvent) => {
        if (event.key === key) notify()
      }
      window.addEventListener(CACHE_EVENT, onCacheUpdate)
      window.addEventListener("storage", onStorage)
      return () => {
        window.removeEventListener(CACHE_EVENT, onCacheUpdate)
        window.removeEventListener("storage", onStorage)
      }
    },
    [key]
  )

  const value = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const update = React.useCallback(
    (nextValue: T | ((current: T) => T)) => {
      const current = getSnapshot()
      const next = typeof nextValue === "function" ? (nextValue as (current: T) => T)(current) : nextValue
      try {
        const raw = JSON.stringify(next)
        if (raw.length <= MAX_CACHE_CHARS) window.localStorage.setItem(key, raw)
        snapshot.current = { raw, value: next }
      } catch {
        snapshot.current = { raw: snapshot.current.raw, value: next }
      }
      window.dispatchEvent(new CustomEvent(CACHE_EVENT, { detail: { key } }))
    },
    [getSnapshot, key]
  )

  const reset = React.useCallback(() => {
    try {
      window.localStorage.removeItem(key)
    } catch {
      // In-memory reset still works when persistent storage is unavailable.
    }
    snapshot.current = { raw: null, value: seed }
    window.dispatchEvent(new CustomEvent(CACHE_EVENT, { detail: { key } }))
  }, [key, seed])

  return [value, update, reset] as const
}
