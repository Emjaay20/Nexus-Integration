import { test, expect } from '@playwright/test';

// Helper to log in with demo credentials
async function loginAsDemo(page: import('@playwright/test').Page) {
    await page.goto('/login');
    await page.fill('#email', 'demo@nexus.dev');
    await page.fill('#password', 'demo1234');
    await page.click('button[type="submit"]');
    await page.waitForURL(/integration-hub/, { timeout: 10000 });
}

test.describe('API Playground', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsDemo(page);
    });

    test('playground loads with example payloads', async ({ page }) => {
        await page.goto('/developer/playground');
        await expect(page.locator('text=API Playground')).toBeVisible({ timeout: 5000 });
    });
});
