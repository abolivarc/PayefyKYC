/**
 * B1 — IDOR / access-control tests
 *
 * These tests verify that:
 *  1. Unauthenticated requests to document API are rejected with 401.
 *  2. An authenticated client cannot retrieve documents they don't own (404).
 *  3. An authenticated client cannot access admin review pages.
 *
 * The tests use the existing client test session and random/non-owned UUIDs.
 * A full two-company fixture test would require a second registered client in
 * the production project; that fixture lives in global.setup.ts when added.
 */

import { test, expect } from "@playwright/test"

// ─── Unauthenticated IDOR ────────────────────────────────────────────────────
test.describe("B1 — Acceso sin sesión", () => {
  test("GET /api/documents/{uuid} sin auth → 401", async ({ request }) => {
    const fakeId = "00000000-0000-0000-0000-000000000000"
    const res = await request.get(`/api/documents/${fakeId}/view`, {
      maxRedirects: 0,
    })
    expect(res.status()).toBe(401)
  })
})

// ─── Authenticated client IDOR ───────────────────────────────────────────────
test.describe("B1 — IDOR cliente autenticado", () => {
  test.use({ storageState: "tests/e2e/.auth/client.json" })

  test("cliente con sesión pero UUID no existente → 404", async ({ request }) => {
    const nonExistentId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
    const res = await request.get(`/api/documents/${nonExistentId}/view`, {
      maxRedirects: 0,
    })
    // Must be 404 (not found / access denied), never a signed URL or 200/302
    expect([403, 404]).toContain(res.status())
  })

  test("cliente intenta /admin/applications/{uuid}/review → redirige a /dashboard", async ({
    page,
  }) => {
    const fakeAppId = "00000000-0000-0000-0000-000000000001"
    await page.goto(`/admin/applications/${fakeAppId}/review`)
    await page.waitForURL(/\/dashboard/, { timeout: 20_000 })
    expect(page.url()).toMatch(/\/dashboard/)
    expect(page.url()).not.toMatch(/\/admin/)
  })

  test("cliente intenta /admin/tracking → redirige a /dashboard", async ({
    page,
  }) => {
    await page.goto("/admin/tracking")
    await page.waitForURL(/\/dashboard/, { timeout: 20_000 })
    expect(page.url()).toMatch(/\/dashboard/)
  })
})
