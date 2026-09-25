const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log("Navigating to http://localhost:3000/search ...");
  await page.goto('http://localhost:3000/search');

  // Monitor network requests
  page.on('response', async (response) => {
    if (response.url().includes('/api/v1/')) {
      console.log(`\n--- API RESPONSE ---`);
      console.log(`URL: ${response.url()}`);
      console.log(`Status: ${response.status()}`);
      try {
        const text = await response.text();
        console.log(`Body: ${text}`);
      } catch (e) {
        console.log(`Could not read body`);
      }
    }
  });

  page.on('request', request => {
    if (request.url().includes('/api/v1/')) {
      console.log(`\n--- API REQUEST ---`);
      console.log(`URL: ${request.url()}`);
      console.log(`Method: ${request.method()}`);
      console.log(`Headers:`, request.headers());
    }
  });

  console.log("Filling out the search form...");
  await page.waitForSelector('input[placeholder="e.g. Blue Chillys Bottle"]');
  await page.fill('input[placeholder="e.g. Blue Chillys Bottle"]', 'Test Item');
  await page.fill('textarea', 'Test Description');
  await page.fill('input[placeholder="e.g. Library, Cafe"]', 'Library');
  
  // Date picker
  await page.click('input[placeholder="Select date and time"]');
  await page.click('.react-datepicker__day--today');
  await page.click('button:has-text("OK")');

  console.log("Clicking 'Find my item' button...");
  await page.click('button:has-text("Find my item")');

  // Wait for 5 seconds to see what happens
  await page.waitForTimeout(5000);

  // Take a screenshot
  await page.screenshot({ path: 'scratch/playwright_end_state.png' });
  console.log("Screenshot saved to scratch/playwright_end_state.png");

  await browser.close();
})();
