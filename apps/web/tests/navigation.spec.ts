import { test, expect } from '@playwright/test';

test.describe('Navigation Smoke Tests', () => {
    test('home page loads with correct branding', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveTitle(/Nexus/i);
        await expect(page.locator('text=Nexus')).toBeVisible();
    });

    test('login page loads', async ({ page }) => {
        await page.goto('/login');
        await expect(page.locator('text=Welcome back')).toBeVisible();
        await expect(page.locator('text=Demo Credentials')).toBeVisible();
    });

    test('protected routes redirect to login', async ({ page }) => {
        await page.goto('/integration-hub');
        // Should be redirected to login
        await expect(page).toHaveURL(/login/);
    });

    test('BOM Importer redirects to login when unauthenticated', async ({ page }) => {
        await page.goto('/bom-importer');
        await expect(page).toHaveURL(/login/);
    });

    test('Developer playground redirects to login when unauthenticated', async ({ page }) => {
        await page.goto('/developer/playground');
        await expect(page).toHaveURL(/login/);
    });

    test('home page has navigation links', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('header')).toBeVisible();
        await expect(page.locator('text=BOM Importer')).toBeVisible();
        await expect(page.locator('text=Integration Hub')).toBeVisible();
        await expect(page.locator('text=Developer')).toBeVisible();
    });

    test('home page has demo timeline', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('text=How to Experience the Demo')).toBeVisible();
    });
});
