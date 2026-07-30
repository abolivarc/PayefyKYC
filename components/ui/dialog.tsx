"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

interface DialogProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
}

export function Dialog({ open, onClose, children, className }: DialogProps) {
  // Se monta en el <body> con un portal: si el diálogo se renderiza dentro de
  // una tarjeta (que usa `relative z-10`), queda atrapado en ese contexto de
  // apilamiento y las tarjetas siguientes se pintan encima del modal.
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open || !mounted) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={cn(
          "relative z-10 w-full max-w-lg bg-background rounded-xl border shadow-lg p-6",
          className
        )}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>,
    document.body
  )
}

export function DialogHeader({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn("mb-4", className)}>{children}</div>
}

export function DialogTitle({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <h2 className={cn("text-lg font-semibold", className)}>{children}</h2>
}

export function DialogDescription({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <p className={cn("text-sm text-muted-foreground mt-1", className)}>
      {children}
    </p>
  )
}

export function DialogFooter({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("mt-6 flex justify-end gap-2", className)}>
      {children}
    </div>
  )
}
