import * as React from "react"

import { cn } from "@/lib/utils"

type ImageLoadingStatus = "idle" | "loading" | "loaded" | "error"

const AvatarContext = React.createContext<{
  status: ImageLoadingStatus
  setStatus: React.Dispatch<React.SetStateAction<ImageLoadingStatus>>
} | null>(null)
const failedAvatarSrcCache = new Set<string>()
const hostBackoffUntil = new Map<string, number>()
const hostErrorWindow = new Map<string, { count: number; windowStart: number }>()
const avatarPrefMemory = new Map<string, string | null>()
const HOST_ERROR_WINDOW_MS = 60_000
const HOST_ERROR_THRESHOLD = 3
const HOST_BACKOFF_MS = 10 * 60_000
const AVATAR_DB_NAME = "AvatarRuntimeDB"
const AVATAR_DB_VERSION = 1
const AVATAR_PREFS_STORE = "avatarPrefs"

type AvatarPrefRecord = {
  key: string
  src: string
  updatedAt: number
}

const getHostname = (src: string): string => {
  try {
    return new URL(src, window.location.origin).hostname.toLowerCase()
  } catch {
    return ""
  }
}

const isRateLimitedHost = (host: string): boolean =>
  host.endsWith(".ggpht.com") || host === "ggpht.com" || host.endsWith(".googleusercontent.com")

const shouldBackoffHost = (src: string): boolean => {
  const host = getHostname(src)
  if (!host || !isRateLimitedHost(host)) return false
  const until = hostBackoffUntil.get(host) || 0
  return Date.now() < until
}

const registerHostLoadFailure = (src: string): void => {
  const host = getHostname(src)
  if (!host || !isRateLimitedHost(host)) return
  const now = Date.now()
  const current = hostErrorWindow.get(host)
  if (!current || now - current.windowStart > HOST_ERROR_WINDOW_MS) {
    hostErrorWindow.set(host, { count: 1, windowStart: now })
    return
  }
  const next = { ...current, count: current.count + 1 }
  hostErrorWindow.set(host, next)
  if (next.count >= HOST_ERROR_THRESHOLD) {
    hostBackoffUntil.set(host, now + HOST_BACKOFF_MS)
  }
}

const openAvatarDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(AVATAR_DB_NAME, AVATAR_DB_VERSION)
    request.onerror = () => reject(request.error || new Error("Failed to open avatar DB"))
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(AVATAR_PREFS_STORE)) {
        db.createObjectStore(AVATAR_PREFS_STORE, { keyPath: "key" })
      }
    }
    request.onsuccess = () => resolve(request.result)
  })

const getAvatarPreference = async (key: string): Promise<string | null> => {
  if (!key) return null
  if (avatarPrefMemory.has(key)) return avatarPrefMemory.get(key) || null
  const db = await openAvatarDb()
  return new Promise((resolve) => {
    const tx = db.transaction(AVATAR_PREFS_STORE, "readonly")
    const store = tx.objectStore(AVATAR_PREFS_STORE)
    const req = store.get(key)
    req.onsuccess = () => {
      const record = req.result as AvatarPrefRecord | undefined
      const value = record?.src || null
      avatarPrefMemory.set(key, value)
      resolve(value)
    }
    req.onerror = () => {
      avatarPrefMemory.set(key, null)
      resolve(null)
    }
  })
}

const setAvatarPreference = async (key: string, src: string): Promise<void> => {
  if (!key || !src) return
  avatarPrefMemory.set(key, src)
  const db = await openAvatarDb()
  await new Promise<void>((resolve) => {
    const tx = db.transaction(AVATAR_PREFS_STORE, "readwrite")
    const store = tx.objectStore(AVATAR_PREFS_STORE)
    store.put({ key, src, updatedAt: Date.now() } satisfies AvatarPrefRecord)
    tx.oncomplete = () => resolve()
    tx.onerror = () => resolve()
  })
}

