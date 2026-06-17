/**
 * Auditoría de app — recorre todas las rutas por rol y detecta errores.
 * Clasifica cada pantalla: OK / ROTA / NO CONSTRUIDA.
 *
 * Para correr: npx playwright test tests/e2e/audit.spec.ts
 * (requiere servidor local en localhost:3000)
 */
import { test, expect } from "@playwright/test"

const APP_ID = "a1c4c56f-8de4-4dcb-977c-121c7563fc60"

// ── Error collector ──────────────────────────────────────────────────────────
function collectErrors(page: import("@playwright/test").Page) {
  const errs: string[] = []
  page.on("console", (m) => {
    if (m.type() === "error") errs.push("console.error: " + m.text())
  })
  page.on("pageerror", (e) => errs.push("pageerror: " + e.message))
  page.on("response", (r) => {
    // Ignore Next.js HMR / static assets / supabase calls
    const url = r.url()
    if (
      r.status() >= 400 &&
      !url.includes("/_next/") &&
      !url.includes("/supabase.co/") &&
      !url.includes("fonts.googleapis") &&
      !url.includes("fonts.gstatic")
    ) {
      errs.push(`HTTP ${r.status()} ${r.url()}`)
    }
  })
  return errs
}

// ── Crash detector ───────────────────────────────────────────────────────────
async function assertNoCrash(page: import("@playwright/test").Page, route: string) {
  await expect(
    page.getByText(/Application error|server-side exception|Digest:/i),
    `Server Component crash en ${route}`
  ).toHaveCount(0)
  await expect(
    page.getByText(/500|Internal Server Error/i).first(),
    `500 error en ${route}`
  ).not.toBeVisible().catch(() => {}) // non-fatal, captured in HTTP errors
}

// ── ADMIN — super_admin ──────────────────────────────────────────────────────
test.describe("Auditoría admin: super_admin", () => {
  test.use({ storageState: "tests/e2e/.auth/super_admin.json" })

  const ADMIN_ROUTES = [
    "/admin/dashboard",
    "/admin/kanban",
    "/admin/tracking",
    "/admin/clients",
    "/admin/leads",
    "/admin/tracking/orders",
    "/admin/reportes",
    `/admin/applications/${APP_ID}/review`,
    `/admin/applications/${APP_ID}/audit`,
  ]

  for (const route of ADMIN_ROUTES) {
    test(`admin route: ${route}`, async ({ page }) => {
      const errs = collectErrors(page)

      const resp = await page.goto(route, { waitUntil: "domcontentloaded" })

      // Should not redirect to login
      expect(
        page.url(),
        `redirigió a login en ${route}`
      ).not.toMatch(/\/login/)

      // Should not crash
      await assertNoCrash(page, route)

      // HTTP status OK
      if (resp) {
        expect(
          resp.status(),
          `status HTTP en ${route}`
        ).toBeLessThan(400)
      }

      // Wait for main content to appear (non-empty body)
      await page.waitForSelector("main, [role='main'], h1, h2", { timeout: 10_000 })

      // No JS errors (collect after rendering)
      await page.waitForTimeout(500)
      expect(
        errs.filter((e) => !e.includes("favicon")),
        `errores JS/HTTP en ${route}`
      ).toHaveLength(0)
    })
  }
})

// ── ADMIN — compliance ───────────────────────────────────────────────────────
test.describe("Auditoría admin: compliance", () => {
  test.use({ storageState: "tests/e2e/.auth/compliance.json" })

  const COMPLIANCE_ROUTES = [
    "/admin/dashboard",
    "/admin/kanban",
    "/admin/clients",
    `/admin/applications/${APP_ID}/review`,
  ]

  for (const route of COMPLIANCE_ROUTES) {
    test(`compliance route: ${route}`, async ({ page }) => {
      const errs = collectErrors(page)
      const resp = await page.goto(route, { waitUntil: "domcontentloaded" })

      expect(page.url()).not.toMatch(/\/login/)
      await assertNoCrash(page, route)
      if (resp) expect(resp.status()).toBeLessThan(400)

      await page.waitForSelector("main, [role='main'], h1, h2", { timeout: 10_000 })
      await page.waitForTimeout(500)
      expect(errs.filter((e) => !e.includes("favicon"))).toHaveLength(0)
    })
  }
})

// ── CLIENT ───────────────────────────────────────────────────────────────────
test.describe("Auditoría cliente: Tony Bolivar", () => {
  test.use({ storageState: "tests/e2e/.auth/client.json" })

  const CLIENT_ROUTES = [
    "/dashboard",
    `/applications/${APP_ID}/documents`,
    `/applications/${APP_ID}/status`,
  ]

  for (const route of CLIENT_ROUTES) {
    test(`client route: ${route}`, async ({ page }) => {
      const errs = collectErrors(page)
      const resp = await page.goto(route, { waitUntil: "domcontentloaded" })

      expect(page.url()).not.toMatch(/\/login/)
      await assertNoCrash(page, route)
      if (resp) expect(resp.status()).toBeLessThan(400)

      await page.waitForSelector("main, [role='main'], h1, h2", { timeout: 10_000 })
      await page.waitForTimeout(500)
      expect(errs.filter((e) => !e.includes("favicon"))).toHaveLength(0)
    })
  }
})

// ── DEAD LINKS — admin nav ────────────────────────────────────────────────────
test.describe("Auditoría enlaces muertos: admin nav", () => {
  test.use({ storageState: "tests/e2e/.auth/super_admin.json" })

  test("todos los links del sidebar admin responden < 400", async ({ page }) => {
    await page.goto("/admin/dashboard", { waitUntil: "domcontentloaded" })

    // Collect nav links from sidebar
    const navLinks = await page.locator("nav a[href]").evaluateAll((els) =>
      els.map((el) => (el as HTMLAnchorElement).getAttribute("href") ?? "").filter((h) => h.startsWith("/admin"))
    )

    expect(navLinks.length, "sidebar debe tener al menos 5 links").toBeGreaterThanOrEqual(5)

    for (const href of [...new Set(navLinks)]) {
      const resp = await page.goto(href, { waitUntil: "domcontentloaded" })
      expect(
        resp?.status() ?? 0,
        `enlace muerto: ${href}`
      ).toBeLessThan(400)
      await expect(
        page.getByText(/Application error|server-side exception|Digest:/i),
        `crash en ${href}`
      ).toHaveCount(0)
    }
  })
})

// ── IDOR — audit route no debe exponer cross-company ─────────────────────────
test.describe("Auditoría IDOR: cliente no puede ver otras apps", () => {
  test.use({ storageState: "tests/e2e/.auth/client.json" })

  test("cliente NO puede acceder a /admin/applications/", async ({ page }) => {
    await page.goto(`/admin/applications/${APP_ID}/review`, {
      waitUntil: "domcontentloaded",
    })
    // Middleware redirects clients away from /admin/* to /dashboard (not /login)
    const finalUrl = page.url()
    const isBlocked =
      !finalUrl.includes("/admin/") ||
      finalUrl.includes("/login")
    expect(
      isBlocked,
      `cliente fue redirigido fuera del admin: ${finalUrl}`
    ).toBe(true)
  })
})
