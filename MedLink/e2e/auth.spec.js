const { test, expect } = require('@playwright/test');

test.describe('Authentication', () => {
  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/dashboard/user/home');
    await expect(page).toHaveURL(/login/);
  });

  test('shows login page for users', async ({ page }) => {
    await page.goto('/login/user');
    await expect(page.locator('h1, h2')).toBeVisible();
  });

  test('shows login page for doctors', async ({ page }) => {
    await page.goto('/login/doctor');
    await expect(page.locator('h1, h2')).toBeVisible();
  });
});
