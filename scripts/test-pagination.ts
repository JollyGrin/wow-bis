import puppeteer, { Browser, Page } from 'puppeteer';

class PaginationTester {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private baseUrl = 'https://database.turtle-wow.org';

  async initialize() {
    console.log('🚀 Initializing browser with anti-detection...');
    this.browser = await puppeteer.launch({
      headless: false, // Keep visible for debugging
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=VizDisplayCompositor',
        '--disable-web-security',
        '--disable-dev-shm-usage'
      ],
    });
    
    this.page = await this.browser.newPage();
    
    // Set realistic headers
    await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await this.page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none'
    });
    
    await this.page.setViewport({ width: 1920, height: 1080 });
    
    // Remove automation indicators
    await this.page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
      window.chrome = { runtime: {} };
    });
    
    console.log('✅ Browser initialized with stealth mode');
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      console.log('🔒 Browser closed');
    }
  }

  private async extractItemIds(): Promise<number[]> {
    return await this.page!.evaluate(() => {
      const items: number[] = [];
      const links = document.querySelectorAll('a[href*="?item="]');
      
      links.forEach(link => {
        const href = link.getAttribute('href');
        const match = href?.match(/item=(\d+)/);
        if (match) {
          const itemId = parseInt(match[1]);
          if (!items.includes(itemId)) {
            items.push(itemId);
          }
        }
      });
      
      return items.sort((a, b) => a - b);
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async testPaginationMethod(method: 'goto' | 'hash-update' | 'hash-direct' | 'fresh-page', page: number): Promise<number[]> {
    const offset = page * 50;
    let url: string;
    
    if (page === 0) {
      url = `${this.baseUrl}/?items=2`;
    } else {
      url = `${this.baseUrl}/?items=2#${offset}+1`;
    }

    console.log(`\n📄 Testing ${method} for page ${page + 1} (offset: ${offset})`);
    console.log(`🔗 URL: ${url}`);

    try {
      if (method === 'goto' || page === 0) {
        // Normal navigation
        await this.page!.goto(url, { 
          waitUntil: 'networkidle2', 
          timeout: 30000 
        });
      } else if (method === 'hash-update') {
        // Update hash in existing page
        await this.page!.evaluate((newHash) => {
          window.location.hash = newHash;
        }, `${offset}+1`);
        
        // Wait for any AJAX requests to complete
        await this.page!.waitForFunction(() => {
          return !window.fetch || !document.querySelector('.loading, .spinner, [data-loading]');
        }, { timeout: 10000 }).catch(() => {});
        
        await this.delay(5000); // Wait longer for content to load
      } else if (method === 'hash-direct') {
        // Navigate to full URL with hash
        await this.page!.goto(url, { 
          waitUntil: 'networkidle2', 
          timeout: 30000 
        });
      } else if (method === 'fresh-page') {
        // Create a fresh page for each request
        if (page > 0) {
          await this.page!.close();
          this.page = await this.browser!.newPage();
          
          // Re-apply stealth settings
          await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
          await this.page.setExtraHTTPHeaders({
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none'
          });
          await this.page.setViewport({ width: 1920, height: 1080 });
          await this.page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
            Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
            window.chrome = { runtime: {} };
          });
        }
        
        // Navigate to URL with fresh page
        await this.page!.goto(url, { 
          waitUntil: 'networkidle2', 
          timeout: 30000 
        });
      }

      // Check for Cloudflare challenge
      const isCloudflare = await this.page!.evaluate(() => {
        return document.body.textContent?.includes('Verifying you are human') || 
               document.body.textContent?.includes('security check') ||
               document.title.includes('Just a moment');
      });

      if (isCloudflare) {
        console.log('🛡️ Cloudflare challenge detected, waiting...');
        await this.delay(10000); // Wait for challenge to complete
        
        // Check if still on challenge page
        const stillBlocked = await this.page!.evaluate(() => {
          return document.body.textContent?.includes('Verifying you are human');
        });
        
        if (stillBlocked) {
          console.log('❌ Still blocked by Cloudflare');
          return [];
        }
      }

      await this.delay(3000); // Additional wait

      // Debug: Check current URL and page title
      const currentUrl = await this.page!.url();
      const pageTitle = await this.page!.title();
      console.log(`🔍 Current URL: ${currentUrl}`);
      console.log(`📋 Page title: ${pageTitle}`);

      // Debug: Check if there are pagination elements
      const paginationInfo = await this.page!.evaluate(() => {
        const hashLinks = document.querySelectorAll('a[href*="#"]');
        const itemLinks = document.querySelectorAll('a[href*="items"]');
        return {
          hashLinks: hashLinks.length,
          itemLinks: itemLinks.length,
          hasHash: window.location.hash,
          hasLoadingIndicators: !!document.querySelector('.loading, .spinner, [data-loading]'),
          totalLinks: document.querySelectorAll('a').length
        };
      });
      console.log(`🔧 Pagination debug:`, paginationInfo);

      const items = await this.extractItemIds();
      console.log(`📊 Found ${items.length} items`);
      console.log(`🆔 First 5 IDs: ${items.slice(0, 5).join(', ')}`);
      console.log(`🆔 Last 5 IDs: ${items.slice(-5).join(', ')}`);
      
      return items;
    } catch (error) {
      console.error(`❌ Error with ${method}:`, error);
      return [];
    }
  }

  async runPaginationTests() {
    console.log('\n🧪 Starting Pagination Tests\n');
    
    const results: { [key: string]: number[][] } = {};
    const methods: ('goto' | 'hash-update' | 'hash-direct' | 'fresh-page')[] = ['goto', 'hash-update', 'hash-direct', 'fresh-page'];
    
    for (const method of methods) {
      console.log(`\n🔬 Testing method: ${method.toUpperCase()}`);
      results[method] = [];
      
      // Test first 3 pages
      for (let page = 0; page < 3; page++) {
        const items = await this.testPaginationMethod(method, page);
        results[method].push(items);
        
        // Small delay between pages
        await this.delay(1000);
      }
    }

    this.analyzeResults(results);
  }

  private analyzeResults(results: { [key: string]: number[][] }) {
    console.log('\n📈 PAGINATION TEST RESULTS\n');
    
    for (const [method, pages] of Object.entries(results)) {
      console.log(`\n${method.toUpperCase()} Method:`);
      
      let allItemsUnique = true;
      let hasNewItems = true;
      
      for (let i = 0; i < pages.length; i++) {
        const pageItems = pages[i];
        console.log(`  Page ${i + 1}: ${pageItems.length} items`);
        
        if (i > 0 && pages[i-1].length > 0 && pageItems.length > 0) {
          // Check if items are different from previous page
          const previousItems = pages[i-1];
          const commonItems = pageItems.filter(id => previousItems.includes(id));
          const newItems = pageItems.filter(id => !previousItems.includes(id));
          
          console.log(`    Common with prev page: ${commonItems.length}`);
          console.log(`    New items: ${newItems.length}`);
          
          if (newItems.length === 0) {
            hasNewItems = false;
            console.log(`    ❌ No new items found!`);
          } else {
            console.log(`    ✅ Found new items`);
          }
        }
      }
      
      if (hasNewItems && pages.every(p => p.length > 0)) {
        console.log(`  🎉 ${method.toUpperCase()} WORKS! - Found different items on each page`);
      } else {
        console.log(`  ❌ ${method.toUpperCase()} FAILED - Same items or no items found`);
      }
    }

    console.log('\n🏆 RECOMMENDATIONS:');
    const workingMethods = Object.entries(results).filter(([method, pages]) => {
      return pages.length > 1 && pages.every(p => p.length > 0) && 
             pages.slice(1).some((page, i) => 
               page.some(id => !pages[i].includes(id))
             );
    });
    
    if (workingMethods.length > 0) {
      console.log(`✅ Use method: ${workingMethods[0][0].toUpperCase()}`);
    } else {
      console.log('❌ No working pagination method found');
      console.log('💡 Try checking the website manually to verify URL structure');
    }
  }
}

async function main() {
  const tester = new PaginationTester();
  
  try {
    await tester.initialize();
    await tester.runPaginationTests();
  } catch (error) {
    console.error('💥 Test failed:', error);
  } finally {
    await tester.cleanup();
  }
}

if (require.main === module) {
  main().catch(console.error);
}