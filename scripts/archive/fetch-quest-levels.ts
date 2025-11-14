import puppeteer, { Browser, Page } from 'puppeteer';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

interface Quest {
  questId: number;
  name: string;
  faction: string;
  minLevel?: number;
}

interface ItemSource {
  category: string;
  quests?: Quest[];
  name?: string;
  zone?: number;
  dropChance?: number;
}

interface Item {
  itemId: number;
  name: string;
  source?: ItemSource;
  [key: string]: any; // Other item properties
}

interface QuestLevelProgress {
  processed_quests: number[];
  failed_quests: number[];
  quest_levels: Record<number, number>; // questId -> minLevel
  total_quests: number;
  start_time: string;
  last_quest_id: number;
}

class QuestLevelFetcher {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private baseUrl = 'https://database.turtle-wow.org';
  private progressFile = 'turtle_db/quest-progress.json';
  private outputFile = 'turtle_db/quest-levels.json';
  private logFile = 'turtle_db/logs/quest-fetcher.log';

  async initialize() {
    // Create directories
    if (!existsSync('turtle_db/logs')) {
      mkdirSync('turtle_db/logs', { recursive: true });
    }

    this.log('Initializing Puppeteer for quest fetching...');
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-web-security'
      ],
    });
    
    this.page = await this.browser.newPage();
    
    // Use same headers as main scraper
    await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await this.page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    });
    
    await this.page.setViewport({ width: 1920, height: 1080 });
    this.log('Quest fetcher initialized');
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.log('Browser closed');
    }
  }

  private log(message: string) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    
    try {
      writeFileSync(this.logFile, logMessage + '\\n', { flag: 'a' });
    } catch (e) {
      console.error('Failed to write to log file:', e);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private loadItems(): Item[] {
    const itemsPath = join(process.cwd(), 'turtle_db', 'all-items.json');
    
    if (!existsSync(itemsPath)) {
      this.log('No merged items file found, checking individual files...');
      
      // Try to load from individual files
      const weapons = this.loadItemsFromFile('weapons.json');
      const armor = this.loadItemsFromFile('armor.json');
      
      return [...weapons, ...armor];
    }

    try {
      const data = JSON.parse(readFileSync(itemsPath, 'utf-8'));
      this.log(`Loaded ${data.length} items from all-items.json`);
      return data;
    } catch (error) {
      this.log(`Failed to load items: ${error}`);
      return [];
    }
  }

  private loadItemsFromFile(filename: string): Item[] {
    const filepath = join(process.cwd(), 'turtle_db', filename);
    
    if (!existsSync(filepath)) {
      return [];
    }

    try {
      const data = JSON.parse(readFileSync(filepath, 'utf-8'));
      this.log(`Loaded ${data.length} items from ${filename}`);
      return data;
    } catch (error) {
      this.log(`Failed to load ${filename}: ${error}`);
      return [];
    }
  }

  private extractUniqueQuests(items: Item[]): Quest[] {
    const questMap = new Map<number, Quest>();

    items.forEach(item => {
      if (item.source?.category === 'Quest' && item.source.quests) {
        item.source.quests.forEach(quest => {
          if (!questMap.has(quest.questId)) {
            questMap.set(quest.questId, {
              questId: quest.questId,
              name: quest.name,
              faction: quest.faction
            });
          }
        });
      }
    });

    const quests = Array.from(questMap.values());
    this.log(`Found ${quests.length} unique quests in item sources`);
    return quests;
  }

  private loadProgress(): QuestLevelProgress {
    if (existsSync(this.progressFile)) {
      try {
        return JSON.parse(readFileSync(this.progressFile, 'utf-8'));
      } catch (e) {
        this.log('Failed to load progress, starting fresh');
      }
    }
    
    return {
      processed_quests: [],
      failed_quests: [],
      quest_levels: {},
      total_quests: 0,
      start_time: new Date().toISOString(),
      last_quest_id: 0
    };
  }

  private saveProgress(progress: QuestLevelProgress) {
    try {
      writeFileSync(this.progressFile, JSON.stringify(progress, null, 2));
    } catch (e) {
      this.log(`Failed to save progress: ${e}`);
    }
  }

  private saveQuestLevels(questLevels: Record<number, number>) {
    try {
      writeFileSync(this.outputFile, JSON.stringify(questLevels, null, 2));
      this.log(`Saved quest levels to ${this.outputFile}`);
    } catch (e) {
      this.log(`Failed to save quest levels: ${e}`);
    }
  }

  async fetchQuestMinLevel(questId: number, retryCount = 0): Promise<number | null> {
    try {
      const url = `${this.baseUrl}/?quest=${questId}`;
      
      await this.page!.goto(url, { 
        waitUntil: 'networkidle2', 
        timeout: 30000 
      });
      await this.delay(1500);

      const questData = await this.page!.evaluate(() => {
        // Look for the quest info table or section
        const infoBoxes = document.querySelectorAll('.infobox, table');
        
        for (const box of infoBoxes) {
          const text = box.textContent || '';
          
          // Look for "Requires Level" or "Required level"
          const levelMatch = text.match(/(?:Requires?\\s+Level|Required\\s+level)\\s*:?\\s*(\\d+)/i);
          if (levelMatch) {
            return {
              minLevel: parseInt(levelMatch[1]),
              found: true
            };
          }
          
          // Sometimes it's just listed as "Level: X"
          const simpleLevelMatch = text.match(/^\\s*Level\\s*:?\\s*(\\d+)/im);
          if (simpleLevelMatch) {
            return {
              minLevel: parseInt(simpleLevelMatch[1]),
              found: true
            };
          }
        }
        
        // Check page title or heading for quest name to ensure we're on the right page
        const heading = document.querySelector('h1');
        const title = document.title;
        
        return {
          minLevel: null,
          found: false,
          heading: heading?.textContent || '',
          title: title || '',
          pageText: document.body.textContent?.substring(0, 500) || ''
        };
      });

      if (questData.found && questData.minLevel !== null) {
        this.log(`Quest ${questId}: Found min level ${questData.minLevel}`);
        return questData.minLevel;
      } else {
        this.log(`Quest ${questId}: No min level found`);
        this.log(`Page heading: ${questData.heading}`);
        return null;
      }
    } catch (error) {
      this.log(`Error fetching quest ${questId} (attempt ${retryCount + 1}): ${error}`);
      
      if (retryCount < 2) {
        this.log(`Retrying quest ${questId} in 3 seconds...`);
        await this.delay(3000);
        return this.fetchQuestMinLevel(questId, retryCount + 1);
      }
      
      return null;
    }
  }

  async run() {
    try {
      await this.initialize();
      
      // Load items and extract quests
      const items = this.loadItems();
      if (items.length === 0) {
        this.log('No items found. Run the scraper first.');
        return;
      }

      const quests = this.extractUniqueQuests(items);
      if (quests.length === 0) {
        this.log('No quest items found in the dataset.');
        return;
      }

      // Load progress
      let progress = this.loadProgress();
      progress.total_quests = quests.length;
      
      this.log(`Starting quest level fetching for ${quests.length} quests`);
      this.log(`Already processed: ${progress.processed_quests.length}`);
      this.log(`Failed: ${progress.failed_quests.length}`);

      // Process each quest
      for (const quest of quests) {
        if (progress.processed_quests.includes(quest.questId)) {
          continue; // Skip already processed
        }

        this.log(`Fetching quest ${quest.questId}: ${quest.name} (${quest.faction})`);
        
        const minLevel = await this.fetchQuestMinLevel(quest.questId);
        if (minLevel !== null) {
          progress.quest_levels[quest.questId] = minLevel;
          progress.processed_quests.push(quest.questId);
        } else {
          progress.failed_quests.push(quest.questId);
        }
        
        progress.last_quest_id = quest.questId;
        
        // Save progress after each quest
        this.saveProgress(progress);
        this.saveQuestLevels(progress.quest_levels);
        
        // Rate limiting
        await this.delay(1500);
      }

      // Final summary
      this.log('\\n=== QUEST LEVEL FETCHING COMPLETE ===');
      this.log(`Total quests: ${progress.total_quests}`);
      this.log(`Successfully processed: ${progress.processed_quests.length}`);
      this.log(`Failed: ${progress.failed_quests.length}`);
      this.log(`Quest levels found: ${Object.keys(progress.quest_levels).length}`);
      
      if (progress.failed_quests.length > 0) {
        this.log(`Failed quest IDs: ${progress.failed_quests.join(', ')}`);
        writeFileSync('turtle_db/failed-quests.json', JSON.stringify(progress.failed_quests, null, 2));
      }

      // Generate summary report
      const report = this.generateQuestReport(progress, quests);
      writeFileSync('turtle_db/quest-report.md', report);
      this.log('Quest report saved to quest-report.md');

    } catch (error) {
      this.log(`Fatal quest fetcher error: ${error}`);
    } finally {
      await this.cleanup();
    }
  }

  private generateQuestReport(progress: QuestLevelProgress, allQuests: Quest[]): string {
    const successfulQuests = allQuests.filter(q => progress.quest_levels[q.questId] !== undefined);
    const failedQuests = allQuests.filter(q => progress.failed_quests.includes(q.questId));

    // Analyze level distribution
    const levels = Object.values(progress.quest_levels);
    const levelStats = {
      min: Math.min(...levels),
      max: Math.max(...levels),
      avg: Math.round(levels.reduce((a, b) => a + b, 0) / levels.length),
      distribution: {} as Record<string, number>
    };

    // Group by level ranges
    levels.forEach(level => {
      const range = level < 10 ? '1-9' : 
                   level < 20 ? '10-19' :
                   level < 30 ? '20-29' :
                   level < 40 ? '30-39' :
                   level < 50 ? '40-49' :
                   level < 60 ? '50-59' : '60';
      levelStats.distribution[range] = (levelStats.distribution[range] || 0) + 1;
    });

    return `
# Quest Level Fetching Report
Generated: ${new Date().toISOString()}

## Summary
- **Total Quests Found**: ${allQuests.length}
- **Successfully Processed**: ${successfulQuests.length}
- **Failed to Process**: ${failedQuests.length}
- **Success Rate**: ${Math.round((successfulQuests.length / allQuests.length) * 100)}%

## Level Statistics
- **Minimum Level**: ${levelStats.min}
- **Maximum Level**: ${levelStats.max}
- **Average Level**: ${levelStats.avg}

### Level Range Distribution
${Object.entries(levelStats.distribution)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([range, count]) => `- **Level ${range}**: ${count} quests`)
  .join('\\n')}

## Failed Quests
${failedQuests.length === 0 ? 'No quest failures ✅' : 
  failedQuests.map(q => `- Quest ${q.questId}: ${q.name} (${q.faction})`).join('\\n')}

## Next Steps
1. Update item sources with quest minimum levels
2. Recalculate effective required levels for quest items
3. Validate that quest items no longer have requiredLevel: 0

## Sample Quest Levels
${successfulQuests.slice(0, 10).map(q => 
  `- **${q.name}** (${q.questId}): Level ${progress.quest_levels[q.questId]} (${q.faction})`
).join('\\n')}
${successfulQuests.length > 10 ? `... and ${successfulQuests.length - 10} more` : ''}
    `;
  }
}

// Run the quest level fetcher
const fetcher = new QuestLevelFetcher();
fetcher.run().catch(console.error);