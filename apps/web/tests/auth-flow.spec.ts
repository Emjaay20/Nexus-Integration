import { test, expect } from '@playwright/test';

// Helper to log in with demo credentials
async function loginAsDemo(page: import('@playwright/test').Page) {
    await page.goto('/login');
    await page.fill('#email', 'demo@nexus.dev');
    await page.fill('#password', 'demo1234');
    await page.click('button[type="submit"]');
    // Wait for redirect to integration-hub
    await page.waitForURL(/integration-hub/, { timeout: 10000 });
}

test.describe('Auth Flow', () => {
    test('can login with demo credentials', async ({ page }) => {
        await loginAsDemo(page);
        await expect(page.locator('text=Dashboard')).toBeVisible();
    });

    test('shows error for invalid credentials', async ({ page }) => {
        await page.goto('/login');
        await page.fill('#email', 'wrong@email.com');
        await page.fill('#password', 'wrongpass');
        await page.click('button[type="submit"]');
        await expect(page.locator('text=Invalid email or password')).toBeVisible();
    });

    test('can sign out', async ({ page }) => {
        await loginAsDemo(page);
        // Click sign out button (LogOut icon)
        await page.click('button[title="Sign out"]');
        await page.waitForURL(/login/);
        await expect(page.locator('text=Welcome back')).toBeVisible();
    });
});

test.describe('Integration Hub (authenticated)', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsDemo(page);
    });

    test('dashboard loads with integration cards', async ({ page }) => {
        await expect(page.locator('text=Integration Hub')).toBeVisible();
    });

    test('sidebar navigation works', async ({ page }) => {
        await page.click('text=Activity Logs');
        await expect(page).toHaveURL(/logs/);

        await page.click('text=Analytics');
        await expect(page).toHaveURL(/analytics/);

        await page.click('text=Settings');
        await expect(page).toHaveURL(/settings/);

        await page.click('text=Dashboard');
        await expect(page).toHaveURL(/integration-hub$/);
    });
});
