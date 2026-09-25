import { test, expect } from '@playwright/test';

test.describe('Report Flow (Lost/Found)', () => {
  test('Form validation prevents submission of empty fields', async ({ page }) => {
    await page.goto('http://localhost:3000/report');
    
    // Attempt to submit without filling required fields
    await page.getByRole('button', { name: 'Submit Report' }).click();
    
    // Check for validation errors (e.g. outline-red or error messages)
    // Since we used native required fields or manual validations, we check if the page didn't navigate
    await expect(page).toHaveURL('http://localhost:3000/report');
  });

  test('Successful report creation with mock backend', async ({ page }) => {
    // Intercept backend API to return success
    await page.route('http://127.0.0.1:8000/api/v1/reports', async route => {
      const json = { report_id: "rep_mock123", report_type: "lost", status: "open" };
      await route.fulfill({ json, status: 201 });
    });

    await page.goto('http://localhost:3000/report');
    
    await page.fill('input[placeholder="Name of the item"]', 'Keys');
    await page.fill('textarea[placeholder="Describe your item..."]', 'A set of car keys');
    await page.fill('input[placeholder="Location..."]', 'Library');
    
    // Submit form
    await page.getByRole('button', { name: 'Submit Report' }).click();
    
    // Wait for navigation or success state
    // We expect it to go to /my-reports or similar upon success
  });
});

test.describe('Search / Retrieval Flow', () => {
  test('Empty Results State', async ({ page }) => {
    // Intercept API to return 0 results
    await page.route('http://127.0.0.1:8000/api/v1/retrieval/search', async route => {
      const json = { model_version: "mir-siamese-v0.1.0", results: [] };
      await route.fulfill({ json, status: 200 });
    });

    await page.goto('http://localhost:3000/search');
    
    await page.fill('input[placeholder="Name of the item"]', 'Random Object');
    await page.fill('textarea[placeholder="Describe your item..."]', 'Testing empty results');
    await page.fill('input[placeholder="Location..."]', 'Quad');
    
    await page.getByRole('button', { name: 'Find my item' }).click();
    
    // Check empty state UI text
    await expect(page.getByText('We will notify you')).toBeVisible();
  });

  test('Successful Results & API loading state', async ({ page }) => {
    // Intercept API with delayed response to check loading state
    await page.route('http://127.0.0.1:8000/api/v1/retrieval/search', async route => {
      const json = {
        model_version: "mir-siamese-v0.1.0",
        results: [
          { item_instance_id: "item_001", similarity_score: 0.95, rank: 1 }
        ]
      };
      // Delay for 1 second to catch loading state
      setTimeout(() => route.fulfill({ json, status: 200 }), 1000);
    });

    await page.goto('http://localhost:3000/search');
    
    await page.fill('input[placeholder="Name of the item"]', 'Macbook');
    await page.fill('textarea[placeholder="Describe your item..."]', 'Silver macbook');
    await page.fill('input[placeholder="Location..."]', 'Library');
    
    await page.getByRole('button', { name: 'Find my item' }).click();
    
    // Check loading state
    await expect(page.getByText('Running neural match')).toBeVisible();
    
    // Check success state
    await expect(page.getByText('item_001')).toBeVisible({ timeout: 5000 });
  });

  test('API Error State', async ({ page }) => {
    // Intercept API to simulate a 500 server error
    await page.route('http://127.0.0.1:8000/api/v1/retrieval/search', async route => {
      await route.fulfill({ status: 500, body: 'Internal Server Error' });
    });

    await page.goto('http://localhost:3000/search');
    
    await page.fill('input[placeholder="Name of the item"]', 'Error Object');
    await page.fill('textarea[placeholder="Describe your item..."]', 'Trigger error');
    await page.fill('input[placeholder="Location..."]', 'Library');
    
    await page.getByRole('button', { name: 'Find my item' }).click();
    
    // Expect some error message to be displayed instead of silently failing
    await expect(page.getByText(/error|failed|try again/i)).toBeVisible();
  });
});
