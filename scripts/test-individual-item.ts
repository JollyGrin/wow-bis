import puppeteer, { Browser, Page } from 'puppeteer';

class IndividualItemTest {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private baseUrl = 'https://database.turtle-wow.org';

  async initialize() {
    console.log('🚀 Initializing browser with exact same settings as working script...');
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
    console.log('✅ Browser initialized with stealth mode');
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

  async testItemAccess() {
    // Test 1: Access listing page first (should work)
    console.log('\n📄 Test 1: Accessing listing page...');
    await this.page!.goto(`${this.baseUrl}/?items=2.0`, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await this.delay(3000);
    
    const title1 = await this.page!.title();
    console.log(`✅ Listing page title: ${title1}`);
    
    // Test 2: Access individual item page immediately after
    console.log('\n🎯 Test 2: Accessing individual item page...');
    const testItemId = 9684; // First item from logs
    
    await this.page!.goto(`${this.baseUrl}/?item=${testItemId}`, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await this.delay(3000);
    
    // Check for Cloudflare
    const isCloudflare = await this.page!.evaluate(() => {
      return (
        document.body.textContent?.includes('Verifying you are human') ||
        document.body.textContent?.includes('security check') ||
        document.title.includes('Just a moment') ||
        document.title.includes('Please wait')
      );
    });

    if (isCloudflare) {
      console.log('❌ CLOUDFLARE DETECTED on individual item page');
    } else {
      console.log('✅ Individual item page accessed successfully');
      const title2 = await this.page!.title();
      console.log(`📝 Item page title: ${title2}`);
    }
    
    // Test 3: Try fresh page approach like working script
    console.log('\n🔄 Test 3: Fresh page + individual item...');
    await this.page!.close();
    this.page = await this.browser!.newPage();
    await this.setupStealth(this.page);
    
    await this.page!.goto(`${this.baseUrl}/?item=${testItemId}`, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await this.delay(3000);
    
    const isCloudflare2 = await this.page!.evaluate(() => {
      return (
        document.body.textContent?.includes('Verifying you are human') ||
        document.body.textContent?.includes('security check') ||
        document.title.includes('Just a moment') ||
        document.title.includes('Please wait')
      );
    });

    if (isCloudflare2) {
      console.log('❌ CLOUDFLARE DETECTED on fresh page individual item');
    } else {
      console.log('✅ Fresh page individual item access successful');
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
  const test = new IndividualItemTest();
  
  try {
    await test.initialize();
    await test.testItemAccess();
  } catch (error) {
    console.error('💥 Test failed:', error);
  } finally {
    await test.cleanup();
  }
}

if (require.main === module) {
  main().catch(console.error);
}