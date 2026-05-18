import { type Page, expect } from "@playwright/test"

export async function loginAs(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto("/login")
  await page.locator('input[name="email"]').fill(email)
  await page.locator('input[name="password"]').fill(password)
  await page.locator('button[type="submit"]').click()
}

export async function logout(page: Page): Promise<void> {
  const signOutBtn = page.getByRole("button", { name: /cerrar sesión/i })
  await signOutBtn.click()
  await page.waitForURL(/\/login/, { timeout: 10_000 })
  await expect(page).toHaveURL(/\/login/)
}
