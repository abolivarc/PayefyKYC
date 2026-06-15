import { NextResponse } from "next/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { Resend } from "resend"
import {
  emailCronReminder,
  emailCronInternalAlert,
} from "@/lib/email/templates"

// Statuses where the client needs to act (7-day reminder to client)
const CLIENT_ACTION_STATUSES = new Set([
  "draft",
  "changes_requested",
  "provider_changes_requested",
])

// Terminal statuses — excluded from all cron checks
const TERMINAL_STATUSES = ["activated", "rejected", "archived"]

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  documents_pending: "Documentos pendientes",
  in_compliance_review: "En revisión de compliance",
  changes_requested: "Cambios solicitados",
  approved_compliance: "Aprobado por compliance",
  in_provider_review: "En revisión del proveedor",
  provider_changes_requested: "Cambios solicitados por proveedor",
  approved_provider: "Aprobado por proveedor",
  contracts_pending: "Contratos pendientes",
  contracts_signed: "Contratos firmados",
  activation_pending: "Activación pendiente",
}

const CRON_FROM = "a.santibanez@payefy.me"
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://payefy-kyc.vercel.app"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  // Vercel Cron sends Authorization: Bearer <CRON_SECRET>
  const authHeader = request.headers.get("authorization")
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

  // 1. Fetch all non-terminal applications
  const { data: apps, error: appsErr } = await admin
    .from("applications")
    .select(
      `id, status, updated_at, company_id,
       companies(legal_name),
       products(name, internal_reviewer_email)`
    )
    .not("status", "in", `(${TERMINAL_STATUSES.join(",")})`)

  if (appsErr) {
    return NextResponse.json({ error: appsErr.message }, { status: 500 })
  }
  if (!apps?.length) {
    return NextResponse.json({ ok: true, processed: 0, note: "no active applications" })
  }

  const companyIds = [...new Set(apps.map((a) => a.company_id as string))]
  const appIds = apps.map((a) => a.id)

  // 2. Fetch client profiles per company
  const { data: members } = await admin
    .from("company_users")
    .select("company_id, user_id, profiles(email, full_name, role)")
    .in("company_id", companyIds)

  const clientMap = new Map<string, { userId: string; email: string; name: string }>()
  for (const m of members ?? []) {
    const profile = (m.profiles as unknown) as {
      email: string
      full_name: string
      role: string
    } | null
    if (profile?.role === "client" && !clientMap.has(m.company_id as string)) {
      clientMap.set(m.company_id as string, {
        userId: m.user_id as string,
        email: profile.email,
        name: profile.full_name,
      })
    }
  }

  // 3. Fetch already-sent cron actions to avoid duplicates
  const { data: cronLogs } = await admin
    .from("audit_logs")
    .select("entity_id, action")
    .in("entity_id", appIds)
    .in("action", ["cron_reminder_7d", "cron_alert_14d"])

  const processedMap = new Map<string, Set<string>>()
  for (const log of cronLogs ?? []) {
    if (!processedMap.has(log.entity_id as string)) {
      processedMap.set(log.entity_id as string, new Set())
    }
    processedMap.get(log.entity_id as string)!.add(log.action as string)
  }

  const now = Date.now()
  const results = { reminded: 0, alerted: 0, archived: 0, errors: 0 }

  for (const app of apps) {
    const companyId = app.company_id as string
    const company = (app.companies as unknown) as { legal_name: string } | null
    const product = (app.products as unknown) as {
      name: string
      internal_reviewer_email: string | null
    } | null

    const ageDays = Math.floor(
      (now - new Date(app.updated_at as string).getTime()) / (1000 * 60 * 60 * 24)
    )
    const processed = processedMap.get(app.id) ?? new Set<string>()
    const appUrl = `${APP_URL}/applications/${app.id}/documents`
    const reviewUrl = `${APP_URL}/admin/applications/${app.id}/review`
    const companyName = company?.legal_name ?? "Tu empresa"
    const productName = product?.name ?? "Producto Payefy"
    const statusLabel = STATUS_LABELS[app.status as string] ?? (app.status as string)

    try {
      if (ageDays >= 30) {
        // ── AUTO-ARCHIVO ───────────────────────────────────────────
        await admin
          .from("applications")
          .update({ status: "archived", archived_at: new Date().toISOString() })
          .eq("id", app.id)

        await admin.from("audit_logs").insert({
          actor_id: null,
          action: "cron_archived_30d",
          entity_type: "application",
          entity_id: app.id,
          changes: { from: app.status, to: "archived" },
          metadata: {
            reason: "auto_archived_after_30_days_inactivity",
            age_days: ageDays,
          },
        })

        results.archived++
      } else if (ageDays >= 14 && !processed.has("cron_alert_14d")) {
        // ── ALERTA INTERNA (14 días) ────────────────────────────────
        const reviewerEmail = product?.internal_reviewer_email
        if (reviewerEmail && resend) {
          await resend.emails
            .send({
              from: CRON_FROM,
              to: reviewerEmail,
              subject: `[Alerta] ${companyName} — ${ageDays} días sin avance`,
              html: emailCronInternalAlert({
                companyName,
                productName,
                applicationStatus: statusLabel,
                applicationUrl: reviewUrl,
                daysSinceUpdate: ageDays,
              }),
            })
            .catch(() => {})
        }

        // Notificación in-app al cliente (para que aparezca en su panel)
        const client = clientMap.get(companyId)
        if (client) {
          await admin.from("notifications").insert({
            recipient_id: client.userId,
            type: "internal_alert",
            title: "Tu expediente requiere atención",
            message: `Tu solicitud de ${productName} lleva ${ageDays} días sin movimiento. Contáctanos si necesitas ayuda.`,
            related_application_id: app.id,
            email_sent: false,
          })
        }

        await admin.from("audit_logs").insert({
          actor_id: null,
          action: "cron_alert_14d",
          entity_type: "application",
          entity_id: app.id,
          metadata: { age_days: ageDays, reviewer_notified: reviewerEmail ?? null },
        })

        results.alerted++
      } else if (
        ageDays >= 7 &&
        !processed.has("cron_reminder_7d") &&
        CLIENT_ACTION_STATUSES.has(app.status as string)
      ) {
        // ── RECORDATORIO AL CLIENTE (7 días) ────────────────────────
        const client = clientMap.get(companyId)
        if (client && resend) {
          await resend.emails
            .send({
              from: CRON_FROM,
              to: client.email,
              subject: `Tu expediente KYC de ${productName} te está esperando`,
              html: emailCronReminder({
                companyName,
                clientName: client.name || "Cliente",
                productName,
                applicationUrl: appUrl,
                daysSinceUpdate: ageDays,
              }),
            })
            .catch(() => {})
        }

        if (client) {
          await admin.from("notifications").insert({
            recipient_id: client.userId,
            type: "reminder",
            title: "Recuerda completar tu expediente",
            message: `Tu solicitud de ${productName} lleva ${ageDays} días sin actividad. Ingresa para continuar.`,
            related_application_id: app.id,
            email_sent: !!resend,
          })
        }

        await admin.from("audit_logs").insert({
          actor_id: null,
          action: "cron_reminder_7d",
          entity_type: "application",
          entity_id: app.id,
          metadata: { age_days: ageDays, client_email: clientMap.get(companyId)?.email ?? null },
        })

        results.reminded++
      }
    } catch (err) {
      results.errors++
      console.error(`[CRON] error processing app ${app.id}:`, err)
    }
  }

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    ...results,
  })
}
