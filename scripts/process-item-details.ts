import puppeteer, { Browser, Page } from 'puppeteer';
import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'fs';
import { CATEGORY_CONFIG, CategoryId } from './constants';
import { ItemExtractor, Item } from './item-extractor';

interface SubcategoryProcessingProgress {
  processed_count: number;
  failed_count: number;
  last_processed_id: number;
  complete: boolean;
}

interface ProcessingProgress {
  subcategories: { [subcategoryId: string]: SubcategoryProcessingProgress };
  start_time: string;
  last_updated: string;
  failed_items: number[];
}


class ItemDetailProcessor {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private baseUrl = 'https://database.turtle-wow.org';
  private progressFile = 'turtle_db/processing-progress.json';
  private logFile = 'turtle_db/logs/item-processor.log';
  private errorFile = 'turtle_db/logs/processing-errors.log';

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
        '--disable-dev-shm-usage',
      ],
    });
    
    this.page = await this.browser.newPage();
    await this.setupStealth(this.page);
    this.log('✅ Browser initialized with stealth mode');
  }

  private async setupStealth(page: any) {
    // Set realistic headers
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    );
    await page.setExtraHTTPHeaders({
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
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
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.log('🔒 Browser closed');
    }
  }

  async restartBrowser() {
    this.log('🔄 Restarting browser for fresh session...');
    await this.cleanup();
    await this.initialize();
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

  private logError(message: string, error?: any) {
    const timestamp = new Date().toISOString();
    const errorMessage = `[${timestamp}] ERROR: ${message}`;
    console.error(errorMessage, error || '');
    
    try {
      let fullError = `${errorMessage}\n`;
      if (error) {
        if (error.message) fullError += `Message: ${error.message}\n`;
        if (error.stack) fullError += `Stack: ${error.stack}\n`;
        if (error.toString && error.toString() !== '[object Object]') {
          fullError += `Error String: ${error.toString()}\n`;
        }
        fullError += `Full Error: ${JSON.stringify(error, null, 2)}\n`;
      }
      fullError += '---\n';
      writeFileSync(this.errorFile, fullError, { flag: 'a' });
    } catch (e) {
      console.error('Failed to write to error file:', e);
    }
  }

  private loadProgress(): ProcessingProgress {
    if (existsSync(this.progressFile)) {
      try {
        return JSON.parse(readFileSync(this.progressFile, 'utf-8'));
      } catch (e) {
        this.log('⚠️ Failed to load progress, starting fresh');
      }
    }
    
    return {
      subcategories: {},
      start_time: new Date().toISOString(),
      last_updated: new Date().toISOString(),
      failed_items: []
    };
  }

  private saveProgress(progress: ProcessingProgress) {
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

  private loadIds(category: 'weapons' | 'armor'): number[] {
    const allIds: number[] = [];
    
    // Get all subcategories for this category type
    const subcategories = Object.entries(CATEGORY_CONFIG)
      .filter(([_, config]) => config.type === category)
      .map(([subcategoryId, _]) => subcategoryId);
    
    this.log(`📁 Loading IDs from ${subcategories.length} ${category} subcategories`);
    
    for (const subcategoryId of subcategories) {
      const filename = `turtle_db/items-${subcategoryId}.json`;
      if (existsSync(filename)) {
        try {
          const subcategoryIds: number[] = JSON.parse(readFileSync(filename, 'utf-8'));
          allIds.push(...subcategoryIds);
          this.log(`  ✅ Loaded ${subcategoryIds.length} IDs from ${subcategoryId}`);
        } catch (e) {
          this.log(`  ⚠️ Failed to load ${filename}: ${e}`);
        }
      } else {
        this.log(`  ⚠️ Missing ${filename}`);
      }
    }
    
    if (allIds.length === 0) {
      throw new Error(`No ${category} IDs found. Run extract-item-ids.ts first.`);
    }
    
    // Remove duplicates
    const uniqueIds = [...new Set(allIds)];
    this.log(`📊 Total unique ${category} IDs: ${uniqueIds.length}`);
    
    return uniqueIds;
  }

  private loadExistingItems(category: 'weapons' | 'armor'): Item[] {
    const filename = `turtle_db/processed-${category}.json`;
    if (existsSync(filename)) {
      try {
        const items = JSON.parse(readFileSync(filename, 'utf-8'));
        this.log(`📦 Loaded ${items.length} existing ${category} items`);
        return items;
      } catch (e) {
        this.log(`⚠️ Failed to load existing ${category} items from ${filename}`);
      }
    }
    return [];
  }

  private saveItems(category: 'weapons' | 'armor', items: Item[]) {
    const filename = `turtle_db/processed-${category}.json`;
    try {
      const tempFile = filename + '.tmp';
      writeFileSync(tempFile, JSON.stringify(items, null, 2));
      writeFileSync(filename, readFileSync(tempFile));
      require('fs').unlinkSync(tempFile);
      this.log(`💾 Saved ${items.length} ${category} items to ${filename}`);
    } catch (e) {
      this.logError(`Failed to save ${category} items`, e);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }


  async scrapeItemDetails(itemId: number, retryCount = 0): Promise<Item | null> {
    try {
      return await ItemExtractor.extractItemDetails(this.page!, itemId);
    } catch (error) {
      this.logError(`Error scraping item ${itemId} (attempt ${retryCount + 1})`, error);
      
      if (retryCount < 3) { // Increased retry attempts
        const waitTime = Math.min(5000 + (retryCount * 2000), 15000); // Progressive backoff
        this.log(`🔄 Retrying item ${itemId} in ${waitTime/1000} seconds...`);
        await this.delay(waitTime);
        return this.scrapeItemDetails(itemId, retryCount + 1);
      }
      
      return null;
    }
  }

  async processCategoryItems(category: 'weapons' | 'armor'): Promise<void> {
    const ids = this.loadIds(category);
    const progress = this.loadProgress();
    const existingItems = this.loadExistingItems(category);
    
    // Initialize category progress if not exists
    if (!progress.subcategories[category]) {
      progress.subcategories[category] = { 
        processed_count: 0, 
        failed_count: 0, 
        last_processed_id: 0, 
        complete: false 
      };
    }
    
    this.log(`\n🎯 Processing ${category} items`);
    this.log(`📊 Total IDs to process: ${ids.length}`);
    this.log(`📦 Already processed: ${existingItems.length}`);
    
    // Filter out already processed items
    const processedIds = existingItems.map(item => item.itemId);
    const remainingIds = ids.filter(id => !processedIds.includes(id) && !progress.failed_items.includes(id));
    
    this.log(`⏳ Remaining to process: ${remainingIds.length}`);
    
    if (remainingIds.length === 0) {
      this.log(`✅ All ${category} items already processed`);
      progress.subcategories[category].complete = true;
      this.saveProgress(progress);
      return;
    }
    
    let items = [...existingItems];
    
    for (let i = 0; i < remainingIds.length; i++) {
      const itemId = remainingIds[i];
      const overallProgress = i + 1;
      const totalProgress = existingItems.length + overallProgress;
      
      // Restart browser every 100 items to prevent memory issues
      if (overallProgress % 100 === 0) {
        await this.restartBrowser();
      }
      
      this.log(`🔍 Processing ${category} ${itemId} (${totalProgress}/${ids.length})`);
      
      const item = await this.scrapeItemDetails(itemId);
      if (item) {
        items.push(item);
        progress.subcategories[category].processed_count = totalProgress;
        progress.subcategories[category].last_processed_id = itemId;
        
        this.log(`✅ Processed: ${item.name}`);
        
        // Save progress after every item
        // Save progress every 10 items instead of every item for better performance
        if (overallProgress % 10 === 0 || overallProgress === remainingIds.length) {
          this.saveProgress(progress);
          this.saveItems(category, items);
        }
        
      } else {
        progress.subcategories[category].failed_count++;
        progress.failed_items.push(itemId);
        this.logError(`Failed to process ${category} item ${itemId} after 4 attempts`);
        
        // Continue processing but save progress
        if (overallProgress % 10 === 0) {
          this.saveProgress(progress);
        }
      }
      
      // Rate limiting with stealth protection
      await this.delay(2000);
    }
    
    progress.subcategories[category].complete = true;
    this.saveProgress(progress);
    this.saveItems(category, items); // Final save
    
    this.log(`✅ ${category} processing complete!`);
    this.log(`📊 Successfully processed: ${items.length}`);
    this.log(`❌ Failed: ${progress.subcategories[category].failed_count}`);
  }

  async processAllItems() {
    this.log('\n🚀 Starting Item Detail Processing\n');
    
    const progress = this.loadProgress();
    
    // Process weapons if not complete
    if (!progress.subcategories.weapons?.complete) {
      await this.processCategoryItems('weapons');
    } else {
      this.log(`✅ Weapons already complete`);
    }
    
    // Process armor if not complete
    if (!progress.subcategories.armor?.complete) {
      await this.processCategoryItems('armor');
    } else {
      this.log(`✅ Armor already complete`);
    }
    
    this.log('\n🎉 Item processing complete!');
    
    // Final summary
    const finalProgress = this.loadProgress();
    this.log(`📊 Final Summary:`);
    this.log(`   Weapons processed: ${finalProgress.subcategories.weapons?.processed_count || 0}`);
    this.log(`   Armor processed: ${finalProgress.subcategories.armor?.processed_count || 0}`);
    this.log(`   Total failed: ${finalProgress.failed_items.length}`);
    
    if (finalProgress.failed_items.length > 0) {
      this.log(`❌ Failed items: ${finalProgress.failed_items.slice(0, 10).join(', ')}${finalProgress.failed_items.length > 10 ? '...' : ''}`);
      writeFileSync('turtle_db/failed-items.json', JSON.stringify(finalProgress.failed_items, null, 2));
    }
  }
}

async function main() {
  const processor = new ItemDetailProcessor();
  
  try {
    await processor.initialize();
    await processor.processAllItems();
  } catch (error) {
    console.error('💥 Processing failed:', error);
  } finally {
    await processor.cleanup();
  }
}

if (require.main === module) {
  main().catch(console.error);
}