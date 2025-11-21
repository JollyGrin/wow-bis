import puppeteer, { Browser, Page } from 'puppeteer';

class QuestVsItemTest {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private baseUrl = 'https://database.turtle-wow.org';

  async initialize() {
    console.log('🚀 Testing quest vs item pages...');
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

  private async checkCloudflare(): Promise<boolean> {
    return await this.page!.evaluate(() => {
      return (
        document.body.textContent?.includes('Verifying you are human') ||
        document.body.textContent?.includes('security check') ||
        document.title.includes('Just a moment') ||
        document.title.includes('Please wait')
      );
    });
  }

  async testPages() {
    const testQuestId = 1; // Simple quest ID
    const testItemId = 9684; // Item ID we've been testing
    
    console.log('\n🔍 Test 1: Quest page...');
    try {
      await this.page!.goto(`${this.baseUrl}/?quest=${testQuestId}`, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      await this.delay(3000);
      
      const isCloudflareQuest = await this.checkCloudflare();
      const titleQuest = await this.page!.title();
      
      if (isCloudflareQuest) {
        console.log(`❌ QUEST PAGE: Cloudflare detected for quest ${testQuestId}`);
      } else {
        console.log(`✅ QUEST PAGE: Success for quest ${testQuestId}`);
        console.log(`   Title: ${titleQuest}`);
      }
    } catch (error) {
      console.log(`💥 QUEST PAGE: Error - ${error}`);
    }
    
    console.log('\n🔍 Test 2: Item page...');
    try {
      await this.page!.goto(`${this.baseUrl}/?item=${testItemId}`, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      await this.delay(3000);
      
      const isCloudflareItem = await this.checkCloudflare();
      const titleItem = await this.page!.title();
      
      if (isCloudflareItem) {
        console.log(`❌ ITEM PAGE: Cloudflare detected for item ${testItemId}`);
      } else {
        console.log(`✅ ITEM PAGE: Success for item ${testItemId}`);
        console.log(`   Title: ${titleItem}`);
      }
    } catch (error) {
      console.log(`💥 ITEM PAGE: Error - ${error}`);
    }

    console.log('\n🔍 Test 3: Fresh page quest access...');
    try {
      await this.page!.close();
      this.page = await this.browser!.newPage();
      await this.setupStealth(this.page);
      
      await this.page!.goto(`${this.baseUrl}/?quest=${testQuestId}`, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      await this.delay(3000);
      
      const isCloudflareQuest2 = await this.checkCloudflare();
      
      if (isCloudflareQuest2) {
        console.log(`❌ FRESH QUEST PAGE: Cloudflare detected for quest ${testQuestId}`);
      } else {
        console.log(`✅ FRESH QUEST PAGE: Success for quest ${testQuestId}`);
      }
    } catch (error) {
      console.log(`💥 FRESH QUEST PAGE: Error - ${error}`);
    }

    console.log('\n🔍 Test 4: Fresh page item access...');
    try {
      await this.page!.close();
      this.page = await this.browser!.newPage();
      await this.setupStealth(this.page);
      
      await this.page!.goto(`${this.baseUrl}/?item=${testItemId}`, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      await this.delay(3000);
      
      const isCloudflareItem2 = await this.checkCloudflare();
      
      if (isCloudflareItem2) {
        console.log(`❌ FRESH ITEM PAGE: Cloudflare detected for item ${testItemId}`);
      } else {
        console.log(`✅ FRESH ITEM PAGE: Success for item ${testItemId}`);
      }
    } catch (error) {
      console.log(`💥 FRESH ITEM PAGE: Error - ${error}`);
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
  const test = new QuestVsItemTest();
  
  try {
    await test.initialize();
    await test.testPages();
  } catch (error) {
    console.error('💥 Test failed:', error);
  } finally {
    await test.cleanup();
  }
}

if (require.main === module) {
  main().catch(console.error);
}