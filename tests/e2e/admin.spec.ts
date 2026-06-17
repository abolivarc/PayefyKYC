import { test, expect } from "@playwright/test"

test.use({ storageState: "tests/e2e/.auth/compliance.json" })

test.describe("Portal del admin — Navegación y layout", () => {
  test("dashboard admin carga correctamente", async ({ page }) => {
    await page.goto("/admin/dashboard")
    await expect(page).toHaveURL(/\/admin\/dashboard/)
    // Sidebar muestra wordmark de Payefy como imagen (no texto)
    await expect(page.getByRole("link", { name: "Kanban", exact: true })).toBeVisible()
    await expect(page.getByRole("link", { name: "Clientes", exact: true })).toBeVisible()
  })

  test("sidebar: navegación a kanban funciona", async ({ page }) => {
    await page.goto("/admin/dashboard")
    await page.getByRole("link", { name: "Kanban", exact: true }).click()
    await expect(page).toHaveURL(/\/admin\/kanban/)
  })

  test("sidebar: navegación a clientes funciona", async ({ page }) => {
    await page.goto("/admin/dashboard")
    await page.getByRole("link", { name: "Clientes", exact: true }).click()
    await expect(page).toHaveURL(/\/admin\/clients/)
  })

  test("sidebar: navegación a leads funciona", async ({ page }) => {
    await page.goto("/admin/dashboard")
    await page.getByRole("link", { name: /leads/i }).click()
    await expect(page).toHaveURL(/\/admin\/leads/)
  })
})

test.describe("Portal del admin — Kanban", () => {
  test("kanban page carga y muestra columnas", async ({ page }) => {
    await page.goto("/admin/kanban")
    await expect(page).toHaveURL(/\/admin\/kanban/)
    // Check a subset of column labels that always exist
    const columnas = ["Borrador", "En revisión", "Activado ✓"]
    for (const col of columnas) {
      await expect(page.getByText(col).first()).toBeVisible()
    }
  })

  test("kanban: carga sin errores independientemente de aplicaciones", async ({
    page,
  }) => {
    await page.goto("/admin/kanban")
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page).not.toHaveURL(/error/)
  })
})

test.describe("Portal del admin — Lista de clientes", () => {
  test("clients page carga y muestra tabla o mensaje vacío", async ({
    page,
  }) => {
    await page.goto("/admin/clients")
    await expect(page).toHaveURL(/\/admin\/clients/)

    const hasTable = await page.locator("table").count()
    const hasEmptyMsg = await page.getByText(/no hay clientes/i).count()

    expect(hasTable + hasEmptyMsg).toBeGreaterThan(0)
  })

  test("clients page: link a review de cada aplicación", async ({ page }) => {
    await page.goto("/admin/clients")
    const reviewLink = page.getByRole("link", { name: /revisar/i }).first()

    if (await reviewLink.isVisible()) {
      await reviewLink.click()
      await expect(page).toHaveURL(/\/admin\/applications\/.+\/review/)
    } else {
      test.skip(true, "No hay clientes con aplicaciones para revisar")
    }
  })
})

test.describe("Portal del admin — Revisión de documentos", () => {
  test("review page muestra documentos agrupados por categoría", async ({
    page,
  }) => {
    await page.goto("/admin/clients")
    const reviewLink = page.getByRole("link", { name: /revisar/i }).first()

    if (await reviewLink.isVisible()) {
      await reviewLink.click()
      await page.waitForURL(/\/admin\/applications\/.+\/review/)
      await expect(
        page.getByText(/formularios|documentos de la empresa|fiscal/i).first()
      ).toBeVisible()
      await expect(page.locator("select").first()).toBeVisible()
    } else {
      test.skip(true, "No hay aplicaciones para revisar")
    }
  })

  test("audit page es accesible desde review", async ({ page }) => {
    await page.goto("/admin/clients")
    const reviewLink = page.getByRole("link", { name: /revisar/i }).first()

    if (await reviewLink.isVisible()) {
      const href = await reviewLink.getAttribute("href")
      const appId = href?.match(/\/applications\/([^/]+)/)?.[1]
      if (appId) {
        await page.goto(`/admin/applications/${appId}/audit`)
        await expect(page).toHaveURL(/\/admin\/applications\/.+\/audit/)
        await expect(
          page.getByRole("heading", { name: /auditoría|historial/i })
        ).toBeVisible()
      }
    } else {
      test.skip(true, "No hay aplicaciones para ver auditoría")
    }
  })
})

test.describe("Portal del admin — super_admin", () => {
  test.use({ storageState: "tests/e2e/.auth/super_admin.json" })

  test("super_admin ve todos los recursos del admin", async ({ page }) => {
    await page.goto("/admin/dashboard")
    await expect(page).toHaveURL(/\/admin\/dashboard/)
    await expect(page.getByRole("link", { name: "Kanban", exact: true })).toBeVisible()
  })
})

test.describe("Portal del admin — Identidad visual", () => {
  test("portal admin muestra wordmark Payefy en el sidebar", async ({ page }) => {
    await page.goto("/admin/dashboard")
    // Wordmark como imagen con alt "Payefy"
    await expect(page.getByRole("img", { name: "Payefy" }).first()).toBeVisible()
    await expect(page.getByRole("link", { name: "Kanban", exact: true })).toBeVisible()
  })

  test("admin dashboard muestra métricas reales", async ({ page }) => {
    await page.goto("/admin/dashboard")
    await expect(page.getByText(/total solicitudes/i)).toBeVisible()
    await expect(page.getByText(/en revisión/i).first()).toBeVisible()
    await expect(page.getByText(/activadas/i).first()).toBeVisible()
  })
})
