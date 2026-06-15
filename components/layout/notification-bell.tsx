"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { createClient } from "@/lib/supabase/client"
import { markNotificationRead, markAllRead } from "@/app/(client)/notifications/actions"

type Notification = {
  id: string
  type: string
  title: string
  message: string | null
  is_read: boolean
  created_at: string
  related_application_id: string | null
}

interface Props {
  variant?: "light" | "dark"
}

export function NotificationBell({ variant = "dark" }: Props) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [, startTransition] = useTransition()
  const panelRef = useRef<HTMLDivElement>(null)

  const unread = items.filter((n) => !n.is_read).length

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from("notifications")
      .select("id, type, title, message, is_read, created_at, related_application_id")
      .order("created_at", { ascending: false })
      .limit(25)
      .then(({ data }) => {
        setItems((data as Notification[]) ?? [])
        setLoading(false)
      })
  }, [])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [open])

  function handleMarkOne(id: string) {
    setItems((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n))
    startTransition(() => { markNotificationRead(id) })
  }

  function handleMarkAll() {
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })))
    startTransition(() => { markAllRead() })
  }

  const iconColor = variant === "light" ? "rgba(255,255,255,0.72)" : "#5f6b64"
  const badgeBg = "#AEFF99"
  const badgeColor = "#004238"

  return (
    <div ref={panelRef} style={{ position:"relative" }}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notificaciones${unread > 0 ? ` (${unread} sin leer)` : ""}`}
        style={{ position:"relative", background:"none", border:"none", cursor:"pointer",
          padding:6, borderRadius:6, color: iconColor, display:"flex", alignItems:"center" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,0.06)" }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none" }}
      >
        <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={1.8}>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unread > 0 && (
          <span style={{ position:"absolute", top:3, right:3, minWidth:15, height:15,
            background: badgeBg, color: badgeColor, borderRadius:999,
            fontSize:9, fontWeight:700, display:"flex", alignItems:"center",
            justifyContent:"center", padding:"0 3px", lineHeight:1 }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{ position:"absolute", right:0, top:"calc(100% + 6px)", width:320,
          background:"#fff", border:"1px solid #d3dbd6", borderRadius:10,
          boxShadow:"0 8px 24px rgba(0,0,0,0.10)", zIndex:200, overflow:"hidden" }}>
          {/* Header */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
            padding:"11px 14px", borderBottom:"1px solid #e3e8e5" }}>
            <span style={{ fontSize:13, fontWeight:600, color:"#16201b" }}>
              Notificaciones {unread > 0 && (
                <span style={{ fontSize:11, color:"#5f6b64", fontWeight:400 }}>
                  ({unread} sin leer)
                </span>
              )}
            </span>
            {unread > 0 && (
              <button
                onClick={handleMarkAll}
                style={{ fontSize:11, color:"#004238", background:"none", border:"none",
                  cursor:"pointer", padding:"2px 4px", borderRadius:4 }}
              >
                Marcar todo como leído
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight:360, overflowY:"auto" }}>
            {loading ? (
              <p style={{ padding:"20px 14px", fontSize:13, color:"#8a948e", textAlign:"center" }}>
                Cargando…
              </p>
            ) : items.length === 0 ? (
              <p style={{ padding:"24px 14px", fontSize:13, color:"#8a948e", textAlign:"center" }}>
                No tienes notificaciones.
              </p>
            ) : (
              items.map((n) => (
                <div
                  key={n.id}
                  onClick={() => { if (!n.is_read) handleMarkOne(n.id) }}
                  style={{ padding:"11px 14px", borderBottom:"1px solid #f0f4f2",
                    cursor: n.is_read ? "default" : "pointer",
                    background: n.is_read ? "transparent" : "#f5faf6" }}
                  onMouseEnter={(e) => { if (!n.is_read) (e.currentTarget as HTMLDivElement).style.background = "#edf6ef" }}
                  onMouseLeave={(e) => { if (!n.is_read) (e.currentTarget as HTMLDivElement).style.background = "#f5faf6" }}
                >
                  <div style={{ display:"flex", alignItems:"flex-start", gap:8 }}>
                    {!n.is_read && (
                      <span style={{ marginTop:5, width:7, height:7, borderRadius:"50%",
                        background:"#004238", flexShrink:0 }} />
                    )}
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ margin:0, fontSize:13, fontWeight: n.is_read ? 400 : 600,
                        color:"#16201b", lineHeight:1.4 }}>
                        {n.title}
                      </p>
                      {n.message && (
                        <p style={{ margin:"3px 0 0", fontSize:12, color:"#5f6b64",
                          lineHeight:1.4, overflow:"hidden", display:"-webkit-box",
                          WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>
                          {n.message}
                        </p>
                      )}
                      <p style={{ margin:"4px 0 0", fontSize:11, color:"#8a948e" }}>
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: es })}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
