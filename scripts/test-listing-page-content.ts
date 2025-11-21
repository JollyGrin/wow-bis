import puppeteer, { Browser, Page } from 'puppeteer';
import { writeFileSync } from 'fs';

class ListingPageTest {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private baseUrl = 'https://database.turtle-wow.org';

  async initialize() {
    console.log('🚀 Testing what info is available on listing pages...');
    this.browser = await puppeteer.launch({
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

    this.page = await this.browser.newPage();
    await this.setupStealth(this.page);
    console.log('✅ Browser initialized');
  }

  private async setupStealth(page: Page) {
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
      (window as any).chrome = { runtime: {} };
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async testListingPage() {
    console.log('\n📄 Accessing listing page for 1h-axes (2.0)...');
    
    await this.page!.goto(`${this.baseUrl}/?items=2.0`, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await this.delay(3000);
    
    const title = await this.page!.title();
    console.log(`✅ Page title: ${title}`);
    
    // Check what's in main-contents
    const mainContentsHtml = await this.page!.evaluate(() => {
      const mainContents = document.querySelector('#main-contents');
      return mainContents ? mainContents.outerHTML : null;
    });
    
    if (mainContentsHtml) {
      // Save a sample to inspect
      writeFileSync('turtle_db/sample-listing-page.html', mainContentsHtml);
      console.log('📝 Saved listing page HTML sample');
      
      // Check what item info is available on the page
      const itemInfo = await this.page!.evaluate(() => {
        const items: any[] = [];
        
        // Look for item links and extract info
        const itemLinks = document.querySelectorAll('a[href*="?item="]');
        itemLinks.forEach((link, index) => {
          if (index < 5) { // Just first 5 for testing
            const href = link.getAttribute('href');
            const itemIdMatch = href?.match(/item=(\d+)/);
            const itemId = itemIdMatch ? parseInt(itemIdMatch[1]) : null;
            
            // Get text content and any visible info
            const text = link.textContent?.trim();
            const parent = link.parentElement;
            const row = link.closest('tr');
            
            items.push({
              itemId,
              linkText: text,
              parentText: parent?.textContent?.trim(),
              rowText: row?.textContent?.trim(),
              href
            });
          }
        });
        
        return {
          totalItemLinks: itemLinks.length,
          sampleItems: items,
          pageStructure: {
            hasTables: document.querySelectorAll('table').length,
            hasRows: document.querySelectorAll('tr').length,
            mainContentLength: document.querySelector('#main-contents')?.textContent?.length || 0
          }
        };
      });
      
      console.log('\n📊 Item info found on listing page:');
      console.log(`   Total item links: ${itemInfo.totalItemLinks}`);
      console.log(`   Tables: ${itemInfo.pageStructure.hasTables}`);
      console.log(`   Rows: ${itemInfo.pageStructure.hasRows}`);
      console.log(`   Content length: ${itemInfo.pageStructure.mainContentLength} chars`);
      
      console.log('\n🔍 Sample items:');
      itemInfo.sampleItems.forEach((item, i) => {
        console.log(`   ${i + 1}. ID: ${item.itemId} - ${item.linkText}`);
        if (item.rowText && item.rowText.length < 200) {
          console.log(`      Row: ${item.rowText}`);
        }
      });
      
      return true;
    } else {
      console.log('❌ No main-contents found');
      return false;
    }
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      console.log('🔒 Browser closed');
    }
  }
}

async function main() {
  const test = new ListingPageTest();
  
  try {
    await test.initialize();
    await test.testListingPage();
  } catch (error) {
    console.error('💥 Test failed:', error);
  } finally {
    await test.cleanup();
  }
}

if (require.main === module) {
  main().catch(console.error);
}