import puppeteer, { Browser, Page } from 'puppeteer';
import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'fs';

interface TooltipLine {
  label: string;
  format?: string;
}

interface Quest {
  questId: number;
  name: string;
  faction: string;
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
  icon: string;
  class: string;
  subclass: string;
  sellPrice: number;
  quality: string;
  itemLevel: number;
  requiredLevel: number;
  slot: string;
  tooltip: TooltipLine[];
  itemLink: string;
  contentPhase: number;
  source?: ItemSource;
  uniqueName: string;
}

interface ProcessingProgress {
  weapons: {
    processed_count: number;
    failed_count: number;
    last_processed_id: number;
    complete: boolean;
  };
  armor: {
    processed_count: number;
    failed_count: number;
    last_processed_id: number;
    complete: boolean;
  };
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
    this.log('🚀 Initializing browser...');
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    this.page = await this.browser.newPage();
    await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    await this.page.setViewport({ width: 1920, height: 1080 });
    this.log('✅ Browser initialized');
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
      const fullError = error ? `${errorMessage}\n${JSON.stringify(error, null, 2)}\n` : `${errorMessage}\n`;
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
      weapons: { processed_count: 0, failed_count: 0, last_processed_id: 0, complete: false },
      armor: { processed_count: 0, failed_count: 0, last_processed_id: 0, complete: false },
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
    const filename = `turtle_db/${category}-ids.json`;
    if (!existsSync(filename)) {
      throw new Error(`${filename} not found. Run extract-item-ids.ts first.`);
    }
    
