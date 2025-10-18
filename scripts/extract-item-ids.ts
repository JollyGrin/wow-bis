import puppeteer, { Browser, Page } from 'puppeteer';
import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'fs';

interface IdExtractionProgress {
  weapons: {
    current_page: number;
    complete: boolean;
    total_ids: number;
  };
  armor: {
    current_page: number;
    complete: boolean;
    total_ids: number;
  };
  start_time: string;
  last_updated: string;
}

class ItemIdExtractor {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private baseUrl = 'https://database.turtle-wow.org';
  private progressFile = 'turtle_db/id-extraction-progress.json';
  private logFile = 'turtle_db/logs/id-extractor.log';

  constructor() {
    // Ensure directories exist
    ['turtle_db', 'turtle_db/logs'].forEach(dir => {
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    });
  }

  async initialize() {
    this.log('🚀 Initializing browser with anti-detection...');
    this.browser = await puppeteer.launch({
      headless: true,
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
    await this.setupStealth(this.page);
    this.log('✅ Browser initialized with stealth mode');
  }

  private async setupStealth(page: any) {
    // Set realistic headers
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none'
    });
    
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Remove automation indicators
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
      window.chrome = { runtime: {} };
    });
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.log('🔒 Browser closed');
    }
  }

  private log(message: string) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    
    try {
      writeFileSync(this.logFile, logMessage + '\n', { flag: 'a' });
    } catch (e) {
      console.error('Failed to write to log file:', e);
    }
  }

  private loadProgress(): IdExtractionProgress {
    if (existsSync(this.progressFile)) {
      try {
        return JSON.parse(readFileSync(this.progressFile, 'utf-8'));
      } catch (e) {
        this.log('⚠️ Failed to load progress, starting fresh');
      }
    }
    
    return {
      weapons: { current_page: 0, complete: false, total_ids: 0 },
      armor: { current_page: 0, complete: false, total_ids: 0 },
      start_time: new Date().toISOString(),
      last_updated: new Date().toISOString()
    };
  }

  private saveProgress(progress: IdExtractionProgress) {
    progress.last_updated = new Date().toISOString();
    try {
      const tempFile = this.progressFile + '.tmp';
      writeFileSync(tempFile, JSON.stringify(progress, null, 2));
      writeFileSync(this.progressFile, readFileSync(tempFile));
      require('fs').unlinkSync(tempFile);
    } catch (e) {
      this.log(`❌ Failed to save progress: ${e}`);
    }
  }

  private async loadExistingIds(category: 'weapons' | 'armor'): Promise<number[]> {
    const filename = `turtle_db/${category}-ids.json`;
    if (existsSync(filename)) {
      try {
        return JSON.parse(readFileSync(filename, 'utf-8'));
      } catch (e) {
        this.log(`⚠️ Failed to load existing ${category} IDs`);
      }
    }
    return [];
  }

  private saveIds(category: 'weapons' | 'armor', ids: number[]) {
    const filename = `turtle_db/${category}-ids.json`;
    try {
      const tempFile = filename + '.tmp';
      writeFileSync(tempFile, JSON.stringify(ids, null, 2));
      writeFileSync(filename, readFileSync(tempFile));
      require('fs').unlinkSync(tempFile);
      this.log(`💾 Saved ${ids.length} ${category} IDs to ${filename}`);
    } catch (e) {
      this.log(`❌ Failed to save ${category} IDs: ${e}`);
    }
  }

  private async extractItemIdsFromPage(): Promise<number[]> {
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

  private async navigateToPage(categoryId: number, page: number): Promise<boolean> {
    const offset = page * 50;
    
    try {
      // Use fresh page method for all pages (discovered this works best)
      if (page > 0) {
        // Close current page and create fresh one
        await this.page!.close();
        this.page = await this.browser!.newPage();
        await this.setupStealth(this.page);
      }
      
      const url = page === 0 
        ? `${this.baseUrl}/?items=${categoryId}`
        : `${this.baseUrl}/?items=${categoryId}#${offset}+1`;
      
      this.log(`📄 Loading page ${page + 1} with fresh browser context: ${url}`);
      
      await this.page!.goto(url, { 
        waitUntil: 'networkidle2', 
        timeout: 30000 
      });
      
      // Check for Cloudflare challenge
      const isCloudflare = await this.page!.evaluate(() => {
        return document.body.textContent?.includes('Verifying you are human') || 
               document.body.textContent?.includes('security check') ||
               document.title.includes('Just a moment');
      });

      if (isCloudflare) {
        this.log('🛡️ Cloudflare challenge detected, waiting...');
        await this.delay(10000);
        
        const stillBlocked = await this.page!.evaluate(() => {
          return document.body.textContent?.includes('Verifying you are human');
        });
        
        if (stillBlocked) {
          this.log('❌ Still blocked by Cloudflare');
          return false;
        }
      }
      
      await this.delay(3000); // Additional wait for content
      return true;
    } catch (error) {
      this.log(`❌ Navigation failed for page ${page + 1}: ${error}`);
      return false;
    }
  }

  async extractCategoryIds(category: 'weapons' | 'armor'): Promise<number[]> {
    const categoryId = category === 'weapons' ? 2 : 4;
    const progress = this.loadProgress();
    const existingIds = await this.loadExistingIds(category);
    
    this.log(`\n🎯 Starting ${category} ID extraction`);
    this.log(`📊 Already have ${existingIds.length} ${category} IDs`);
    this.log(`📖 Resuming from page ${progress[category].current_page + 1}`);
    
    let allIds = [...existingIds];
    let currentPage = progress[category].current_page;
    let hasMore = true;
    let consecutiveEmptyPages = 0;
    
    while (hasMore && consecutiveEmptyPages < 3) {
      const success = await this.navigateToPage(categoryId, currentPage);
      if (!success) {
        this.log(`⚠️ Failed to navigate to page ${currentPage + 1}, trying next page`);
        currentPage++;
        consecutiveEmptyPages++;
        continue;
      }
      
      const pageIds = await this.extractItemIdsFromPage();
      
      if (pageIds.length === 0) {
        consecutiveEmptyPages++;
        this.log(`📄 Page ${currentPage + 1}: No items found (${consecutiveEmptyPages}/3 empty)`);
      } else {
        consecutiveEmptyPages = 0;
        const newIds = pageIds.filter(id => !allIds.includes(id));
        allIds.push(...newIds);
        
        this.log(`📄 Page ${currentPage + 1}: Found ${pageIds.length} items (${newIds.length} new)`);
        this.log(`🆔 Sample IDs: ${pageIds.slice(0, 5).join(', ')}`);
        this.log(`📊 Total unique ${category}: ${allIds.length}`);
        
        // Save progress after each page
        progress[category].current_page = currentPage;
        progress[category].total_ids = allIds.length;
        this.saveProgress(progress);
        this.saveIds(category, allIds);
        
        // Stop if we found less than 50 items (last page)
        if (pageIds.length < 50) {
          this.log(`🏁 Last page detected (${pageIds.length} < 50 items)`);
          hasMore = false;
        }
      }
      
      currentPage++;
      await this.delay(1500); // Rate limiting
    }
    
    if (consecutiveEmptyPages >= 3) {
      this.log(`🛑 Stopping after ${consecutiveEmptyPages} consecutive empty pages`);
    }
    
    // Mark as complete
    progress[category].complete = true;
    progress[category].total_ids = allIds.length;
    this.saveProgress(progress);
    this.saveIds(category, allIds);
    
    this.log(`✅ ${category} extraction complete: ${allIds.length} total IDs`);
    return allIds;
  }

  async extractAllIds() {
    this.log('\n🚀 Starting Item ID Extraction\n');
    
    const progress = this.loadProgress();
    
    // Extract weapons if not complete
    if (!progress.weapons.complete) {
      await this.extractCategoryIds('weapons');
    } else {
      this.log(`✅ Weapons already complete: ${progress.weapons.total_ids} IDs`);
    }
    
    // Extract armor if not complete
    if (!progress.armor.complete) {
      await this.extractCategoryIds('armor');
    } else {
      this.log(`✅ Armor already complete: ${progress.armor.total_ids} IDs`);
    }
    
    this.log('\n🎉 ID extraction complete!');
    this.log(`📊 Final counts:`);
    this.log(`   Weapons: ${progress.weapons.total_ids} IDs`);
    this.log(`   Armor: ${progress.armor.total_ids} IDs`);
    this.log(`   Total: ${progress.weapons.total_ids + progress.armor.total_ids} IDs`);
  }
}

async function main() {
  const extractor = new ItemIdExtractor();
  
  try {
    await extractor.initialize();
    await extractor.extractAllIds();
  } catch (error) {
    console.error('💥 Extraction failed:', error);
  } finally {
    await extractor.cleanup();
  }
}

if (require.main === module) {
  main().catch(console.error);
}