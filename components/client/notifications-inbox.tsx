"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { markNotificationRead, markAllRead } from "@/app/(client)/notifications/actions"

type Notification = {
  id: string
  type: string
  title: string
  message: string | null
  image_urls: string[] | null
  is_read: boolean
  created_at: string
  related_application_id: string | null
}

const TYPE_ICONS: Record<string, string> = {
  document_approved: "✅",
  document_changes_requested: "⚠️",
  document_rejected: "❌",
  status_changed: "🔄",
  changes_requested: "📋",
  application_activated: "🎉",
  reminder: "⏰",
}

export function NotificationsInbox({ initialItems }: { initialItems: Notification[] }) {
  const [items, setItems] = useState(initialItems)
  const [, startTransition] = useTransition()
  const [filter, setFilter] = useState<"all" | "unread">("all")

  const unread = items.filter((n) => !n.is_read).length
  const visible = filter === "unread" ? items.filter((n) => !n.is_read) : items

  function handleMarkOne(id: string) {
    setItems((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n))
    startTransition(() => { markNotificationRead(id) })
  }

  function handleMarkAll() {
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })))
    startTransition(() => { markAllRead() })
  }

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 4, background: "#fff", border: "1px solid #E7ECF1", borderRadius: 8, padding: 3 }}>
          {(["all", "unread"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "5px 12px",
                fontSize: 13,
                fontWeight: filter === f ? 600 : 400,
                color: filter === f ? "#0F1B2A" : "#5A6B7B",
                background: filter === f ? "#F4F8F6" : "transparent",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              {f === "all" ? "Todas" : `Sin leer${unread > 0 ? ` (${unread})` : ""}`}
            </button>
          ))}
        </div>

        {unread > 0 && (
          <button
            onClick={handleMarkAll}
            style={{ fontSize: 13, color: "#0B7A44", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}
          >
            Marcar todas como leídas
          </button>
        )}
      </div>

      {/* List */}
      <div style={{ background: "#fff", border: "1px solid #E7ECF1", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 2px rgba(16,30,45,.05)" }}>
        {visible.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center" }}>
            <p style={{ fontSize: 14, color: "#8A99A8", margin: 0 }}>
              {filter === "unread" ? "No tienes notificaciones sin leer." : "No tienes notificaciones aún."}
            </p>
          </div>
        ) : (
          visible.map((n, i) => {
            const icon = TYPE_ICONS[n.type] ?? "🔔"
            const timeAgo = formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: es })
            const isLast = i === visible.length - 1

            const inner = (
              <div
                onClick={() => !n.is_read && handleMarkOne(n.id)}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 14,
                  padding: "14px 20px",
                  borderBottom: isLast ? "none" : "1px solid #F0F4F2",
                  background: n.is_read ? "transparent" : "#EDFBEA",
                  cursor: n.is_read ? "default" : "pointer",
                  transition: "background .12s",
                }}
              >
                {/* Icon */}
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: n.is_read ? "#F4F8F6" : "#D1F7E0",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, flexShrink: 0,
                }}>
                  {icon}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                    <p style={{
                      margin: 0,
                      fontSize: 13,
                      fontWeight: n.is_read ? 400 : 600,
                      color: "#0F1B2A",
                      lineHeight: 1.4,
                    }}>
                      {n.title}
                    </p>
                    {!n.is_read && (
                      <span style={{
                        width: 8, height: 8, borderRadius: "50%",
                        background: "#0B7A44", flexShrink: 0, marginTop: 5,
                      }} />
                    )}
                  </div>
                  {n.message && (
                    <p style={{ margin: "3px 0 0", fontSize: 12, color: "#5A6B7B", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                      {n.message}
                    </p>
                  )}
                  {!!n.image_urls?.length && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                      {n.image_urls.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt={`Captura ${i + 1}`}
                            style={{ height: 64, width: 64, objectFit: "cover", borderRadius: 6, border: "1px solid #E2E8F0" }}
                          />
                        </a>
                      ))}
                    </div>
                  )}
                  <p style={{ margin: "4px 0 0", fontSize: 11, color: "#8A99A8" }}>
                    {timeAgo}
                  </p>
                </div>
              </div>
            )

            if (n.related_application_id) {
              return (
                <Link
                  key={n.id}
                  href={`/applications/${n.related_application_id}/documents`}
                  style={{ display: "block", textDecoration: "none", color: "inherit" }}
                  onClick={() => !n.is_read && handleMarkOne(n.id)}
                >
                  {inner}
                </Link>
              )
            }

            return <div key={n.id}>{inner}</div>
          })
        )}
      </div>
    </div>
  )
}