    try {
      return JSON.parse(readFileSync(filename, 'utf-8'));
    } catch (e) {
      throw new Error(`Failed to load ${filename}: ${e}`);
    }
  }

  private loadExistingItems(category: 'weapons' | 'armor'): Item[] {
    const filename = `turtle_db/${category}.json`;
    if (existsSync(filename)) {
      try {
        return JSON.parse(readFileSync(filename, 'utf-8'));
      } catch (e) {
        this.log(`⚠️ Failed to load existing ${category} items`);
      }
    }
    return [];
  }

  private saveItems(category: 'weapons' | 'armor', items: Item[]) {
    const filename = `turtle_db/${category}.json`;
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

  private generateItemLink(itemId: number, quality: string, name: string): string {
    const qualityColors: Record<string, string> = {
      'Poor': '9d9d9d',
      'Common': 'ffffff',
      'Uncommon': '1eff00',
      'Rare': '0070dd',
      'Epic': 'a335ee',
      'Legendary': 'ff8000',
      'Artifact': 'e6cc80',
      'Heirloom': '00ccff',
    };
    const color = qualityColors[quality] || 'ffffff';
    return `|cff${color}|Hitem:${itemId}::::::::::0|h[${name}]|h|r`;
  }

  private generateUniqueName(name: string): string {
    return name.toLowerCase()
      .replace(/'/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async scrapeItemDetails(itemId: number, retryCount = 0): Promise<Item | null> {
    try {
      const url = `${this.baseUrl}/?item=${itemId}`;
      
      await this.page!.goto(url, { 
        waitUntil: 'networkidle2', 
        timeout: 30000 
      });
      await this.delay(2000);

      // Extract item data
      const itemData = await this.page!.evaluate((itemId) => {
        // Get item name
        const nameElem = document.querySelector('h1');
        if (!nameElem) return null;
        
        const name = nameElem.textContent?.trim().replace(' - Items', '').replace(' - Item', '').trim() || '';
        
        // Get quality by checking for color classes
        let quality = 'q1'; // Default to common
        const qualityClasses = ['q0', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7'];
        for (const qClass of qualityClasses) {
          if (nameElem.className.includes(qClass)) {
            quality = qClass;
            break;
          }
        }

        // Get icon
        const iconElem = document.querySelector('table img');
        const iconSrc = iconElem?.getAttribute('src') || '';
        const iconMatch = iconSrc.match(/icons\/[a-z]+\/([^.]+)/i);
        const icon = iconMatch?.[1] || '';

        // Parse item details from table
        const itemTable = document.querySelector('table');
        let itemLevel = 0;
        let requiredLevel = 0;
        let sellPrice = 0;
        let slot = '';
        let itemClass = '';
        let subclass = '';
        
        const tooltip: any[] = [];
        
        // Add item name to tooltip
        tooltip.push({ label: name });
        
        if (itemTable) {
          const tableText = itemTable.textContent || '';
          
          // Parse slot and type
          const slotMatch = tableText.match(/(Head|Neck|Shoulder|Back|Chest|Shirt|Tabard|Wrist|Hands|Waist|Legs|Feet|Finger|Trinket|Main Hand|Off Hand|One-Hand|Two-Hand|Ranged|Thrown|Relic|Ammo)/);
          if (slotMatch) {
            slot = slotMatch[1];
            tooltip.push({ label: slot });
          }
          
          // Parse subclass
          const lines = tableText.split('\n').map(l => l.trim()).filter(Boolean);
          for (const line of lines) {
            if (line.includes(slot) && line.includes(' ')) {
              const parts = line.split(/\s{2,}/);
              if (parts.length > 1) {
                subclass = parts[1];
                tooltip.push({ label: subclass, format: 'alignRight' });
                break;
              }
            }
          }
          
          // Parse armor
          const armorMatch = tableText.match(/(\d+)\s*Armor/);
          if (armorMatch) {
            tooltip.push({ label: `${armorMatch[1]} Armor` });
          }
          
          // Parse stats
          const statMatches = tableText.matchAll(/\+(\d+)\s+([A-Za-z\s]+)/g);
          for (const match of statMatches) {
            const statName = match[2].trim();
            if (!statName.includes('Resistance') && statName.length < 20) {
              tooltip.push({ label: `+${match[1]} ${statName}` });
            }
          }
          
          // Parse required level
          const reqLevelMatch = tableText.match(/Requires Level (\d+)/);
          if (reqLevelMatch) {
            requiredLevel = parseInt(reqLevelMatch[1]);
            tooltip.push({ label: `Requires Level ${requiredLevel}` });
          }
          
          // Parse binding
          if (tableText.includes('Binds when picked up')) {
            tooltip.push({ label: 'Binds when picked up' });
          } else if (tableText.includes('Binds when equipped')) {
            tooltip.push({ label: 'Binds when equipped' });
          }
          
          // Parse durability
          const durabilityMatch = tableText.match(/Durability (\d+\s*\/\s*\d+)/);
          if (durabilityMatch) {
            tooltip.push({ label: `Durability ${durabilityMatch[1]}` });
          }
        }
        
        // Determine item class
        if (slot.match(/Main Hand|Off Hand|One-Hand|Two-Hand|Ranged|Thrown|Ammo|Relic/)) {
          itemClass = 'Weapon';
        } else {
          itemClass = 'Armor';
        }
        
        if (!subclass) subclass = itemClass;

        // Get source information
        let source = undefined;
        
        // Look for quest links
        const questLinks = document.querySelectorAll('a[href*="?quest="]');
        if (questLinks.length > 0) {
          const quests: any[] = [];
          
          questLinks.forEach(link => {
            const href = link.getAttribute('href') || '';
            const questIdMatch = href.match(/quest=(\d+)/);
            if (questIdMatch) {
              const questName = link.textContent?.trim() || '';
              const questId = parseInt(questIdMatch[1]);
              
              // Try to determine faction
              let faction = 'Both';
              const parentText = link.closest('tr')?.textContent || link.parentElement?.textContent || '';
              if (parentText.includes('Alliance')) faction = 'Alliance';
              else if (parentText.includes('Horde')) faction = 'Horde';
              
              quests.push({ questId, name: questName, faction });
            }
          });
          
          if (quests.length > 0) {
            source = { category: 'Quest', quests };
          }
        }
        
        // Check for drop sources if no quest found
        if (!source) {
          const dropSection = Array.from(document.querySelectorAll('h2, h3'))
            .find(h => h.textContent?.includes('Dropped by'));
            
          if (dropSection && dropSection.nextElementSibling) {
            const dropTable = dropSection.nextElementSibling;
            if (dropTable.tagName === 'TABLE') {
              const firstRow = dropTable.querySelector('tr');
              if (firstRow) {
                const npcLink = firstRow.querySelector('a');
                const npcName = npcLink?.textContent?.trim() || '';
                const dropRateText = firstRow.querySelector('td:last-child')?.textContent || '';
                const dropRate = parseFloat(dropRateText.replace('%', '')) || 0;
                
                if (npcName) {
                  source = {
                    category: 'Boss Drop',
                    name: npcName,
                    zone: 0,
                    dropChance: dropRate
                  };
                }
              }
            }
          }
        }

        return {
          itemId,
          name,
          icon,
          class: itemClass,
          subclass,
          sellPrice,
          quality,
          itemLevel,
          requiredLevel,
          slot,
          tooltip,
          source
        };
      }, itemId);

      if (!itemData || !itemData.name) {
        throw new Error('Failed to extract item data');
      }

      // Process quality and generate final item
      const qualityMap: Record<string, string> = {
        'q0': 'Poor', 'q1': 'Common', 'q2': 'Uncommon', 'q3': 'Rare',
        'q4': 'Epic', 'q5': 'Legendary', 'q6': 'Artifact', 'q7': 'Heirloom'
      };
      
      const quality = qualityMap[itemData.quality] || 'Common';
      const itemLink = this.generateItemLink(itemId, quality, itemData.name);
      const uniqueName = this.generateUniqueName(itemData.name);

      const item: Item = {
        ...itemData,
        quality,
        itemLink,
        contentPhase: 1,
        uniqueName
      };

      return item;
    } catch (error) {
      this.logError(`Error scraping item ${itemId} (attempt ${retryCount + 1})`, error);
      
      if (retryCount < 2) {
        this.log(`🔄 Retrying item ${itemId} in 3 seconds...`);
        await this.delay(3000);
        return this.scrapeItemDetails(itemId, retryCount + 1);
      }
      
      return null;
    }
  }

  async processCategoryItems(category: 'weapons' | 'armor'): Promise<void> {
    const ids = this.loadIds(category);
    const progress = this.loadProgress();
    const existingItems = this.loadExistingItems(category);
    
    this.log(`\n🎯 Processing ${category} items`);
    this.log(`📊 Total IDs to process: ${ids.length}`);
    this.log(`📦 Already processed: ${existingItems.length}`);
    
    // Filter out already processed items
    const processedIds = existingItems.map(item => item.itemId);
    const remainingIds = ids.filter(id => !processedIds.includes(id) && !progress.failed_items.includes(id));
    
    this.log(`⏳ Remaining to process: ${remainingIds.length}`);
    
    if (remainingIds.length === 0) {
      this.log(`✅ All ${category} items already processed`);
      progress[category].complete = true;
      this.saveProgress(progress);
      return;
    }
    
    let items = [...existingItems];
    
    for (let i = 0; i < remainingIds.length; i++) {
      const itemId = remainingIds[i];
      const overallProgress = i + 1;
      const totalProgress = existingItems.length + overallProgress;
      
      this.log(`🔍 Processing ${category} ${itemId} (${totalProgress}/${ids.length})`);
      
      const item = await this.scrapeItemDetails(itemId);
      if (item) {
        items.push(item);
        progress[category].processed_count = totalProgress;
        progress[category].last_processed_id = itemId;
        
        this.log(`✅ Processed: ${item.name}`);
        
        // Save progress after every item
        this.saveProgress(progress);
        this.saveItems(category, items);
        
      } else {
        progress[category].failed_count++;
        progress.failed_items.push(itemId);
        this.saveProgress(progress);
        this.logError(`Failed to process ${category} item ${itemId}`);
      }
      
      // Rate limiting
      await this.delay(1500);
    }
    
    progress[category].complete = true;
    this.saveProgress(progress);
    
    this.log(`✅ ${category} processing complete!`);
    this.log(`📊 Successfully processed: ${items.length}`);
    this.log(`❌ Failed: ${progress[category].failed_count}`);
  }

  async processAllItems() {
    this.log('\n🚀 Starting Item Detail Processing\n');
    
    const progress = this.loadProgress();
    
    // Process weapons if not complete
    if (!progress.weapons.complete) {
      await this.processCategoryItems('weapons');
    } else {
      this.log(`✅ Weapons already complete`);
    }
    
    // Process armor if not complete
    if (!progress.armor.complete) {
      await this.processCategoryItems('armor');
    } else {
      this.log(`✅ Armor already complete`);
    }
    
    this.log('\n🎉 Item processing complete!');
    
    // Final summary
    const finalProgress = this.loadProgress();
    this.log(`📊 Final Summary:`);
    this.log(`   Weapons processed: ${finalProgress.weapons.processed_count}`);
    this.log(`   Armor processed: ${finalProgress.armor.processed_count}`);
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