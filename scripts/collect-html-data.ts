import puppeteer, { Browser, Page } from 'puppeteer';
import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'fs';

interface SubcategoryHtmlProgress {
  processed_count: number;
  failed_count: number;
  last_processed_id: number;
  complete: boolean;
  total_items: number;
}

interface HtmlCollectionProgress {
  subcategories: { [subcategoryId: string]: SubcategoryHtmlProgress };
  start_time: string;
  last_updated: string;
  failed_items: number[];
}

const CATEGORY_CONFIG = {
  // Weapons (2.0 - 2.20)
  "2.0": { name: "1h-axes", type: "weapons" },
  "2.1": { name: "2h-axes", type: "weapons" },
  "2.2": { name: "bows", type: "weapons" },
  "2.3": { name: "guns", type: "weapons" },
  "2.4": { name: "1h-maces", type: "weapons" },
  "2.5": { name: "2h-maces", type: "weapons" },
  "2.6": { name: "polearms", type: "weapons" },
  "2.7": { name: "1h-swords", type: "weapons" },
  "2.8": { name: "2h-swords", type: "weapons" },
  "2.10": { name: "staves", type: "weapons" },
  "2.13": { name: "fist", type: "weapons" },
  "2.14": { name: "miscellaneous", type: "weapons" },
  "2.15": { name: "daggers", type: "weapons" },
  "2.16": { name: "thrown", type: "weapons" },
  "2.17": { name: "spears", type: "weapons" },
  "2.18": { name: "crossbows", type: "weapons" },
  "2.19": { name: "wands", type: "weapons" },
  "2.20": { name: "fishing-poles", type: "weapons" },

  // Armor - Accessories
  "4.0.2": { name: "amulets", type: "armor" },
  "4.0.11": { name: "rings", type: "armor" },
  "4.0.12": { name: "trinkets", type: "armor" },
  "4.1.16": { name: "cloaks", type: "armor" },
  "4.6.14": { name: "shields", type: "armor" },

  // Cloth Armor (4.1.x) - skipping 4.1.2 and 4.1.4 as noted in docs
  "4.1.1": { name: "cloth-head", type: "armor" },
  "4.1.3": { name: "cloth-shoulder", type: "armor" },
  "4.1.5": { name: "cloth-chest", type: "armor" },
  "4.1.6": { name: "cloth-waist", type: "armor" },
  "4.1.7": { name: "cloth-legs", type: "armor" },
  "4.1.8": { name: "cloth-feet", type: "armor" },
  "4.1.9": { name: "cloth-wrist", type: "armor" },
  "4.1.10": { name: "cloth-hands", type: "armor" },

  // Leather Armor (4.2.x) - following same pattern, skipping .2 and .4
  "4.2.1": { name: "leather-head", type: "armor" },
  "4.2.3": { name: "leather-shoulder", type: "armor" },
  "4.2.5": { name: "leather-chest", type: "armor" },
  "4.2.6": { name: "leather-waist", type: "armor" },
  "4.2.7": { name: "leather-legs", type: "armor" },
  "4.2.8": { name: "leather-feet", type: "armor" },
  "4.2.9": { name: "leather-wrist", type: "armor" },
  "4.2.10": { name: "leather-hands", type: "armor" },

  // Mail Armor (4.3.x) - following same pattern
  "4.3.1": { name: "mail-head", type: "armor" },
  "4.3.3": { name: "mail-shoulder", type: "armor" },
  "4.3.5": { name: "mail-chest", type: "armor" },
  "4.3.6": { name: "mail-waist", type: "armor" },
  "4.3.7": { name: "mail-legs", type: "armor" },
  "4.3.8": { name: "mail-feet", type: "armor" },
  "4.3.9": { name: "mail-wrist", type: "armor" },
  "4.3.10": { name: "mail-hands", type: "armor" },

  // Plate Armor (4.4.x) - following same pattern
  "4.4.1": { name: "plate-head", type: "armor" },
  "4.4.3": { name: "plate-shoulder", type: "armor" },
  "4.4.5": { name: "plate-chest", type: "armor" },
  "4.4.6": { name: "plate-waist", type: "armor" },
  "4.4.7": { name: "plate-legs", type: "armor" },
  "4.4.8": { name: "plate-feet", type: "armor" },
  "4.4.9": { name: "plate-wrist", type: "armor" },
  "4.4.10": { name: "plate-hands", type: "armor" },
} as const;

