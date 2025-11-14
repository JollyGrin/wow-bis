import puppeteer from 'puppeteer';

async function testDirectAccess() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    
    // Set a more complete user agent
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Set additional headers
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    });
    
    console.log('Testing direct access to item 16798...');
    const url = 'https://database.turtle-wow.org/?item=16798';
    
    const response = await page.goto(url, { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });
    
    console.log(`Response status: ${response?.status()}`);
    console.log(`Response URL: ${page.url()}`);
    
    // Wait a bit for any JavaScript to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Try to extract item name
    const itemData = await page.evaluate(() => {
      // Check multiple possible selectors
      const selectors = [
        'h1.heading-size-1',
        'h1',
        '.q0, .q1, .q2, .q3, .q4, .q5',
        '[class*="heading"]',
        'title'
      ];
      
      let itemName = null;
      for (const selector of selectors) {
        const elem = document.querySelector(selector);
        if (elem && elem.textContent) {
          itemName = elem.textContent.trim();
          if (itemName && itemName !== 'Items') break;
        }
      }
      
      // Check page title
      const pageTitle = document.title;
      
      // Check if we have any error messages
      const bodyText = document.body.textContent || '';
      const hasError = bodyText.includes('403') || bodyText.includes('Forbidden') || bodyText.includes('Access Denied');
      
      return {
        itemName,
        pageTitle,
        hasError,
        bodySnippet: bodyText.substring(0, 200)
      };
    });
    
    console.log('Item data:', JSON.stringify(itemData, null, 2));
    
    // Save screenshot for debugging
    await page.screenshot({ path: 'item-page-test.png' });
    console.log('Screenshot saved to item-page-test.png');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

testDirectAccess();