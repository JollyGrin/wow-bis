import puppeteer from 'puppeteer';
import { ItemExtractor } from './item-extractor';

async function testSellPrice() {
  console.log('🧪 Testing sell price extraction...');
  
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
  
  // Apply stealth setup
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
  
  // Test with Sulfuras which should have a high sell price
  const itemId = 17182;
  console.log(`🔍 Testing item ${itemId} (Sulfuras)...`);
  
  const result = await ItemExtractor.extractItemDetails(page, itemId);
  
  if (result) {
    console.log(`✅ Item: ${result.name}`);
    console.log(`💰 Sell Price: ${result.sellPrice} copper`);
    console.log(`📊 Item Level: ${result.itemLevel}`);
    
    // Convert copper to gold/silver/copper for readability
    if (result.sellPrice > 0) {
      const gold = Math.floor(result.sellPrice / 10000);
      const silver = Math.floor((result.sellPrice % 10000) / 100);
      const copper = result.sellPrice % 100;
      console.log(`💰 Formatted: ${gold}g ${silver}s ${copper}c`);
    } else {
      console.log('❌ No sell price found');
    }
  } else {
    console.log('❌ Failed to extract item');
  }
  
  await browser.close();
}

testSellPrice().catch(console.error);