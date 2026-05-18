import { test, expect } from "@playwright/test"

test.describe("Control de acceso por rol — cliente", () => {
  test.use({ storageState: "tests/e2e/.auth/client.json" })

  test("cliente puede acceder a /dashboard", async ({ page }) => {
    await page.goto("/dashboard")
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page).not.toHaveURL(/\/login/)
  })

  test("cliente intentando /admin/dashboard → redirige a /dashboard", async ({
    page,
  }) => {
    await page.goto("/admin/dashboard")
    await page.waitForURL(/\/dashboard/, { timeout: 20_000 })
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page).not.toHaveURL(/\/admin/)
  })

  test("cliente intentando /admin/kanban → redirige a /dashboard", async ({
    page,
  }) => {
    await page.goto("/admin/kanban")
    await page.waitForURL(/\/dashboard/, { timeout: 20_000 })
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test("cliente intentando /admin/clients → redirige a /dashboard", async ({
    page,
  }) => {
    await page.goto("/admin/clients")
    await page.waitForURL(/\/dashboard/, { timeout: 20_000 })
    await expect(page).toHaveURL(/\/dashboard/)
  })
})

test.describe("Control de acceso por rol — compliance", () => {
  test.use({ storageState: "tests/e2e/.auth/compliance.json" })

  test("compliance puede acceder a /admin/dashboard", async ({ page }) => {
    await page.goto("/admin/dashboard")
    await expect(page).toHaveURL(/\/admin\/dashboard/)
    await expect(page).not.toHaveURL(/\/login/)
  })

  test("compliance intentando /dashboard → redirige a /admin/dashboard", async ({
    page,
  }) => {
    await page.goto("/dashboard")
    await page.waitForURL(/\/admin\/dashboard/, { timeout: 20_000 })
    await expect(page).toHaveURL(/\/admin\/dashboard/)
  })

  test("compliance puede ver el kanban", async ({ page }) => {
    await page.goto("/admin/kanban")
    await expect(page).toHaveURL(/\/admin\/kanban/)
  })
})

test.describe("Rutas protegidas sin sesión", () => {
  test("/ sin sesión → redirige a /login", async ({ page }) => {
    await page.goto("/")
    await page.waitForURL(/\/login/, { timeout: 20_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test("/dashboard sin sesión → redirige a /login", async ({ page }) => {
    await page.goto("/dashboard")
    await page.waitForURL(/\/login/, { timeout: 20_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test("/admin/dashboard sin sesión → redirige a /login", async ({ page }) => {
    await page.goto("/admin/dashboard")
    await page.waitForURL(/\/login/, { timeout: 20_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test("/admin/kanban sin sesión → redirige a /login", async ({ page }) => {
    await page.goto("/admin/kanban")
    await page.waitForURL(/\/login/, { timeout: 20_000 })
    await expect(page).toHaveURL(/\/login/)
  })
})
