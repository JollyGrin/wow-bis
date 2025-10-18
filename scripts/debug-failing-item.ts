import puppeteer from 'puppeteer';
import { ItemExtractor } from './item-extractor';

async function debugFailingItem() {
  console.log('🔍 Debugging failing item extraction...');
  
  const browser = await puppeteer.launch({
    headless: false, // Show browser to see what's happening
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
  await page.setViewport({ width: 1920, height: 1080 });
  
  // Test with one of the failing items
  const failingItemId = 2878;
  
  try {
    console.log(`🔍 Testing item ${failingItemId}...`);
    const result = await ItemExtractor.extractItemDetails(page, failingItemId);
    
    if (result) {
      console.log('✅ Successfully extracted item:', result.name);
      console.log('📊 Quality:', result.quality);
      console.log('🏷️ Class:', result.class);
      console.log('🎯 Slot:', result.slot);
    } else {
      console.log('❌ Failed to extract item - returned null');
    }
  } catch (error) {
    console.error('💥 Error during extraction:', error);
    
    // Check if we got blocked
    const currentUrl = page.url();
    const title = await page.title();
    console.log('📍 Current URL:', currentUrl);
    console.log('📄 Page title:', title);
    
    // Check for Cloudflare or blocking indicators
    const bodyText = await page.evaluate(() => document.body.textContent || '');
    if (bodyText.includes('Cloudflare') || bodyText.includes('blocked') || bodyText.includes('403')) {
      console.log('🛡️ Detected blocking/Cloudflare protection');
    }
  }
  
  console.log('⏳ Waiting for manual inspection...');
  await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
  
  await browser.close();
}

debugFailingItem().catch(console.error);