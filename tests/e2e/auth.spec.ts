import { test, expect } from "@playwright/test"
import { logout } from "./helpers/auth"

test.describe("Autenticación", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login")
  })

  test("muestra el formulario de login correctamente", async ({ page }) => {
    await expect(page).toHaveTitle(/PayefyKYC/)
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
    await expect(
      page.getByRole("button", { name: /iniciar sesión/i })
    ).toBeVisible()
    await expect(
      page.getByRole("link", { name: /regístrate/i })
    ).toBeVisible()
  })

  test("login con credenciales inválidas → muestra error", async ({ page }) => {
    await page.locator('input[name="email"]').fill("noexiste@payefy.me")
    await page.locator('input[name="password"]').fill("contraseñaincorrecta")
    await page.locator('button[type="submit"]').click()

    await page.waitForURL(/\?error=/, { timeout: 20_000 })
    // Excluir el route-announcer de Next.js que también usa role="alert"
    const alert = page.locator('[role="alert"]:not(#__next-route-announcer__)')
    await expect(alert).toBeVisible()
    await expect(alert).toContainText(/credenciales|inválida/i)
  })

  test("cliente hace login → redirige a /dashboard", async ({ page }) => {
    await page.locator('input[name="email"]').fill("cliente-test@payefy.me")
    await page.locator('input[name="password"]').fill("TestPayefy2026!")
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(/\/dashboard/, { timeout: 30_000 })
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page).not.toHaveURL(/\/admin/)
  })

  test("operador (compliance) hace login → redirige a /admin/dashboard", async ({
    page,
  }) => {
    await page.locator('input[name="email"]').fill("compliance@payefy.me")
    await page.locator('input[name="password"]').fill("TestPayefy2026!")
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(/\/admin\/dashboard/, { timeout: 30_000 })
    await expect(page).toHaveURL(/\/admin\/dashboard/)
  })

  test("super_admin hace login → redirige a /admin/dashboard", async ({
    page,
  }) => {
    await page.locator('input[name="email"]').fill("a.santibanez@payefy.me")
    await page.locator('input[name="password"]').fill("TestPayefy2026!")
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(/\/admin\/dashboard/, { timeout: 30_000 })
    await expect(page).toHaveURL(/\/admin\/dashboard/)
  })

  test("usuario ya logueado que va a /login → redirige a su dashboard", async ({
    page,
  }) => {
    await page.locator('input[name="email"]').fill("cliente-test@payefy.me")
    await page.locator('input[name="password"]').fill("TestPayefy2026!")
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(/\/dashboard/, { timeout: 30_000 })

    await page.goto("/login")
    await page.waitForURL(/\/dashboard/, { timeout: 20_000 })
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test("logout redirige a /login", async ({ page }) => {
    await page.locator('input[name="email"]').fill("cliente-test@payefy.me")
    await page.locator('input[name="password"]').fill("TestPayefy2026!")
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(/\/dashboard/, { timeout: 30_000 })

    await logout(page)
    await expect(page).toHaveURL(/\/login/)
  })

  test("página de registro es accesible y muestra formulario", async ({
    page,
  }) => {
    await page.getByRole("link", { name: /regístrate/i }).click()
    await expect(page).toHaveURL(/\/register/)
    await expect(page.locator('input[name="fullName"]')).toBeVisible()
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
  })

  test("forgot-password page es accesible y muestra formulario", async ({
    page,
  }) => {
    await page.goto("/forgot-password")
    await expect(page).toHaveURL(/\/forgot-password/)
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(
      page.getByRole("button", { name: /enviar enlace/i })
    ).toBeVisible()
    await expect(
      page.getByRole("link", { name: /regresar/i })
    ).toBeVisible()
  })

  test("forgot-password: email inválido muestra error", async ({ page }) => {
    await page.goto("/forgot-password")
    await page.locator('input[name="email"]').fill("noesunemail")
    await page.getByRole("button", { name: /enviar enlace/i }).click()
    await page.waitForURL(/\?error=/, { timeout: 20_000 })
    await expect(
      page.locator('[role="alert"]:not(#__next-route-announcer__)')
    ).toBeVisible()
  })

  test("forgot-password: email válido muestra mensaje de éxito", async ({
    page,
  }) => {
    await page.goto("/forgot-password")
    await page.locator('input[name="email"]').fill("cliente-test@payefy.me")
    await page.getByRole("button", { name: /enviar enlace/i }).click()
    await page.waitForURL(/\?success=/, { timeout: 20_000 })
    await expect(
      page.locator('[role="alert"]:not(#__next-route-announcer__)')
    ).toBeVisible()
  })

  test("reset-password: sin sesión redirige a login", async ({ page }) => {
    await page.goto("/reset-password")
    // El middleware redirige a /login porque no hay sesión de recovery
    await page.waitForURL(/\/login/, { timeout: 20_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test("login page: tiene link a forgot-password", async ({ page }) => {
    await page.goto("/login")
    await expect(
      page.getByRole("link", { name: /olvidaste tu contraseña/i })
    ).toBeVisible()
  })
})
