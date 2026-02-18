import { test, expect } from '@playwright/test';

test('signup -> login -> dashboard', async ({ page }) => {
  await page.goto('/signup');
  await page.getByPlaceholder('Name').fill('Playwright User');
  await page.getByPlaceholder('Email').fill(`pw-${Date.now()}@example.com`);
  await page.getByPlaceholder('Password (min 8 chars)').fill('password123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/onboarding|dashboard/);
});
