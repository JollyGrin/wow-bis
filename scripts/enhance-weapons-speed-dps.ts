import puppeteer, { Browser, Page } from 'puppeteer';
import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'fs';
import { Item } from './item-extractor';

interface WeaponEnhancementData {
  speed?: number;
  dps?: number;
}

class WeaponSpeedEnhancer {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private baseUrl = 'https://database.turtle-wow.org';
  private logFile = 'turtle_db/logs/weapon-enhancer.log';

  constructor() {
    // Ensure directories exist
    ['turtle_db', 'turtle_db/logs'].forEach(dir => {
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    });
  }

  async initialize() {
    this.log('🚀 Initializing browser for weapon enhancement...');
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

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async fetchWeaponSpeedAndDPS(itemId: number): Promise<WeaponEnhancementData | null> {
    try {
      const url = `${this.baseUrl}/?item=${itemId}`;
      
      await this.page!.goto(url, { 
        waitUntil: 'networkidle2', 
        timeout: 30000 
      });
      
      await this.delay(3000); // Wait for page to fully load

      // Check for Cloudflare protection
      const title = await this.page!.title();
      if (title.includes('Just a moment') || title.includes('Please wait')) {
        this.log(`⏳ Cloudflare protection detected for item ${itemId}, waiting...`);
        
        try {
          await this.page!.waitForFunction(() => {
            return !document.title.includes('Just a moment') && 
                   !document.title.includes('Please wait') &&
                   document.title.includes('database.turtle-wow.org');
          }, { timeout: 30000 });
          
          await this.delay(5000);
        } catch (e) {
          this.log(`❌ Cloudflare timeout for item ${itemId}`);
          return null;
        }
      }

      // Extract speed and DPS data
      const weaponData = await this.page!.evaluate(() => {
        // Look for the main item tooltip table
        const tooltipDiv = document.querySelector('.tooltip') || document.querySelector('[id*="tooltip"]');
        const allTables = document.querySelectorAll('table');
        const itemTable = tooltipDiv?.querySelector('table') || allTables[1] || allTables[0];
        
        if (!itemTable) return null;
        
        const tableText = itemTable.textContent || '';
        const tableHTML = itemTable.innerHTML || '';
        
        let speed: number | undefined;
        let dps: number | undefined;
        
        // Extract weapon speed - look for "Speed X.XX"
        const speedMatch = tableText.match(/Speed\s+(\d+\.?\d*)/i);
        if (speedMatch) {
          speed = parseFloat(speedMatch[1]);
        }
        
        // Extract DPS - look for "(X.X damage per second)" or similar patterns
        const dpsMatch = tableText.match(/\((\d+\.?\d*)\s+damage\s+per\s+second\)/i);
        if (dpsMatch) {
          dps = parseFloat(dpsMatch[1]);
        }
        
        // If we found at least one of speed or dps, return the data
        if (speed !== undefined || dps !== undefined) {
          return { speed, dps };
        }
        
        return null;
      });

      return weaponData;
    } catch (error) {
      this.log(`❌ Error fetching weapon data for item ${itemId}: ${error}`);
      return null;
    }
  }

  async enhanceWeaponFile(filePath: string): Promise<void> {
    this.log(`📂 Processing weapon file: ${filePath}`);
    
    if (!existsSync(filePath)) {
      this.log(`⚠️ File not found: ${filePath}`);
      return;
    }

    let items: Item[];
    try {
      items = JSON.parse(readFileSync(filePath, 'utf-8'));
    } catch (error) {
      this.log(`❌ Failed to parse ${filePath}: ${error}`);
      return;
    }

    this.log(`📊 Found ${items.length} items in ${filePath}`);
    let enhancedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      // Check if item already has speed and dps
      if (item.speed !== undefined && item.dps !== undefined) {
        skippedCount++;
        continue;
      }

      this.log(`🔍 Enhancing item ${item.itemId}: ${item.name} (${i + 1}/${items.length})`);
      
      const weaponData = await this.fetchWeaponSpeedAndDPS(item.itemId);
      
      if (weaponData) {
        if (weaponData.speed !== undefined) {
          (item as any).speed = weaponData.speed;
        }
        if (weaponData.dps !== undefined) {
          (item as any).dps = weaponData.dps;
        }
        
        enhancedCount++;
        this.log(`✅ Enhanced ${item.name} - Speed: ${weaponData.speed}, DPS: ${weaponData.dps}`);
        
        // Save progress after each item
        try {
          writeFileSync(filePath, JSON.stringify(items, null, 2));
          this.log(`💾 Saved progress to ${filePath}`);
        } catch (error) {
          this.log(`❌ Failed to save ${filePath}: ${error}`);
        }
      } else {
        this.log(`⚠️ Could not enhance ${item.name} - no speed/DPS data found`);
      }
      
      // Rate limiting
      await this.delay(2000);
    }

    this.log(`📊 Enhancement complete for ${filePath}`);
    this.log(`   Enhanced: ${enhancedCount} items`);
    this.log(`   Skipped: ${skippedCount} items`);
  }

  async enhanceAllWeaponFiles(): Promise<void> {
    this.log('🚀 Starting weapon enhancement process...');
    
    const weaponFiles = [
      'turtle_db/items/weapons/1h-axes.json',
      'turtle_db/items/weapons/1h-maces.json',
      'turtle_db/items/weapons/1h-swords.json',
      'turtle_db/items/weapons/2h-axes.json',
      'turtle_db/items/weapons/2h-maces.json',
      'turtle_db/items/weapons/2h-swords.json',
      'turtle_db/items/weapons/bows.json',
      'turtle_db/items/weapons/crossbows.json',
      'turtle_db/items/weapons/daggers.json',
      'turtle_db/items/weapons/fist.json',
      'turtle_db/items/weapons/guns.json',
      'turtle_db/items/weapons/polearms.json',
      'turtle_db/items/weapons/staves.json',
      'turtle_db/items/weapons/thrown.json',
      'turtle_db/items/weapons/unknown.json'
    ];

    for (const filePath of weaponFiles) {
      if (existsSync(filePath)) {
        await this.enhanceWeaponFile(filePath);
        
        // Restart browser every few files to prevent memory issues
        if (weaponFiles.indexOf(filePath) % 5 === 4) {
          this.log('🔄 Restarting browser for fresh session...');
          await this.cleanup();
          await this.initialize();
        }
      } else {
        this.log(`⚠️ Weapon file not found: ${filePath}`);
      }
    }

    this.log('🎉 All weapon files enhancement complete!');
  }
}

async function main() {
  const enhancer = new WeaponSpeedEnhancer();
  
  try {
    await enhancer.initialize();
    await enhancer.enhanceAllWeaponFiles();
  } catch (error) {
    console.error('💥 Enhancement failed:', error);
  } finally {
    await enhancer.cleanup();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { WeaponSpeedEnhancer };