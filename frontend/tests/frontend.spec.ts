import { test, expect } from '@playwright/test';

test.describe('Report Flow (Lost/Found)', () => {
  test('Form validation prevents submission of empty fields', async ({ page }) => {
    await page.goto('http://localhost:3000/report');
    
    // Attempt to submit (continue) without filling required fields
    await page.getByRole('button', { name: 'Continue' }).click();
    
    // Check for validation errors
    await expect(page.getByText('Add an item name before continuing.')).toBeVisible();
  });

  test('Successful report creation with mock backend', async ({ page }) => {
    // Intercept backend API to return success
    await page.route('http://127.0.0.1:8000/api/v1/reports', async route => {
      const json = { report_id: "rep_mock123", report_type: "lost", status: "open" };
      await route.fulfill({ json, status: 201 });
    });

    await page.goto('http://localhost:3000/report?type=found');
    
    // Step 0: Item Name
    await page.getByRole('textbox').first().fill('Keys');
    await page.getByRole('button', { name: 'Continue' }).click();

    // Step 1: Details
    await page.getByRole('textbox').first().fill('A set of car keys');
    await page.getByRole('button', { name: 'Continue' }).click();

    // Step 2: Photo (skip optional)
    await page.getByRole('button', { name: 'Continue' }).click();

    // Step 3: Location & Date
    await page.getByRole('textbox').first().fill('Library');
    
    // Click DatePicker input to open it
    await page.locator('.react-datepicker-wrapper input').click();
    // Select the current day (usually pre-selected or highlighted)
    await page.locator('.react-datepicker__day[aria-disabled="false"]').first().click();
    // Click OK on the date picker
    await page.getByRole('button', { name: 'OK' }).click();
    
    await page.getByRole('button', { name: 'Continue' }).click();

    // Step 4: Review
    // Submit form
    await page.getByRole('button', { name: 'Submit found-item report' }).click();
    
    // Check success
    await expect(page.getByText('Report submitted')).toBeVisible();
  });
});

test.describe('Search / Retrieval Flow', () => {
  test('Empty Results State', async ({ page }) => {
    // Intercept API to return 0 results
    await page.route('http://127.0.0.1:8000/api/v1/reports', async route => {
      await route.fulfill({ json: {}, status: 201 });
    });
    await page.route('http://127.0.0.1:8000/api/v1/retrieval/search', async route => {
      const json = { model_version: "mir-siamese-v0.1.0", results: [] };
      await route.fulfill({ json, status: 200 });
    });

    await page.goto('http://localhost:3000/search');
    
    // Using index or specific placeholders
    await page.getByPlaceholder('e.g. Blue Chillys Bottle').fill('Random Object');
    await page.getByPlaceholder('Colour, shape, a sticker').fill('Testing empty results');
    await page.getByPlaceholder('e.g. Library, Cafe').fill('Quad');
    
    // DatePicker
    await page.locator('.react-datepicker-wrapper input').click();
    await page.locator('.react-datepicker__day[aria-disabled="false"]').first().click();
    await page.getByRole('button', { name: 'OK' }).click();
    
    await page.getByRole('button', { name: 'Find my item' }).click();
    
    // Check empty state UI text (the text is "We've got your back.")
    await expect(page.getByText(/We've got your back/i)).toBeVisible();
  });

  test('Successful Results & API loading state', async ({ page }) => {
    await page.route('http://127.0.0.1:8000/api/v1/reports', async route => {
      await route.fulfill({ json: {}, status: 201 });
    });
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
    
    await page.getByPlaceholder('e.g. Blue Chillys Bottle').fill('Macbook');
    await page.getByPlaceholder('Colour, shape, a sticker').fill('Silver macbook');
    await page.getByPlaceholder('e.g. Library, Cafe').fill('Library');

    // DatePicker
    await page.locator('.react-datepicker-wrapper input').click();
    await page.locator('.react-datepicker__day[aria-disabled="false"]').first().click();
    await page.getByRole('button', { name: 'OK' }).click();
    
    await page.getByRole('button', { name: 'Find my item' }).click();
    
    // Check loading state
    await expect(page.getByText('Search in progress')).toBeVisible();
    
    // Check success state
    await expect(page.getByText('item_001')).toBeVisible({ timeout: 5000 });
  });

  test('API Error State', async ({ page }) => {
    await page.route('http://127.0.0.1:8000/api/v1/reports', async route => {
      await route.fulfill({ json: {}, status: 201 });
    });
    // Intercept API to simulate a 500 server error
    await page.route('http://127.0.0.1:8000/api/v1/retrieval/search', async route => {
      await route.fulfill({ status: 500, body: 'Internal Server Error' });
    });

    await page.goto('http://localhost:3000/search');
    
    await page.getByPlaceholder('e.g. Blue Chillys Bottle').fill('Error Object');
    await page.getByPlaceholder('Colour, shape, a sticker').fill('Trigger error');
    await page.getByPlaceholder('e.g. Library, Cafe').fill('Library');

    // DatePicker
    await page.locator('.react-datepicker-wrapper input').click();
    await page.locator('.react-datepicker__day[aria-disabled="false"]').first().click();
    await page.getByRole('button', { name: 'OK' }).click();
    
    // Playwright captures window alerts which would otherwise stall the test
    page.on('dialog', dialog => dialog.accept());

    await page.getByRole('button', { name: 'Find my item' }).click();
    
    // Expect some error message to be displayed instead of silently failing (falls back to 'find')
    await expect(page.getByText('Start with words')).toBeVisible();
  });
});
