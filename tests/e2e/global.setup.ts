import { test as setup, type Page } from "@playwright/test"
import * as fs from "fs"
import * as path from "path"

const authDir = path.join(__dirname, ".auth")
if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true })

const loginAndSave = async (
  page: Page,
  email: string,
  password: string,
  filePath: string,
  expectedUrlPattern: RegExp
) => {
  await page.goto("/login")
  await page.locator('input[name="email"]').fill(email)
  await page.locator('input[name="password"]').fill(password)
  await page.locator('button[type="submit"]').click()
  // Dev mode con Turbopack tarda varios segundos en JIT-compilar en primer request
  await page.waitForURL(expectedUrlPattern, { timeout: 45_000 })
  await page.context().storageState({ path: filePath })
}

setup("guardar sesión: cliente", async ({ page }) => {
  await loginAndSave(
    page,
    "cliente-test@payefy.me",
    "TestPayefy2026!",
    "tests/e2e/.auth/client.json",
    /\/dashboard/
  )
})

setup("guardar sesión: compliance", async ({ page }) => {
  await loginAndSave(
    page,
    "compliance@payefy.me",
    "TestPayefy2026!",
    "tests/e2e/.auth/compliance.json",
    /\/admin\/dashboard/
  )
})

setup("guardar sesión: super_admin", async ({ page }) => {
  await loginAndSave(
    page,
    "a.santibanez@payefy.me",
    "TestPayefy2026!",
    "tests/e2e/.auth/super_admin.json",
    /\/admin\/dashboard/
  )
})
