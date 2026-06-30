"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { addAdditionalDocument } from "@/lib/documents/additional-actions"
import { uploadDocumentFile } from "@/lib/documents/upload"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

interface Props {
  applicationId: string
}

export function AdditionalUploadBox({ applicationId }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    e.target.value = ""

    startTransition(async () => {
      const created = await addAdditionalDocument(applicationId, file.name)
      if ("error" in created) {
        setError(created.error)
        return
      }
      const uploaded = await uploadDocumentFile(created.documentId, file)
      if (!uploaded.success) {
        setError(uploaded.error ?? "Error al subir")
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="pt-3">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-1.5"
      >
        {isPending && <Spinner size={13} />}
        {isPending ? "Subiendo…" : "+ Agregar documento"}
      </Button>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  )
}
