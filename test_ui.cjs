
const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  await page.goto('http://localhost:5173');
  await page.type('input[type=\'email\']', 'demo@merkez.com');
  await page.type('input[type=\'password\']', 'password123');
  await page.click('button[type=\'submit\']');
  await page.waitForNavigation();
  await page.goto('http://localhost:5173/warehouse.html');
  await new Promise(r => setTimeout(r, 5000));
  const html = await page.evaluate(() => document.body.innerHTML);
  if (html.includes('M?hsul tapilmadi')) console.log('EMPTY STATE DETECTED!');
  if (html.includes('ZAVOD QIYM?TI')) console.log('ZAVOD DETECTED!');
  const products = await page.evaluate(() => document.querySelectorAll('tbody tr').length);
  console.log('PRODUCTS RENDERED:', products);
  await browser.close();
})();

