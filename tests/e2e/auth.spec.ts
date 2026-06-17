import { test, expect } from "@playwright/test"
import { logout } from "./helpers/auth"

const PW = "TestPayefy2026!"

// ── Client portal login (/login) ─────────────────────────────────────────────
test.describe("Autenticación — portal cliente", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login")
  })

  test("muestra el formulario de login correctamente", async ({ page }) => {
    await expect(page).toHaveTitle(/PayefyKYC/)
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
    await expect(page.getByRole("button", { name: /iniciar sesión/i })).toBeVisible()
    await expect(page.getByRole("link", { name: /regístrate/i })).toBeVisible()
  })

  test("login con credenciales inválidas → muestra error", async ({ page }) => {
    await page.locator('input[name="email"]').fill("noexiste@payefy.me")
    await page.locator('input[name="password"]').fill("contraseñaincorrecta")
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(/\?error=/, { timeout: 20_000 })
    const alert = page.locator('[role="alert"]:not(#__next-route-announcer__)')
    await expect(alert).toBeVisible()
    await expect(alert).toContainText(/credenciales|inválida/i)
  })

  test("staff en portal cliente → recibe error de cuenta interna", async ({ page }) => {
    // Staff accounts are rejected at the client login portal
    await page.locator('input[name="email"]').fill("compliance@payefy.me")
    await page.locator('input[name="password"]').fill(PW)
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(/\?error=/, { timeout: 20_000 })
    const alert = page.locator('[role="alert"]:not(#__next-route-announcer__)')
    await expect(alert).toBeVisible()
    await expect(alert).toContainText(/uso interno|portal de empleados/i)
  })

  test("login page: tiene link a forgot-password", async ({ page }) => {
    await expect(page.getByRole("link", { name: /olvidaste tu contraseña/i })).toBeVisible()
  })

  test("página de registro es accesible y muestra formulario", async ({ page }) => {
    await page.getByRole("link", { name: /regístrate/i }).click()
    await expect(page).toHaveURL(/\/register/)
    await expect(page.locator('input[name="fullName"]')).toBeVisible()
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
  })

  test("forgot-password page es accesible y muestra formulario", async ({ page }) => {
    await page.goto("/forgot-password")
    await expect(page).toHaveURL(/\/forgot-password/)
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.getByRole("button", { name: /enviar enlace/i })).toBeVisible()
    await expect(page.getByRole("link", { name: /regresar/i })).toBeVisible()
  })

  test("forgot-password: email inválido muestra error", async ({ page }) => {
    await page.goto("/forgot-password")
    await page.locator('input[name="email"]').fill("noesunemail")
    await page.getByRole("button", { name: /enviar enlace/i }).click()
    await page.waitForURL(/\?error=/, { timeout: 20_000 })
    await expect(page.locator('[role="alert"]:not(#__next-route-announcer__)')).toBeVisible()
  })

  test("forgot-password: email válido muestra mensaje de éxito", async ({ page }) => {
    await page.goto("/forgot-password")
    await page.locator('input[name="email"]').fill("cliente-test@payefy.me")
    await page.getByRole("button", { name: /enviar enlace/i }).click()
    await page.waitForURL(/\?success=/, { timeout: 20_000 })
    await expect(page.locator('[role="alert"]:not(#__next-route-announcer__)')).toBeVisible()
  })

  test("reset-password: sin sesión redirige a login", async ({ page }) => {
    await page.goto("/reset-password")
    await page.waitForURL(/\/login/, { timeout: 20_000 })
    await expect(page).toHaveURL(/\/login/)
  })
})

// ── Admin portal login (/admin/login) ────────────────────────────────────────
test.describe("Autenticación — portal admin", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/login")
  })

  test("compliance hace login → redirige a /admin/dashboard", async ({ page }) => {
    await page.locator('input[name="email"]').fill("compliance@payefy.me")
    await page.locator('input[name="password"]').fill(PW)
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(/\/admin\/dashboard/, { timeout: 30_000 })
    await expect(page).toHaveURL(/\/admin\/dashboard/)
  })

  test("super_admin hace login → redirige a /admin/dashboard", async ({ page }) => {
    await page.locator('input[name="email"]').fill("a.santibanez@payefy.me")
    await page.locator('input[name="password"]').fill(PW)
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(/\/admin\/dashboard/, { timeout: 30_000 })
    await expect(page).toHaveURL(/\/admin\/dashboard/)
  })
})

// ── Authenticated user flows (use stored sessions) ───────────────────────────
test.describe("Autenticación — sesión activa (admin)", () => {
  test.use({ storageState: "tests/e2e/.auth/super_admin.json" })

  test("usuario admin logueado que va a /admin/login → redirige a /admin/dashboard", async ({ page }) => {
    await page.goto("/admin/login")
    await page.waitForURL(/\/admin\/dashboard/, { timeout: 20_000 })
    await expect(page).toHaveURL(/\/admin\/dashboard/)
  })

  test("logout redirige a /login", async ({ page }) => {
    await page.goto("/admin/dashboard")
    await logout(page)
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe("Autenticación — sesión activa (cliente)", () => {
  test.use({ storageState: "tests/e2e/.auth/client.json" })

  test("usuario cliente logueado que va a /login → redirige a /dashboard", async ({ page }) => {
    await page.goto("/login")
    await page.waitForURL(/\/dashboard/, { timeout: 20_000 })
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page).not.toHaveURL(/\/admin/)
  })
})
