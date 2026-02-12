import { test, expect } from '@playwright/test';
import path from 'path';

// Helper to log in with demo credentials
async function loginAsDemo(page: import('@playwright/test').Page) {
    await page.goto('/login');
    await page.fill('#email', 'demo@nexus.dev');
    await page.fill('#password', 'demo1234');
    await page.click('button[type="submit"]');
    await page.waitForURL(/integration-hub/, { timeout: 10000 });
}

test.describe('BOM Import Flow', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsDemo(page);
    });

    test('BOM Importer page loads with upload area', async ({ page }) => {
        await page.goto('/bom-importer');
        await expect(page.locator('text=Import your Bill of Materials')).toBeVisible();
        await expect(page.locator('text=Download Sample CSV')).toBeVisible();
    });

    test('can upload sample CSV and see column mapping', async ({ page }) => {
        await page.goto('/bom-importer');

        // Upload the sample CSV
        const fileInput = page.locator('input[type="file"]');
        const samplePath = path.join(process.cwd(), 'public', 'sample-bom.csv');
        await fileInput.setInputFiles(samplePath);

        // Should transition to column mapping step
        await expect(page.locator('text=Map Your Columns')).toBeVisible({ timeout: 10000 });

        // Should show AI auto-mapping badge
        await expect(page.locator('text=AI auto-mapped')).toBeVisible();

        // Required fields should have been auto-mapped
        await expect(page.locator('text=Part Number')).toBeVisible();
        await expect(page.locator('text=Quantity')).toBeVisible();
    });
});
