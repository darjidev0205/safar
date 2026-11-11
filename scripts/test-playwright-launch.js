const { chromium } = require('playwright');

async function test() {
  console.log('Testing Playwright launch...');
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    console.log('✅ Successfully launched Chrome channel.');
  } catch (err) {
    console.log('Chrome channel failed, trying msedge:', err.message);
    try {
      browser = await chromium.launch({ channel: 'msedge', headless: true });
      console.log('✅ Successfully launched msedge channel.');
    } catch (e2) {
      console.log('msedge failed, trying default chromium:', e2.message);
      browser = await chromium.launch({ headless: true });
      console.log('✅ Successfully launched default chromium.');
    }
  }
  const page = await browser.newPage();
  await page.goto('http://localhost:3000');
  const title = await page.title();
  console.log('Page Title:', title);
  await browser.close();
  console.log('Browser test finished cleanly.');
}

test().catch(console.error);

