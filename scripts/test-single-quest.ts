import puppeteer, { Browser, Page } from 'puppeteer';

class QuestTest {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private baseUrl = 'https://database.turtle-wow.org';

  async initialize() {
    console.log('🚀 Initializing browser with anti-detection...');
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

  private async setupStealth(page: any) {
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

  async testMultipleQuests() {
    const questIds = [1, 2, 3, 4, 5];
    
    for (let i = 0; i < questIds.length; i++) {
      const questId = questIds[i];
      console.log(`\n🎯 Testing quest ${questId} (${i + 1}/${questIds.length})...`);
      
      try {
        const url = `${this.baseUrl}/?quest=${questId}`;
        
        await this.page!.goto(url, { 
          waitUntil: 'networkidle2', 
          timeout: 30000 
        });
        
        await this.delay(3000);

        const title = await this.page!.title();
        if (title.includes('Just a moment') || title.includes('Please wait')) {
          console.log(`❌ Cloudflare protection detected for quest ${questId}`);
          
          try {
            await this.page!.waitForFunction(() => {
              return !document.title.includes('Just a moment') && 
                     !document.title.includes('Please wait') &&
                     document.title.includes('database.turtle-wow.org');
            }, { timeout: 30000 });
            
            await this.delay(5000);
            console.log(`✅ Cloudflare resolved for quest ${questId}`);
          } catch (e) {
            console.log(`❌ Cloudflare timeout for quest ${questId}`);
            continue;
          }
        } else {
          console.log(`✅ Quest ${questId} loaded successfully - ${title}`);
        }
        
        await this.delay(2000); // Quest script rate limiting
        
      } catch (error) {
        console.log(`💥 Error with quest ${questId}: ${error}`);
      }
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
  const test = new QuestTest();
  
  try {
    await test.initialize();
    await test.testMultipleQuests();
  } catch (error) {
    console.error('💥 Test failed:', error);
  } finally {
    await test.cleanup();
  }
}

if (require.main === module) {
  main().catch(console.error);
}