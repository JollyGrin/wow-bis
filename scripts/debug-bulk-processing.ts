import puppeteer from 'puppeteer';
import { ItemExtractor } from './item-extractor';

async function debugBulkProcessing() {
  console.log('🔍 Debugging bulk processing issues...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=VizDisplayCompositor',
      '--disable-web-security',
      '--disable-dev-shm-usage',
    ],
  });
  
  const page = await browser.newPage();
  
  // Apply same stealth setup
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  );
  await page.setExtraHTTPHeaders({
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    Connection: 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
  });

  await page.setViewport({ width: 1920, height: 1080 });

  // Remove automation indicators
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5],
    });
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en'],
    });
    window.chrome = { runtime: {} };
  });
  
  // Test the failing items in sequence like the bulk processor would
  const testItems = [2815, 2878, 6692]; // Including working and failing items
  
  for (let i = 0; i < testItems.length; i++) {
    const itemId = testItems[i];
    console.log(`\n🔍 Testing item ${itemId} (${i + 1}/${testItems.length})...`);
    
    try {
      const startTime = Date.now();
      const result = await ItemExtractor.extractItemDetails(page, itemId);
      const duration = Date.now() - startTime;
      
      if (result) {
        console.log(`✅ Success in ${duration}ms: ${result.name} (${result.quality})`);
      } else {
        console.log(`❌ Failed: ItemExtractor returned null`);
        
        // Check what page we ended up on
        const currentUrl = page.url();
        const title = await page.title();
        console.log(`📍 Current URL: ${currentUrl}`);
        console.log(`📄 Page title: ${title}`);
        
        // Check page content for clues
        const bodyText = await page.evaluate(() => {
          const body = document.body.textContent || '';
          return body.substring(0, 300);
        });
        console.log(`📄 Page content sample: ${bodyText}`);
      }
    } catch (error) {
      console.error(`💥 Exception: ${error.message}`);
      console.error(`📍 Current URL: ${page.url()}`);
    }
    
    // Add delay like the bulk processor
    console.log('⏳ Waiting 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  await browser.close();
  console.log('✅ Debug complete');
}

debugBulkProcessing().catch(console.error);