const normalizeImageSrc = (value: string | undefined): string => {
  const raw = String(value || "").trim()
  if (!raw) return ""
  if (raw.startsWith("//")) return `https:${raw}`
  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("data:") ||
    raw.startsWith("blob:") ||
    raw.startsWith("/") ||
    raw.startsWith("./") ||
    raw.startsWith("../")
  ) {
    return raw
  }
  // Handle host/path form without protocol (e.g. yt3.ggpht.com/....)
  if (/^[a-z0-9.-]+\.[a-z]{2,}\/.+/i.test(raw)) {
    return `https://${raw}`
  }
  // Ignore invalid/bare tokens to avoid ORB/image request failures.
  return ""
}

const Avatar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const [status, setStatus] = React.useState<ImageLoadingStatus>("idle")

  return (
    <AvatarContext.Provider value={{ status, setStatus }}>
      <div
        ref={ref}
        className={cn(
          "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
          className
        )}
        {...props}
      />
    </AvatarContext.Provider>
  )
})
Avatar.displayName = "Avatar"

const AvatarImage = React.forwardRef<
  HTMLImageElement,
  React.ImgHTMLAttributes<HTMLImageElement>
>(({ className, src, onLoad, onError, crossOrigin: _crossOrigin, loading, decoding, ...props }, ref) => {
  const ctx = React.useContext(AvatarContext)
  const normalizedSrc = React.useMemo(
    () => normalizeImageSrc(typeof src === "string" ? src : undefined),
    [src]
  )
  const avatarKey = React.useMemo(() => {
    const fromAlt = String(props.alt || "").trim().toLowerCase()
    return fromAlt || ""
  }, [props.alt])
  const [preferredSrc, setPreferredSrc] = React.useState<string>("")
  const [cacheResolved, setCacheResolved] = React.useState<boolean>(false)

  React.useEffect(() => {
    let active = true
    if (!avatarKey) {
      setPreferredSrc("")
      setCacheResolved(true)
      return () => {
        active = false
      }
    }
    setCacheResolved(false)
    void getAvatarPreference(avatarKey).then((cached) => {
      if (!active) return
      setPreferredSrc(cached || "")
      setCacheResolved(true)
    })
    return () => {
      active = false
    }
  }, [avatarKey])

  const candidateSrc = preferredSrc || normalizedSrc
  const effectiveSrc =
    avatarKey && !cacheResolved
      ? ""
      :
    candidateSrc &&
    !failedAvatarSrcCache.has(candidateSrc) &&
    !shouldBackoffHost(candidateSrc)
      ? candidateSrc
      : ""

  React.useEffect(() => {
    if (!ctx) return
    ctx.setStatus(effectiveSrc ? "loading" : "error")
  }, [ctx, effectiveSrc])

  return (
    <img
      ref={ref}
      src={effectiveSrc || undefined}
      className={cn("aspect-square h-full w-full", className)}
      loading={loading || "lazy"}
      decoding={decoding || "async"}
      onLoad={(event) => {
        if (avatarKey && effectiveSrc && preferredSrc !== effectiveSrc) {
          void setAvatarPreference(avatarKey, effectiveSrc)
        }
        ctx?.setStatus("loaded")
        onLoad?.(event)
      }}
      onError={(event) => {
        if (effectiveSrc) {
          failedAvatarSrcCache.add(effectiveSrc)
          registerHostLoadFailure(effectiveSrc)
        }
        if (avatarKey && normalizedSrc) {
          const fallback = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(avatarKey)}`
          setPreferredSrc(fallback)
          void setAvatarPreference(avatarKey, fallback)
        }
        ctx?.setStatus("error")
        onError?.(event)
      }}
      {...props}
    />
  )
})
AvatarImage.displayName = "AvatarImage"

const AvatarFallback = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { delayMs?: number }
>(({ className, delayMs, ...props }, ref) => {
  const ctx = React.useContext(AvatarContext)
  const [canRender, setCanRender] = React.useState(delayMs === undefined)

  React.useEffect(() => {
    if (delayMs === undefined) return
    setCanRender(false)
    const timer = window.setTimeout(() => setCanRender(true), delayMs)
    return () => window.clearTimeout(timer)
  }, [delayMs])

  if (!canRender) return null
  if (ctx?.status === "loaded") return null

  return (
    <div
      ref={ref}
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full bg-muted",
        className
      )}
      {...props}
    />
  )
})
AvatarFallback.displayName = "AvatarFallback"

export { Avatar, AvatarImage, AvatarFallback }