class HtmlCollector {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private baseUrl = 'https://database.turtle-wow.org';
  private progressFile = 'turtle_db/html-collection-progress.json';
  private logFile = 'turtle_db/logs/html-collector.log';
  private errorFile = 'turtle_db/logs/html-collection-errors.log';

  constructor() {
    const dirs = [
      'turtle_db', 
      'turtle_db/logs', 
      'turtle_db/raw-html',
      'turtle_db/raw-html/weapons',
      'turtle_db/raw-html/armor'
    ];
    
    dirs.forEach(dir => {
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
      'Sec-Fetch-User': '?1',
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

  async createFreshPage() {
    this.log('🔄 Creating fresh page for better stealth...');
    if (this.page) {
      await this.page.close();
    }
    this.page = await this.browser!.newPage();
    await this.setupStealth(this.page);
    
    // Strategy 2: Session warming - visit safe pages first
    await this.warmupSession();
    
    // Extra delay after page creation to avoid rapid requests
    await this.delayWithJitter(3000, 1000);
  }

  async warmupSession() {
    this.log('🔥 Warming up session with safe navigation...');
    try {
      // Visit main site first
      await this.page!.goto(this.baseUrl, { 
        waitUntil: 'networkidle2', 
        timeout: 30000 
      });
      
      await this.delayWithJitter(2000, 300);
      
      // Simulate human behavior - scroll a bit
      await this.page!.evaluate(() => {
        window.scrollTo(0, Math.floor(Math.random() * 300));
      });
      
      await this.delayWithJitter(1500, 200);
      
      this.log('✅ Session warmed up');
    } catch (error) {
      this.log(`⚠️ Session warmup failed: ${error}`);
    }
  }

  async simulateHumanBehavior() {
    try {
      // Random mouse movement and scrolling
      await this.page!.evaluate(() => {
        // Simulate mouse movement
        const event = new MouseEvent('mousemove', {
          clientX: Math.random() * window.innerWidth,
          clientY: Math.random() * window.innerHeight,
        });
        document.dispatchEvent(event);
        
        // Random scroll
        const scrollAmount = Math.floor(Math.random() * 200);
        window.scrollTo(0, scrollAmount);
      });
      
      await this.delayWithJitter(500, 200);
    } catch (error) {
      // Silent fail for human behavior simulation
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

  private loadProgress(): HtmlCollectionProgress {
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

  private saveProgress(progress: HtmlCollectionProgress) {
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

  private loadSubcategoryIds(subcategoryId: string): number[] {
    const filename = `turtle_db/items-${subcategoryId}.json`;
    if (existsSync(filename)) {
      try {
        const ids: number[] = JSON.parse(readFileSync(filename, 'utf-8'));
        this.log(`📁 Loaded ${ids.length} IDs from ${filename}`);
        return ids;
      } catch (e) {
        this.log(`⚠️ Failed to load ${filename}: ${e}`);
      }
    } else {
      this.log(`⚠️ Missing ${filename}`);
    }
    
    return [];
  }

  private getExistingHtmlFiles(subcategoryId: string): Set<number> {
    const config = CATEGORY_CONFIG[subcategoryId as keyof typeof CATEGORY_CONFIG];
    const dir = `turtle_db/raw-html/${config.type}`;
    const existing = new Set<number>();
    
    if (existsSync(dir)) {
      try {
        const files = require('fs').readdirSync(dir);
        files.forEach((file: string) => {
          const match = file.match(/^(\d+)\.html$/);
          if (match && match[1]) {
            existing.add(parseInt(match[1]));
          }
        });
      } catch (e) {
        this.log(`⚠️ Failed to read existing files from ${dir}: ${e}`);
      }
    }
    
    return existing;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private delayWithJitter(baseMs: number, jitterMs: number = 500): Promise<void> {
    const jitter = Math.random() * jitterMs * 2 - jitterMs; // ±jitterMs
    const totalDelay = Math.max(baseMs + jitter, 500); // Minimum 500ms
    return this.delay(totalDelay);
  }

  async collectItemHtml(itemId: number, subcategoryId: string, retryCount = 0, useNewPage = false): Promise<boolean> {
    try {
      // Don't create fresh pages - they trigger Cloudflare
      // Keep using same page instance like working quest script
      
      const url = `${this.baseUrl}/?item=${itemId}`;
      
      await this.page!.goto(url, { 
        waitUntil: 'networkidle2', 
        timeout: 30000 
      });
      
      await this.delay(3000);

      // Check for Cloudflare protection
      const isCloudflare = await this.page!.evaluate(() => {
        return (
          document.body.textContent?.includes('Verifying you are human') ||
          document.body.textContent?.includes('security check') ||
          document.title.includes('Just a moment') ||
          document.title.includes('Please wait')
        );
      });

      if (isCloudflare) {
        this.log(`⏳ Cloudflare protection detected for item ${itemId}, waiting...`);
        await this.delay(10000);

        const stillBlocked = await this.page!.evaluate(() => {
          return document.body.textContent?.includes('Verifying you are human');
        });

        if (stillBlocked) {
          this.log(`❌ Still blocked by Cloudflare for item ${itemId}`);
          return false;
        }
      }

      // Extract main-contents HTML
      const mainContentsHtml = await this.page!.evaluate(() => {
        const mainContents = document.querySelector('#main-contents');
        return mainContents ? mainContents.outerHTML : null;
      });

      if (mainContentsHtml) {
        const config = CATEGORY_CONFIG[subcategoryId as keyof typeof CATEGORY_CONFIG];
        const fileName = `turtle_db/raw-html/${config.type}/${itemId}.html`;
        writeFileSync(fileName, mainContentsHtml);
        return true;
      } else {
        this.log(`⚠️ No main-contents found for item ${itemId}`);
        return false;
      }

    } catch (error) {
      this.logError(`Error collecting item ${itemId} (attempt ${retryCount + 1})`, error);
      
      if (retryCount < 3) {
        const waitTime = Math.min(5000 + (retryCount * 2000), 15000);
        this.log(`🔄 Retrying item ${itemId} in ${waitTime/1000} seconds...`);
        await this.delay(waitTime);
        return this.collectItemHtml(itemId, subcategoryId, retryCount + 1, true);
      }
      
      return false;
    }
  }

  async processSubcategory(subcategoryId: string): Promise<void> {
    const config = CATEGORY_CONFIG[subcategoryId as keyof typeof CATEGORY_CONFIG];
    const progress = this.loadProgress();
    const allIds = this.loadSubcategoryIds(subcategoryId);
    
    if (allIds.length === 0) {
      this.log(`⚠️ No IDs found for ${config.name} (${subcategoryId}), skipping`);
      return;
    }

    // Initialize subcategory progress if not exists
    if (!progress.subcategories[subcategoryId]) {
      progress.subcategories[subcategoryId] = { 
        processed_count: 0, 
        failed_count: 0, 
        last_processed_id: 0, 
        complete: false,
        total_items: allIds.length
      };
    }
    
    this.log(`\n🎯 Processing ${config.name} (${subcategoryId})`);
    this.log(`📊 Total IDs to process: ${allIds.length}`);
    
    // Check existing HTML files
    const existingFiles = this.getExistingHtmlFiles(subcategoryId);
    const remainingIds = allIds.filter(id => 
      !existingFiles.has(id) && !progress.failed_items.includes(id)
    );
    
    this.log(`📦 Already collected: ${existingFiles?.size || 0}`);
    this.log(`⏳ Remaining to process: ${remainingIds.length}`);
    
    if (remainingIds.length === 0) {
      this.log(`✅ All ${config.name} HTML already collected`);
      progress.subcategories[subcategoryId].complete = true;
      progress.subcategories[subcategoryId].processed_count = allIds.length;
      this.saveProgress(progress);
      return;
    }
    
    for (let i = 0; i < remainingIds.length; i++) {
      const itemId = remainingIds[i]!;
      const overallProgress = (existingFiles?.size || 0) + i + 1;
      
      // Restart browser after every item to avoid Cloudflare detection
      if (i > 0) {
        await this.restartBrowser();
      }
      
      this.log(`🔍 Processing ${config.name} item ${itemId} (${overallProgress}/${allIds.length})`);
      
      // Don't use fresh pages - they trigger Cloudflare immediately
      const success = await this.collectItemHtml(itemId, subcategoryId, 0, false);
      if (success) {
        progress.subcategories[subcategoryId]!.processed_count = overallProgress;
        progress.subcategories[subcategoryId]!.last_processed_id = itemId;
        
        this.log(`✅ Collected HTML for item ${itemId}`);
        
        // Save progress after each item
        this.saveProgress(progress);
        
      } else {
        progress.subcategories[subcategoryId]!.failed_count++;
        progress.failed_items.push(itemId);
        this.logError(`Failed to collect HTML for item ${itemId} after 4 attempts`);
        
        // Save progress after failure
        this.saveProgress(progress);
      }
      
      // Match quest script timing
      await this.delay(2000);
    }
    
    progress.subcategories[subcategoryId].complete = true;
    this.saveProgress(progress);
    
    this.log(`✅ ${config.name} HTML collection complete!`);
    this.log(`📊 Successfully processed: ${progress.subcategories[subcategoryId].processed_count}`);
    this.log(`❌ Failed: ${progress.subcategories[subcategoryId].failed_count}`);
  }

  async processAllSubcategories() {
    this.log('\n🚀 Starting HTML Collection\n');
    
    const progress = this.loadProgress();
    const subcategories = Object.keys(CATEGORY_CONFIG);
    
    this.log(`📋 Processing ${subcategories.length} subcategories`);
    
    for (const subcategoryId of subcategories) {
      const config = CATEGORY_CONFIG[subcategoryId as keyof typeof CATEGORY_CONFIG];
      
      if (progress.subcategories[subcategoryId]?.complete) {
        this.log(`✅ ${config.name} (${subcategoryId}) already complete`);
        continue;
      }
      
      try {
        await this.processSubcategory(subcategoryId);
      } catch (error) {
        this.logError(`Failed to process ${config.name} (${subcategoryId})`, error);
      }
      
      // Small delay between subcategories
      await this.delay(3000);
    }
    
    this.log('\n🎉 HTML collection complete!');
    
    // Final summary
    const finalProgress = this.loadProgress();
    const summary = {
      total_subcategories: subcategories.length,
      completed_subcategories: Object.values(finalProgress.subcategories).filter(s => s.complete).length,
      total_items_processed: Object.values(finalProgress.subcategories).reduce((sum, s) => sum + s.processed_count, 0),
      total_failures: finalProgress.failed_items.length,
      collection_date: new Date().toISOString()
    };
    
    this.log(`📊 Final Summary:`);
    this.log(`   Completed subcategories: ${summary.completed_subcategories}/${summary.total_subcategories}`);
    this.log(`   Total items processed: ${summary.total_items_processed}`);
    this.log(`   Total failures: ${summary.total_failures}`);
    
    if (finalProgress.failed_items.length > 0) {
      this.log(`❌ Failed items: ${finalProgress.failed_items.slice(0, 10).join(', ')}${finalProgress.failed_items.length > 10 ? '...' : ''}`);
      writeFileSync('turtle_db/failed-html-collection.json', JSON.stringify(finalProgress.failed_items, null, 2));
    }
    
    writeFileSync('turtle_db/html-collection-summary.json', JSON.stringify(summary, null, 2));
  }
}

async function main() {
  const collector = new HtmlCollector();
  
  try {
    await collector.initialize();
    await collector.processAllSubcategories();
  } catch (error) {
    console.error('💥 HTML collection failed:', error);
  } finally {
    await collector.cleanup();
  }
}

if (require.main === module) {
  main().catch(console.error);
}