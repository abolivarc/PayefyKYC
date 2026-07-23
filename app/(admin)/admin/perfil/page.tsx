import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import {
  ProfileInfoCard,
  ChangeEmailCard,
  ChangePasswordCard,
} from "@/components/account/account-security-forms"

export const metadata = { title: "Mi cuenta" }

export default async function AdminProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/admin/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", user.id)
    .single()

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
      <header style={{ padding: "24px 32px 16px" }}>
        <h1
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontSize: 26,
            fontWeight: 800,
            letterSpacing: "-.02em",
            lineHeight: 1.1,
            color: "var(--admin-text, #0F1B2A)",
          }}
        >
          Mi cuenta
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--admin-text-muted, #5A6B7B)" }}>
          {profile?.full_name ?? user.email}
        </p>
      </header>
      <div style={{ padding: "0 32px 40px", maxWidth: 560 }} className="space-y-5">
        <ProfileInfoCard
          initialName={profile?.full_name ?? ""}
          initialPhone={profile?.phone ?? ""}
        />
        <ChangeEmailCard currentEmail={user.email ?? "—"} />
        <ChangePasswordCard />
      </div>
    </div>
  )
}
