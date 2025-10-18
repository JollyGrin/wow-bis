import puppeteer from 'puppeteer';
import { ItemExtractor, Item } from './item-extractor';
import { writeFileSync } from 'fs';

async function testProcessorSaving() {
  console.log('🧪 Testing processor saving logic...');
  
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
  
  const testItems = [811, 1454, 2815]; // Some working weapon IDs
  const processedItems: Item[] = [];
  
  for (let i = 0; i < testItems.length; i++) {
    const itemId = testItems[i];
    console.log(`\n🔍 Processing item ${itemId} (${i + 1}/${testItems.length})`);
    
    try {
      const item = await ItemExtractor.extractItemDetails(page, itemId);
      if (item) {
        processedItems.push(item);
        console.log(`✅ Successfully processed: ${item.name} (Level ${item.itemLevel}, ${item.sellPrice} copper)`);
        
        // Simulate saving like the processor does
        const filename = 'turtle_db/test-processed-items.json';
        writeFileSync(filename, JSON.stringify(processedItems, null, 2));
        console.log(`💾 Saved ${processedItems.length} items to ${filename}`);
      } else {
        console.log(`❌ Failed to process item ${itemId}`);
      }
    } catch (error) {
      console.error(`💥 Error processing item ${itemId}:`, error.message);
    }
    
    // Add delay
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log(`\n📊 Final summary:`);
  console.log(`   ✅ Successfully processed: ${processedItems.length}`);
  console.log(`   📄 Saved to: turtle_db/test-processed-items.json`);
  
  await browser.close();
}

testProcessorSaving().catch(console.error);