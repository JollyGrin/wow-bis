import puppeteer, { Browser, Page } from 'puppeteer';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { ItemExtractor, Item } from './item-extractor';

class FailedItemRetryProcessor {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private logFile = 'turtle_db/logs/retry-processor.log';
  private errorFile = 'turtle_db/logs/retry-errors.log';

  async initialize() {
    this.log('🚀 Initializing browser for retry processing...');
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
    this.log('✅ Browser initialized');
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
    });
    await page.setViewport({ width: 1920, height: 1080 });
    
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

  private logError(message: string, error?: any) {
    const timestamp = new Date().toISOString();
    const errorMessage = `[${timestamp}] ERROR: ${message}`;
    console.error(errorMessage, error || '');
    
    try {
      let fullError = `${errorMessage}\n`;
      if (error) {
        if (error.message) fullError += `Message: ${error.message}\n`;
        if (error.stack) fullError += `Stack: ${error.stack}\n`;
        fullError += `Full Error: ${JSON.stringify(error, null, 2)}\n`;
      }
      fullError += '---\n';
      writeFileSync(this.errorFile, fullError, { flag: 'a' });
    } catch (e) {
      console.error('Failed to write to error file:', e);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async retryFailedItem(itemId: number, maxRetries = 5): Promise<Item | null> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        this.log(`🔄 Retry attempt ${attempt + 1}/${maxRetries} for item ${itemId}`);
        
        // Longer delay between attempts for failed items
        if (attempt > 0) {
          const waitTime = Math.min(10000 + (attempt * 5000), 30000);
          this.log(`⏳ Waiting ${waitTime/1000} seconds before retry...`);
          await this.delay(waitTime);
        }

        const item = await ItemExtractor.extractItemDetails(this.page!, itemId);
        if (item) {
          this.log(`✅ Successfully recovered item ${itemId}: ${item.name}`);
          return item;
        }
      } catch (error) {
        this.logError(`Retry attempt ${attempt + 1} failed for item ${itemId}`, error);
        
        // Restart browser on repeated failures
        if (attempt === 2) {
          this.log(`🔄 Restarting browser after repeated failures for item ${itemId}...`);
          await this.cleanup();
          await this.initialize();
        }
      }
    }
    
    this.logError(`❌ Item ${itemId} failed after ${maxRetries} retry attempts`);
    return null;
  }

  private loadExistingItems(): { weapons: Item[], armor: Item[] } {
    const weapons = existsSync('turtle_db/processed-weapons.json') 
      ? JSON.parse(readFileSync('turtle_db/processed-weapons.json', 'utf-8'))
      : [];
    const armor = existsSync('turtle_db/processed-armor.json')
      ? JSON.parse(readFileSync('turtle_db/processed-armor.json', 'utf-8'))
      : [];
    
    return { weapons, armor };
  }

  private saveRecoveredItems(category: 'weapons' | 'armor', items: Item[]) {
    const filename = `turtle_db/recovered-${category}.json`;
    try {
      writeFileSync(filename, JSON.stringify(items, null, 2));
      this.log(`💾 Saved ${items.length} recovered ${category} items to ${filename}`);
    } catch (e) {
      this.logError(`Failed to save recovered ${category} items`, e);
    }
  }

  private determineItemCategory(itemId: number): 'weapons' | 'armor' | 'unknown' {
    // Load IDs from subcategories to determine category
    const weaponSubcategories = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21'];
    const armorSubcategories = ['22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33'];
    
    for (const subcat of weaponSubcategories) {
      const filename = `turtle_db/items-${subcat}.json`;
      if (existsSync(filename)) {
        const ids: number[] = JSON.parse(readFileSync(filename, 'utf-8'));
        if (ids.includes(itemId)) return 'weapons';
      }
    }
    
    for (const subcat of armorSubcategories) {
      const filename = `turtle_db/items-${subcat}.json`;
      if (existsSync(filename)) {
        const ids: number[] = JSON.parse(readFileSync(filename, 'utf-8'));
        if (ids.includes(itemId)) return 'armor';
      }
    }
    
    return 'unknown';
  }

  async processFailedItems(): Promise<void> {
    if (!existsSync('turtle_db/failed-items.json')) {
      this.log('❌ No failed-items.json found');
      return;
    }

    const failedIds: number[] = JSON.parse(readFileSync('turtle_db/failed-items.json', 'utf-8'));
    this.log(`🎯 Found ${failedIds.length} failed items to retry`);

    const recoveredWeapons: Item[] = [];
    const recoveredArmor: Item[] = [];
    const recoveredUnknown: Item[] = [];
    const stillFailed: number[] = [];

    let processedCount = 0;
    for (const itemId of failedIds) {
      processedCount++;
      this.log(`\n🔍 Processing failed item ${itemId} (${processedCount}/${failedIds.length})`);
      
      // Restart browser every 50 items to prevent memory issues
      if (processedCount % 50 === 0) {
        await this.cleanup();
        await this.initialize();
      }

      const recoveredItem = await this.retryFailedItem(itemId);
      
      if (recoveredItem) {
        // Categorize and add to appropriate recovery list
        const category = this.determineItemCategory(itemId);
        if (category === 'weapons') {
          recoveredWeapons.push(recoveredItem);
        } else if (category === 'armor') {
          recoveredArmor.push(recoveredItem);
        } else {
          recoveredUnknown.push(recoveredItem);
          this.log(`⚠️ Unknown category for item ${itemId}`);
        }

        // Save progress periodically
        if (processedCount % 10 === 0) {
          this.saveRecoveredItems('weapons', recoveredWeapons);
          this.saveRecoveredItems('armor', recoveredArmor);
          if (recoveredUnknown.length > 0) {
            writeFileSync('turtle_db/recovered-unknown.json', JSON.stringify(recoveredUnknown, null, 2));
          }
        }
      } else {
        stillFailed.push(itemId);
      }

      // Rate limiting
      await this.delay(3000);
    }

    // Final save of all recovered items
    this.saveRecoveredItems('weapons', recoveredWeapons);
    this.saveRecoveredItems('armor', recoveredArmor);
    if (recoveredUnknown.length > 0) {
      writeFileSync('turtle_db/recovered-unknown.json', JSON.stringify(recoveredUnknown, null, 2));
      this.log(`💾 Saved ${recoveredUnknown.length} unknown category items to recovered-unknown.json`);
    }

    // Update failed items list
    writeFileSync('turtle_db/failed-items.json', JSON.stringify(stillFailed, null, 2));
    
    const totalRecovered = recoveredWeapons.length + recoveredArmor.length + recoveredUnknown.length;
    
    // Save recovery summary
    const summary = {
      total_attempted: failedIds.length,
      successfully_recovered: totalRecovered,
      still_failed: stillFailed.length,
      recovery_rate: `${((totalRecovered / failedIds.length) * 100).toFixed(1)}%`,
      recovered_by_category: {
        weapons: recoveredWeapons.length,
        armor: recoveredArmor.length,
        unknown: recoveredUnknown.length
      },
      processed_at: new Date().toISOString()
    };
    
    writeFileSync('turtle_db/retry-summary.json', JSON.stringify(summary, null, 2));

    this.log('\n🎉 Retry processing complete!');
    this.log(`📊 Recovery Summary:`);
    this.log(`   Total attempted: ${summary.total_attempted}`);
    this.log(`   Successfully recovered: ${summary.successfully_recovered}`);
    this.log(`   - Weapons: ${recoveredWeapons.length}`);
    this.log(`   - Armor: ${recoveredArmor.length}`);
    this.log(`   - Unknown: ${recoveredUnknown.length}`);
    this.log(`   Still failed: ${summary.still_failed}`);
    this.log(`   Recovery rate: ${summary.recovery_rate}`);
    this.log(`\n📁 Recovered items saved to:`);
    this.log(`   turtle_db/recovered-weapons.json`);
    this.log(`   turtle_db/recovered-armor.json`);
    if (recoveredUnknown.length > 0) {
      this.log(`   turtle_db/recovered-unknown.json`);
    }
  }
}

async function main() {
  const processor = new FailedItemRetryProcessor();
  
  try {
    await processor.initialize();
    await processor.processFailedItems();
  } catch (error) {
    console.error('💥 Retry processing failed:', error);
  } finally {
    await processor.cleanup();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { FailedItemRetryProcessor };