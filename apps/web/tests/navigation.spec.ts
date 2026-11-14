import { test, expect } from "@playwright/test";

test("home explains sourcing and links to the real Studio", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Nexus/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Every part. Every price.",
  );
  await page
    .getByRole("link", { name: "Open Studio", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/platform-core/);
  await expect(
    page.getByRole("button", { name: "Enrich BOM", exact: true }),
  ).toBeVisible();
});
test("login presents the workspace sign-in form", async ({ page }) => {
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "Sign in to your workspace." }),
  ).toBeVisible();
  await expect(page.locator("#email")).toBeVisible();
});
for (const route of [
  "/integration-hub",
  "/bom-importer",
  "/developer/playground",
]) {
  test(`${route} requires a session`, async ({ page }) => {
    await page.goto(route);
    await expect(page).toHaveURL(/login/);
  });
}
test("mobile menu exposes navigation without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("link", { name: "Docs", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Built to be understood.",
  );
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
});
