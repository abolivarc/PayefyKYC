import { test, expect } from "@playwright/test"

test.use({ storageState: "tests/e2e/.auth/client.json" })

test.describe("Portal del cliente — Dashboard", () => {
  test("dashboard carga y muestra contenido del cliente", async ({ page }) => {
    await page.goto("/dashboard")
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByRole("heading", { name: /bienvenido/i })).toBeVisible()

    // Dashboard shows either an existing application card ("Ver expediente") or a CTA ("Iniciar KYC")
    const hasExpedienteLink = await page.getByRole("link", { name: /ver expediente/i }).count()
    const hasKycButton = await page.getByText(/iniciar kyc/i).count()

    expect(hasExpedienteLink + hasKycButton).toBeGreaterThan(0)
  })

  test("navegación: /applications/new es accesible", async ({ page }) => {
    await page.goto("/applications/new")
    await expect(page).toHaveURL(/\/applications\/new/)
    // Product selector shows these options
    await expect(page.getByText(/solo tarjeta payefy/i).first()).toBeVisible()
  })
})

test.describe("Portal del cliente — Wizard de nueva solicitud", () => {
  test("paso 1: se pueden seleccionar productos", async ({ page }) => {
    await page.goto("/applications/new")

    const tarjetaOption = page.getByText(/solo tarjeta payefy/i).first()
    const terminalOption = page.getByText(/solo terminal/i).first()

    await expect(tarjetaOption).toBeVisible()
    await expect(terminalOption).toBeVisible()

    await tarjetaOption.click()
    await expect(page.getByRole("button", { name: /continuar/i })).toBeEnabled()
  })

  test("paso 2: validación del formulario de empresa", async ({ page }) => {
    await page.goto("/applications/new")
    await page.getByText(/solo tarjeta payefy/i).first().click()
    await page.getByRole("button", { name: /continuar/i }).click()

    await expect(page.locator('input[name="legal_name"]')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('input[name="tax_id"]')).toBeVisible()
    await expect(page.getByRole("button", { name: /crear solicitud/i })).toBeVisible()
  })

  test("botón 'atrás' regresa al paso 1", async ({ page }) => {
    await page.goto("/applications/new")
    await page.getByText(/solo tarjeta payefy/i).first().click()
    await page.getByRole("button", { name: /continuar/i }).click()

    await page.getByRole("button", { name: /atrás/i }).click()
    await expect(page.getByRole("button", { name: /continuar/i })).toBeVisible()
  })
})

test.describe("Portal del cliente — Documentos", () => {
  test("si existe una application, la documents page carga", async ({ page }) => {
    await page.goto("/dashboard")

    const expedienteLink = page.getByRole("link", { name: /ver expediente/i }).first()

    if (await expedienteLink.isVisible()) {
      await expedienteLink.click()
      await expect(page).toHaveURL(/\/applications\/.+\/documents/)
      await expect(
        page.getByText(/formularios digitales|documentos de la empresa/i).first()
      ).toBeVisible()
    } else {
      test.skip(true, "No hay aplicaciones creadas para este usuario de prueba")
    }
  })

  test("forms page: beneficial_owner es accesible si hay application", async ({
    page,
  }) => {
    await page.goto("/dashboard")
    const expedienteLink = page.getByRole("link", { name: /ver expediente/i }).first()

    if (await expedienteLink.isVisible()) {
      const href = await expedienteLink.getAttribute("href")
      if (href) {
        const appId = href.match(/\/applications\/([^/]+)/)?.[1]
        if (appId) {
          await page.goto(`/applications/${appId}/forms/beneficial_owner`)
          await expect(page).toHaveURL(/\/forms\/beneficial_owner/)
          await expect(page.getByText(/beneficiario controlador/i)).toBeVisible()
        }
      }
    } else {
      test.skip(true, "No hay aplicaciones para probar el formulario")
    }
  })
})

test.describe("Portal del cliente — Status", () => {
  test("status page muestra el pipeline si hay application", async ({ page }) => {
    await page.goto("/dashboard")
    const expedienteLink = page.getByRole("link", { name: /ver expediente/i }).first()

    if (await expedienteLink.isVisible()) {
      const href = await expedienteLink.getAttribute("href")
      const appId = href?.match(/\/applications\/([^/]+)/)?.[1]
      if (appId) {
        await page.goto(`/applications/${appId}/status`)
        await expect(page).toHaveURL(/\/applications\/.+\/status/)
        await expect(page.getByText(/borrador|documentos pendientes/i)).toBeVisible()
      }
    } else {
      test.skip(true, "No hay aplicaciones para probar el status")
    }
  })
})

test.describe("Portal del cliente — Identidad visual", () => {
  test("portal cliente muestra el wordmark Payefy en el header", async ({ page }) => {
    await page.goto("/dashboard")
    // Header shows Payefy wordmark as image
    await expect(page.getByRole("img", { name: "Payefy" }).first()).toBeVisible()
  })
})
