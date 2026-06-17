import { test as setup, type Page } from "@playwright/test"
import { createClient } from "@supabase/supabase-js"
import * as fs from "fs"
import * as path from "path"

const authDir = path.join(__dirname, ".auth")
if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true })

const PW = "TestPayefy2026!"

// Load env vars from .env.local since Playwright doesn't auto-load it
function loadEnv(): { url: string; serviceKey: string } {
  const envPath = path.join(__dirname, "../../.env.local")
  const raw = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : ""
  const get = (key: string) => {
    const m = raw.match(new RegExp(`^${key}=(.+)$`, "m"))
    return m ? m[1].trim() : process.env[key] ?? ""
  }
  return {
    url: get("NEXT_PUBLIC_SUPABASE_URL"),
    serviceKey: get("SUPABASE_SERVICE_ROLE_KEY"),
  }
}
const { url: SUPABASE_URL, serviceKey: SERVICE_ROLE_KEY } = loadEnv()

async function loginAdmin(page: Page, email: string, filePath: string) {
  await page.goto("/admin/login")
  await page.locator('input[name="email"]').fill(email)
  await page.locator('input[name="password"]').fill(PW)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL(/\/admin\/dashboard/, { timeout: 45_000 })
  await page.context().storageState({ path: filePath })
}

// Client session via hashed_token — bypasses password, uses Supabase admin link generation
setup("guardar sesión: cliente", async ({ page }) => {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: "antonio.bolivar@payefy.me",
  })
  if (error || !data?.properties?.hashed_token) {
    throw error ?? new Error("No se pudo generar token para el cliente")
  }
  // Navigate directly to the auth callback with the hashed token (avoids hash redirect)
  const callbackUrl = `/auth/callback?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=email&next=/dashboard`
  await page.goto(callbackUrl)
  await page.waitForURL(/\/(dashboard|terminos)/, { timeout: 30_000 })
  await page.context().storageState({ path: "tests/e2e/.auth/client.json" })
})

setup("guardar sesión: compliance", async ({ page }) => {
  await loginAdmin(page, "compliance@payefy.me", "tests/e2e/.auth/compliance.json")
})

setup("guardar sesión: super_admin", async ({ page }) => {
  await loginAdmin(page, "a.santibanez@payefy.me", "tests/e2e/.auth/super_admin.json")
})
