const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3001');
  
  // Wait for load
  await page.waitForTimeout(1000);
  
  // Scroll down to Intro text (approx 100vh)
  await page.evaluate(() => window.scrollBy(0, window.innerHeight));
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'intro-playwright-1.png' });
  
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'intro-playwright-2.png' });
  
  // Scroll down to flashlight
  await page.evaluate(() => window.scrollBy(0, window.innerHeight));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'flashlight-playwright.png' });

  await browser.close();
  console.log("Screenshots captured!");
})();
