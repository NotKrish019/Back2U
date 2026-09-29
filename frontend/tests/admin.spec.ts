import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard', () => {
  // Use a custom route mapping to mock the backend for admin
  test.beforeEach(async ({ page }) => {
    // Mock user profile to act like an admin if needed by frontend
    await page.route('**/api/v1/users/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'usr_admin',
          firebase_uid: 'test_admin_uid',
          email: 'admin@example.com',
          display_name: 'Admin',
          is_admin: 'true'
        })
      });
    });

    // Mock overview
    await page.route('**/api/v1/admin/overview*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          pending_claims: 2,
          pending_matches: 5,
          uncertain_matches: 1,
          open_lost_reports: 10,
          recently_found: 8,
          returned_items: 20
        })
      });
    });
    
    // Mock claims
    await page.route('**/api/v1/admin/claims*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            claim_id: 'claim_001',
            report_id: 'rep_001',
            claimer_user_id: 'usr_002',
            status: 'pending',
            proof_text: 'I have the original receipt.',
            created_at: new Date().toISOString(),
            report: {
              report_id: 'rep_001',
              item_category: 'Laptop',
              description: 'Silver Macbook Pro',
            }
          }
        ])
      });
    });

    // Mock candidate matches
    await page.route('**/api/v1/admin/candidates*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            match_id: 'match_001',
            lost_report_id: 'rep_lost_1',
            found_report_id: 'rep_found_1',
            similarity_score: 0.95,
            status: 'pending',
            created_at: new Date().toISOString(),
            lost_report: { item_category: 'Laptop', description: 'Lost silver macbook' },
            found_report: { item_category: 'Laptop', description: 'Found silver macbook' }
          }
        ])
      });
    });
  });

  test('Shows overview metrics on load', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('TEST_MODE', 'true');
    });
    await page.goto('http://localhost:3000/admin');
    
    await expect(page.getByText('Staff Operations')).toBeVisible();
    await expect(page.getByText('Pending Claims')).toBeVisible();
    
    // Should display the mocked overview data (2 pending claims)
    await expect(page.locator('.reports-summary b').first()).toHaveText('2');
  });

  test('Can switch to claims tab and view claims', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('TEST_MODE', 'true');
    });
    await page.goto('http://localhost:3000/admin');
    
    await page.getByRole('button', { name: 'Claims' }).click();
    
    // The claim text from mock should be visible
    await expect(page.getByText('I have the original receipt.')).toBeVisible();
    await expect(page.getByText('Laptop')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Approve' })).toBeVisible();
  });

  test('Can switch to candidates tab and view matches', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('TEST_MODE', 'true');
    });
    await page.goto('http://localhost:3000/admin');
    
    await page.getByRole('button', { name: 'Candidate Matches' }).click();
    
    // The candidate text from mock should be visible
    await expect(page.getByText('Lost silver macbook')).toBeVisible();
    await expect(page.getByText('Found silver macbook')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Accept' })).toBeVisible();
  });
});
