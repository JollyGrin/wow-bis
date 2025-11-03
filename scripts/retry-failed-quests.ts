import puppeteer, { Browser, Page } from 'puppeteer';
import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'fs';

interface QuestProcessingProgress {
  processed_quests: number;
  failed_quests: number;
  last_processed_quest: number;
  completed_files: string[];
  failed_quest_ids: number[];
  start_time: string;
  last_updated: string;
}

class FailedQuestRetryProcessor {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private baseUrl = 'https://database.turtle-wow.org';
  private progressFile = 'turtle_db/quest-processing-progress.json';
  private logFile = 'turtle_db/logs/quest-retry.log';
  private errorFile = 'turtle_db/logs/quest-retry-errors.log';
  private questCache: Map<number, number> = new Map();

  constructor() {
    ['turtle_db', 'turtle_db/logs'].forEach(dir => {
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    });
  }

  async initialize() {
    this.log('🚀 Initializing browser for quest retry...');
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

  private loadProgress(): QuestProcessingProgress {
    if (existsSync(this.progressFile)) {
      try {
        return JSON.parse(readFileSync(this.progressFile, 'utf-8'));
      } catch (e) {
        throw new Error('Failed to load progress file');
      }
    }
    throw new Error('Progress file not found');
  }

  private saveProgress(progress: QuestProcessingProgress) {
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

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async fetchQuestRequiredLevel(questId: number, retryCount = 0): Promise<number | null> {
    if (this.questCache.has(questId)) {
      return this.questCache.get(questId)!;
    }

    try {
      const url = `${this.baseUrl}/?quest=${questId}`;
      
      await this.page!.goto(url, { 
        waitUntil: 'networkidle2', 
        timeout: 30000 
      });
      
      await this.delay(3000);

      const title = await this.page!.title();
      if (title.includes('Just a moment') || title.includes('Please wait')) {
        this.log(`⏳ Cloudflare protection detected for quest ${questId}, waiting...`);
        
        try {
          await this.page!.waitForFunction(() => {
            return !document.title.includes('Just a moment') && 
                   !document.title.includes('Please wait') &&
                   document.title.includes('database.turtle-wow.org');
          }, { timeout: 30000 });
          
          await this.delay(5000);
        } catch (e) {
          this.log(`❌ Cloudflare timeout for quest ${questId}`);
          return null;
        }
      }

      const requiredLevel = await this.page!.evaluate(() => {
        const bodyText = document.body.textContent || '';
        
        const patterns = [
          /requires?\\s+level\\s*:?\\s*(\\d+)/i,
          /level\\s+requirement\\s*:?\\s*(\\d+)/i,
          /min\\s*level\\s*:?\\s*(\\d+)/i,
          /minimum\\s+level\\s*:?\\s*(\\d+)/i
        ];

        for (const pattern of patterns) {
          const match = bodyText.match(pattern);
          if (match && match[1]) {
            return parseInt(match[1]);
          }
        }

        const infobox = document.querySelector('table.infobox');
        if (infobox) {
          const infoboxText = infobox.textContent || '';
          const levelMatch = infoboxText.match(/(?:requires?\\s+)?level\\s*:?\\s*(\\d+)/i);
          if (levelMatch && levelMatch[1]) {
            return parseInt(levelMatch[1]);
          }
        }

        const cells = Array.from(document.querySelectorAll('td, li, div'));
        for (const cell of cells) {
          const cellText = cell.textContent || '';
          if (cellText.toLowerCase().includes('level') && cellText.match(/\\d+/)) {
            const levelMatch = cellText.match(/(?:requires?\\s+)?level\\s*:?\\s*(\\d+)/i);
            if (levelMatch && levelMatch[1]) {
              return parseInt(levelMatch[1]);
            }
          }
        }

        return null;
      });

      if (requiredLevel !== null) {
        this.questCache.set(questId, requiredLevel);
        this.log(`✅ Quest ${questId}: Required level ${requiredLevel}`);
        return requiredLevel;
      } else {
        this.log(`⚠️ Quest ${questId}: No required level found`);
        return null;
      }

    } catch (error) {
      this.logError(`Error fetching quest ${questId} (attempt ${retryCount + 1})`, error);
      
      if (retryCount < 3) {
        const waitTime = Math.min(5000 + (retryCount * 2000), 15000);
        this.log(`🔄 Retrying quest ${questId} in ${waitTime/1000} seconds...`);
        await this.delay(waitTime);
        return this.fetchQuestRequiredLevel(questId, retryCount + 1);
      }
      
      return null;
    }
  }

  async retryFailedQuests() {
    this.log('\\n🔄 Starting Failed Quest Retry Process\\n');
    
    const progress = this.loadProgress();
    const failedQuestIds = [...progress.failed_quest_ids];
    
    this.log(`📊 Found ${failedQuestIds.length} failed quests to retry`);
    
    if (failedQuestIds.length === 0) {
      this.log('✅ No failed quests to retry!');
      return;
    }

    const newlySuccessful: number[] = [];
    const stillFailed: number[] = [];
    
    for (let i = 0; i < failedQuestIds.length; i++) {
      const questId = failedQuestIds[i];
      
      this.log(`\\n🎯 Retrying quest ${questId} (${i + 1}/${failedQuestIds.length})`);
      
      if (i > 0 && i % 50 === 0) {
        await this.restartBrowser();
      }
      
      const requiredLevel = await this.fetchQuestRequiredLevel(questId);
      
      if (requiredLevel !== null) {
        newlySuccessful.push(questId);
        progress.processed_quests++;
        progress.failed_quests--;
        this.log(`✅ Successfully fetched quest ${questId}: level ${requiredLevel}`);
      } else {
        stillFailed.push(questId);
        this.log(`❌ Quest ${questId} still failed`);
      }
      
      await this.delay(2000);
      
      if (i % 10 === 0) {
        progress.failed_quest_ids = stillFailed.concat(failedQuestIds.slice(i + 1));
        this.saveProgress(progress);
      }
    }
    
    progress.failed_quest_ids = stillFailed;
    this.saveProgress(progress);
    
    this.log('\\n🎉 Retry process complete!');
    this.log(`📊 Results:`);
    this.log(`   Successfully retried: ${newlySuccessful.length}`);
    this.log(`   Still failed: ${stillFailed.length}`);
    this.log(`   Total processed quests: ${progress.processed_quests}`);
    this.log(`   Total failed quests: ${progress.failed_quests}`);
    
    if (newlySuccessful.length > 0) {
      writeFileSync('turtle_db/newly-successful-quests.json', JSON.stringify(newlySuccessful, null, 2));
      this.log(`💾 Saved ${newlySuccessful.length} newly successful quest IDs`);
    }
    
    if (stillFailed.length > 0) {
      writeFileSync('turtle_db/still-failed-quest-ids.json', JSON.stringify(stillFailed, null, 2));
      this.log(`💾 Saved ${stillFailed.length} still failed quest IDs`);
    }
  }
}

async function main() {
  const processor = new FailedQuestRetryProcessor();
  
  try {
    await processor.initialize();
    await processor.retryFailedQuests();
  } catch (error) {
    console.error('💥 Retry process failed:', error);
  } finally {
    await processor.cleanup();
  }
}

if (require.main === module) {
  main().catch(console.error);
}