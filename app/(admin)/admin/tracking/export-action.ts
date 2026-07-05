"use server"

import * as Sentry from "@sentry/nextjs"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import JSZip from "jszip"
import { generateDataPdf, type DataField } from "@/lib/documents/generate-data-pdf"

const STAFF_ROLES = ["sales_agent", "sales_director", "compliance", "onboarding", "accounting", "super_admin"]

export async function exportExpediente(
  applicationId: string
): Promise<{ base64?: string; filename?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Verify caller is internal staff
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || !STAFF_ROLES.includes(profile.role as string)) {
    return { error: "Acceso denegado" }
  }

  try {
    // 1. Load application + company data
    const { data: app } = await admin
      .from("applications")
      .select(`
        id, status, submitted_at, approved_at, activated_at, rejection_reason,
        companies(legal_name, tax_id, phone, operator_email, person_type),
        products(name, code)
      `)
      .eq("id", applicationId)
      .single()

    if (!app) return { error: "Solicitud no encontrada" }

    const company = (app.companies as unknown) as {
      legal_name: string; tax_id: string; phone: string | null;
      operator_email: string | null; person_type: string | null
    } | null
    const product = (app.products as unknown) as { name: string; code: string } | null

    // 2. Load form_submissions (complementary_info parties)
    const { data: submissions } = await admin
      .from("form_submissions")
      .select("form_data, template_id, document_templates(code)")
      .eq("application_id", applicationId)

    // 3. Load bitácora (comments + audit_logs)
    const { data: comments } = await admin
      .from("application_comments")
      .select("created_at, kind, body, profiles(full_name)")
      .eq("application_id", applicationId)
      .order("created_at", { ascending: true })

    const { data: auditLogs } = await admin
      .from("audit_logs")
      .select("created_at, action, actor_id, changes, metadata")
      .eq("entity_id", applicationId)
      .order("created_at", { ascending: true })

    // 4. Load all documents (file uploads)
    const { data: docs } = await admin
      .from("documents")
      .select("storage_path, file_name, uploaded_at, status, document_templates(name, code, is_form, field_type)")
      .eq("application_id", applicationId)
      .not("storage_path", "is", null)

    // 4b. Load data_check docs (text fields — stored in file_name, no storage_path)
    const { data: dataDocs } = await admin
      .from("documents")
      .select("file_name, status, document_templates(name, code, field_type, sort_order)")
      .eq("application_id", applicationId)
      .is("storage_path", null)
      .not("file_name", "is", null)

    // 5. Build ZIP
    const zip = new JSZip()
    const docsFolder = zip.folder("documentos")!
    let docCount = 0

    for (const doc of docs ?? []) {
      if (!doc.storage_path) continue
      const tmpl = (doc.document_templates as unknown) as { name: string; code: string; is_form: boolean; field_type?: string } | null

      for (const bucket of ["kyc-documents", "generated-pdfs"]) {
        const { data, error } = await admin.storage.from(bucket).download(doc.storage_path)
        if (error || !data) continue

        const ext = doc.file_name?.split(".").pop() ?? "pdf"
        const safeName = (tmpl?.name ?? doc.file_name ?? `doc_${docCount}`)
          .replace(/[^a-zA-Z0-9_\-. ]/g, "_").slice(0, 60)
        docsFolder.file(`${docCount === 0 ? safeName : `${safeName}_${docCount}`}.${ext}`, await data.arrayBuffer())
        docCount++
        break
      }
    }

    // 5b. Generate DATOS_SOLICITADOS.pdf if any data_check fields exist
    const dataFields: DataField[] = (dataDocs ?? [])
      .filter((d) => {
        const tmpl = (d.document_templates as unknown) as { field_type?: string } | null
        return tmpl?.field_type === "data_check"
      })
      .sort((a, b) => {
        const aOrder = ((a.document_templates as unknown) as { sort_order?: number } | null)?.sort_order ?? 999
        const bOrder = ((b.document_templates as unknown) as { sort_order?: number } | null)?.sort_order ?? 999
        return aOrder - bOrder
      })
      .map((d) => {
        const tmpl = (d.document_templates as unknown) as { name: string } | null
        return {
          label: tmpl?.name ?? "Dato",
          value: d.file_name,
          status: d.status,
        }
      })

    if (dataFields.length > 0) {
      const exportDate = new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })
      const pdfBytes = await generateDataPdf({
        companyName: company?.legal_name ?? "Empresa",
        taxId: company?.tax_id ?? null,
        personType: company?.person_type ?? null,
        productName: product?.name ?? null,
        applicationId,
        exportDate,
        fields: dataFields,
      })
      zip.file("DATOS_SOLICITADOS.pdf", pdfBytes)
    }

    // 6. Build summary JSON
    const complementarySubmission = submissions?.find(
      (s) => ((s.document_templates as unknown) as { code: string } | null)?.code === "complementary_info"
    )

    const summary = {
      expediente: {
        application_id: applicationId,
        producto: product?.name,
        status: app.status,
        submitted_at: app.submitted_at,
        approved_at: app.approved_at,
        activated_at: app.activated_at,
        exportado_at: new Date().toISOString(),
      },
      empresa: {
        razon_social: company?.legal_name,
        rfc: company?.tax_id,
        telefono: company?.phone,
        email_operador: company?.operator_email,
        tipo_persona: company?.person_type,
      },
      partes: complementarySubmission?.form_data
        ? (complementarySubmission.form_data as Record<string, unknown>).parties ?? []
        : [],
      bitacora: (comments ?? []).map((c) => ({
        fecha: c.created_at,
        tipo: c.kind,
        texto: c.body,
        autor: (c.profiles as unknown as { full_name: string } | null)?.full_name ?? "Sistema",
      })),
      audit_trail: (auditLogs ?? []).map((l) => ({
        fecha: l.created_at,
        accion: l.action,
        cambios: l.changes,
      })),
      documentos: (docs ?? []).map((d) => ({
        nombre: (d.document_templates as unknown as { name: string } | null)?.name ?? d.file_name,
        status: d.status,
        uploaded_at: d.uploaded_at,
      })),
      datos_solicitados: dataFields.map((f) => ({
        campo: f.label,
        valor: f.value,
        status: f.status,
      })),
    }

    zip.file("RESUMEN.json", JSON.stringify(summary, null, 2))

    const safeCompanyName = (company?.legal_name ?? "expediente")
      .replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_").slice(0, 40)
    const dateStr = new Date().toISOString().split("T")[0]
    const filename = `${safeCompanyName}_${dateStr}.zip`

    const base64 = await zip.generateAsync({ type: "base64" })
    return { base64, filename }
  } catch (err) {
    Sentry.captureException(err, { extra: { applicationId } })
    return { error: `Error al exportar: ${(err as Error).message}` }
  }
}
