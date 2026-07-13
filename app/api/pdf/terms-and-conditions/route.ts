import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateTermsOpmDocx } from "@/lib/docx/terms-opm"

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const body = await req.json()
  const { company_legal_name, signer_full_name, signing_date } = body as {
    company_legal_name: string
    signer_full_name: string
    signing_date: string
  }

  if (!company_legal_name?.trim() || !signer_full_name?.trim() || !signing_date?.trim()) {
    return NextResponse.json({ error: "Campos requeridos" }, { status: 400 })
  }

  const buffer = await generateTermsOpmDocx({
    company_legal_name: company_legal_name.trim(),
    signer_full_name: signer_full_name.trim(),
    signing_date: signing_date.trim(),
  })

  const safeName = company_legal_name
    .trim()
    .replace(/[^a-zA-Z0-9\sáéíóúñÁÉÍÓÚÑüÜ]/g, "")
    .replace(/\s+/g, "_")
  const fileName = `terminos_condiciones_${safeName}.docx`

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  })
}
