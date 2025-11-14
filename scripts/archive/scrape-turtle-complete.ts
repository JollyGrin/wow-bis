import puppeteer, { Browser, Page } from 'puppeteer';
import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'fs';
import { join } from 'path';

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

interface Progress {
  completed_items: number[];
  failed_items: number[];
  current_category: 'weapons' | 'armor' | 'complete';
  current_page: number;
  last_item_id: number;
  start_time: string;
  total_processed: number;
  all_item_ids: {
    weapons: number[];
    armor: number[];
  };
  category_complete: {
    weapons: boolean;
    armor: boolean;
  };
  id_extraction_progress: {
    weapons: {
      current_page: number;
      complete: boolean;
    };
    armor: {
      current_page: number;
      complete: boolean;
    };
  };
}

class TurtleWowCompleteScraper {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private baseUrl = 'https://database.turtle-wow.org';
  private progressFile = 'turtle_db/progress.json';
  private logFile = 'turtle_db/logs/scraper.log';
  private errorFile = 'turtle_db/logs/errors.log';

  async initialize() {
    // Create directories
    ['turtle_db', 'turtle_db/logs'].forEach(dir => {
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    });

    this.log('Initializing Puppeteer...');
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ],
    });
    
    this.page = await this.browser.newPage();
    
    // Set complete headers for reliable access
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
    this.log('Puppeteer initialized successfully');
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
    
    // Append to log file
    try {
      writeFileSync(this.logFile, logMessage + '\n', { flag: 'a' });
    } catch (e) {
      console.error('Failed to write to log file:', e);
    }
  }

  private logError(message: string, error?: any) {
    const timestamp = new Date().toISOString();
    const errorMessage = `[${timestamp}] ERROR: ${message}`;
    if (error) {
      console.error(errorMessage, error);
    } else {
      console.error(errorMessage);
    }
    
    // Append to error file
    try {
      const fullError = error ? `${errorMessage}\n${JSON.stringify(error, null, 2)}\n` : `${errorMessage}\n`;
      writeFileSync(this.errorFile, fullError, { flag: 'a' });
    } catch (e) {
      console.error('Failed to write to error file:', e);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private loadProgress(): Progress {
    if (existsSync(this.progressFile)) {
      try {
        return JSON.parse(readFileSync(this.progressFile, 'utf-8'));
      } catch (e) {
        this.logError('Failed to load progress, starting fresh', e);
      }
    }
    
    return {
      completed_items: [],
      failed_items: [],
      current_category: 'weapons',
      current_page: 0,
      last_item_id: 0,
      start_time: new Date().toISOString(),
      total_processed: 0,
      all_item_ids: { weapons: [], armor: [] },
      category_complete: { weapons: false, armor: false },
      id_extraction_progress: {
        weapons: { current_page: 0, complete: false },
        armor: { current_page: 0, complete: false }
      }
    };
  }

  private saveProgress(progress: Progress) {
    try {
      // Atomic save: write to temp file then rename
      const tempFile = this.progressFile + '.tmp';
      writeFileSync(tempFile, JSON.stringify(progress, null, 2));
      
      // Rename to actual file (atomic on most filesystems)
      if (existsSync(this.progressFile)) {
        writeFileSync(this.progressFile + '.backup', readFileSync(this.progressFile));
      }
      writeFileSync(this.progressFile, readFileSync(tempFile));
      
      // Clean up temp file
      if (existsSync(tempFile)) {
        require('fs').unlinkSync(tempFile);
      }
    } catch (e) {
      this.logError('Failed to save progress', e);
    }
  }

  private parseQuality(element: Element | null): string {
    if (!element) return 'Common';
    
    const classList = element.className;
    const qualityMap: Record<string, string> = {
      'q0': 'Poor',
      'q1': 'Common', 
      'q2': 'Uncommon',
      'q3': 'Rare',
      'q4': 'Epic',
      'q5': 'Legendary',
      'q6': 'Artifact',
      'q7': 'Heirloom',
    };
    
    for (const [key, value] of Object.entries(qualityMap)) {
      if (classList.includes(key)) return value;
    }
    
    return 'Common';
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

  async extractAllItemIds(progress: Progress): Promise<{ weapons: number[]; armor: number[] }> {
    this.log('Starting to extract all item IDs...');
    
    const result = { 
      weapons: [...progress.all_item_ids.weapons], 
      armor: [...progress.all_item_ids.armor] 
    };
    
    // Extract weapons if not complete
    if (!progress.id_extraction_progress.weapons.complete) {
      this.log(`Extracting weapon IDs (resuming from page ${progress.id_extraction_progress.weapons.current_page + 1})...`);
      result.weapons = await this.extractItemIdsForCategory('weapons', 2, progress);
      this.log(`Found ${result.weapons.length} weapon IDs`);
      progress.id_extraction_progress.weapons.complete = true;
      this.saveProgress(progress);
    } else {
      this.log(`Weapon ID extraction already complete: ${result.weapons.length} weapon IDs`);
    }
    
    // Extract armor if not complete
    if (!progress.id_extraction_progress.armor.complete) {
      this.log(`Extracting armor IDs (resuming from page ${progress.id_extraction_progress.armor.current_page + 1})...`);
      result.armor = await this.extractItemIdsForCategory('armor', 4, progress);
      this.log(`Found ${result.armor.length} armor IDs`);
      progress.id_extraction_progress.armor.complete = true;
      this.saveProgress(progress);
    } else {
      this.log(`Armor ID extraction already complete: ${result.armor.length} armor IDs`);
    }
    
    return result;
  }

  private async extractItemIdsForCategory(category: string, categoryId: number, progress: Progress): Promise<number[]> {
    const categoryKey = category as 'weapons' | 'armor';
    const itemIds: number[] = [...progress.all_item_ids[categoryKey]];
    let currentPage = progress.id_extraction_progress[categoryKey].current_page;
    let hasMore = true;

    this.log(`Resuming ${category} extraction from page ${currentPage + 1}, already have ${itemIds.length} IDs`);

    while (hasMore) {
      try {
        const offset = currentPage * 50;
        // Use the correct hash-based pagination format from TURTLE_ITEMS_FETCH.md
        let url: string;
        if (currentPage === 0) {
          url = `${this.baseUrl}/?items=${categoryId}`;
        } else {
          // Use the documented hash format: #50+1, #100+1, etc.
          url = `${this.baseUrl}/?items=${categoryId}#${offset}+1`;
        }
        
        this.log(`Extracting ${category} page ${currentPage + 1} (offset: ${offset}) - URL: ${url}`);
        
        if (currentPage === 0) {
          // First page - normal navigation
          await this.page!.goto(url, { 
            waitUntil: 'networkidle2', 
            timeout: 30000 
          });
        } else {
          // For hash-based pagination, we need to update the URL and wait for content
          await this.page!.evaluate((newUrl) => {
            window.location.hash = newUrl.split('#')[1];
          }, url);
          
          // Wait longer for dynamic content to load
          await this.delay(3000);
          
          // Wait for the table content to update
          await this.page!.waitForFunction(() => {
            const links = document.querySelectorAll('a[href*="?item="]');
            return links.length > 0;
          }, { timeout: 10000 });
        }
        
        await this.delay(2000);

        // Extract item IDs and pagination info from the page
        const pageData = await this.page!.evaluate(() => {
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
          
          // Also check for pagination links to understand the URL structure
          const paginationLinks: string[] = [];
          const navLinks = document.querySelectorAll('a[href*="items"]');
          navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href && (href.includes('page') || href.includes('offset') || href.includes('#'))) {
              paginationLinks.push(href);
            }
          });
          
          return { items, paginationLinks };
        });
        
        const pageItemIds = pageData.items;

        // Log pagination links found for debugging
        if (pageData.paginationLinks.length > 0 && currentPage < 3) {
          this.log(`Found pagination links: ${pageData.paginationLinks.slice(0, 3).join(', ')}`);
        }

        if (pageItemIds.length === 0) {
          this.log(`No items found on page ${currentPage + 1}, stopping`);
          hasMore = false;
        } else {
          // Add new IDs that we don't already have
          const newIds = pageItemIds.filter(id => !itemIds.includes(id));
          itemIds.push(...newIds);
          
          // Log some sample IDs for visibility
          const sampleIds = pageItemIds.slice(0, 5).join(', ');
          this.log(`Page ${currentPage + 1}: Found ${pageItemIds.length} items (${newIds.length} new) - Sample IDs: ${sampleIds} (total: ${itemIds.length})`);
          
          // Save progress after every page
          progress.all_item_ids[categoryKey] = [...itemIds];
          progress.id_extraction_progress[categoryKey].current_page = currentPage;
          this.saveProgress(progress);
          
          // If we're not finding new items on consecutive pages, we may have a pagination issue
          if (newIds.length === 0 && currentPage > 0) {
            this.log(`Warning: No new items found on page ${currentPage + 1}. This may indicate a pagination issue.`);
            
            // Try alternative URL patterns
            if (currentPage < 5) { // Only try alternatives for the first few pages
              const alternativeUrls = [
                `${this.baseUrl}/?items=${categoryId}&page=${currentPage + 1}`,
                `${this.baseUrl}/?items=${categoryId}#${offset}`,
                `${this.baseUrl}/?items=${categoryId}#page=${currentPage + 1}`
              ];
              
              this.log(`Trying alternative URL patterns...`);
              // For now, just log them. In the future we could test each one.
              for (const altUrl of alternativeUrls) {
                this.log(`Alternative URL: ${altUrl}`);
              }
            }
          }
          
          // If less than 50 items, we've reached the end
          if (pageItemIds.length < 50) {
            hasMore = false;
          } else {
            currentPage++;
            await this.delay(1500); // Rate limiting
          }
        }
      } catch (error) {
        this.logError(`Error extracting ${category} page ${currentPage}`, error);
        
        // Save progress even on error
        progress.id_extraction_progress[categoryKey].current_page = currentPage;
        this.saveProgress(progress);
        
        // Try to continue with next page
        if (currentPage < 100) { // Safety limit
          currentPage++;
          await this.delay(5000);
        } else {
          hasMore = false;
        }
      }
    }

    // Remove duplicates and sort
    const finalIds = [...new Set(itemIds)].sort((a, b) => a - b);
    
    // Final save
    progress.all_item_ids[categoryKey] = finalIds;
    progress.id_extraction_progress[categoryKey].current_page = currentPage;
    this.saveProgress(progress);
    
    return finalIds;
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
        // Get item name and quality
        const nameElem = document.querySelector('h1');
        if (!nameElem) return null;
        
        const name = nameElem.textContent?.trim().replace(' - Items', '').replace(' - Item', '').trim() || '';
        
        // Additional debug logging for name extraction
        console.log(`Debug: H1 content for item ${itemId}: "${nameElem.textContent}"`);
        console.log(`Debug: Extracted name: "${name}"`);
        
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
        
        // Look for quest links anywhere on the page
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
                    zone: 0, // Would need zone parsing
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
        this.log(`Retrying item ${itemId} in 3 seconds...`);
        await this.delay(3000);
        return this.scrapeItemDetails(itemId, retryCount + 1);
      }
      
      return null;
    }
  }

  private saveItemData(items: Item[], filename: string) {
    try {
      const filepath = `turtle_db/${filename}`;
      const tempPath = `${filepath}.tmp`;
      
      // Atomic save
      writeFileSync(tempPath, JSON.stringify(items, null, 2));
      writeFileSync(filepath, readFileSync(tempPath));
      
      if (existsSync(tempPath)) {
        require('fs').unlinkSync(tempPath);
      }
      
      this.log(`Saved ${items.length} items to ${filename}`);
    } catch (e) {
      this.logError(`Failed to save ${filename}`, e);
    }
  }

  async run() {
    try {
      await this.initialize();
      
      let progress = this.loadProgress();
      this.log(`Starting scraper - ${progress.total_processed} items already processed`);
      
      // Step 1: Extract all item IDs if not done
      if (!progress.id_extraction_progress.weapons.complete || !progress.id_extraction_progress.armor.complete) {
        this.log('Extracting all item IDs first...');
        progress.all_item_ids = await this.extractAllItemIds(progress);
        this.saveProgress(progress);
      }
      
      const totalItems = progress.all_item_ids.weapons.length + progress.all_item_ids.armor.length;
      this.log(`Total items to process: ${totalItems} (${progress.all_item_ids.weapons.length} weapons, ${progress.all_item_ids.armor.length} armor)`);
      
      // Step 2: Process weapons
      if (!progress.category_complete.weapons) {
        this.log('\n=== Processing Weapons ===');
        const weapons: Item[] = [];
        
        // Load existing weapons if any
        const weaponsFile = 'turtle_db/weapons.json';
        if (existsSync(weaponsFile)) {
          try {
            const existing = JSON.parse(readFileSync(weaponsFile, 'utf-8'));
            weapons.push(...existing);
            this.log(`Loaded ${existing.length} existing weapons`);
          } catch (e) {
            this.logError('Failed to load existing weapons', e);
          }
        }
        
        for (const itemId of progress.all_item_ids.weapons) {
          if (progress.completed_items.includes(itemId)) {
            continue; // Skip already processed
          }
          
          this.log(`Processing weapon ${itemId} (${progress.total_processed + 1}/${totalItems})...`);
          
          const item = await this.scrapeItemDetails(itemId);
          if (item) {
            weapons.push(item);
            progress.completed_items.push(itemId);
            progress.total_processed++;
            progress.last_item_id = itemId;
            
            // Save progress after every item
            this.saveProgress(progress);
            this.saveItemData(weapons, 'weapons.json');
            
            this.log(`Successfully processed weapon: ${item.name}`);
          } else {
            progress.failed_items.push(itemId);
            this.saveProgress(progress);
            this.logError(`Failed to process weapon ${itemId}`);
          }
          
          // Rate limiting
          await this.delay(1500);
        }
        
        progress.category_complete.weapons = true;
        this.saveProgress(progress);
        this.log(`Weapons complete: ${weapons.length} items`);
      }
      
      // Step 3: Process armor
      if (!progress.category_complete.armor) {
        this.log('\n=== Processing Armor ===');
        const armor: Item[] = [];
        
        // Load existing armor if any
        const armorFile = 'turtle_db/armor.json';
        if (existsSync(armorFile)) {
          try {
            const existing = JSON.parse(readFileSync(armorFile, 'utf-8'));
            armor.push(...existing);
            this.log(`Loaded ${existing.length} existing armor pieces`);
          } catch (e) {
            this.logError('Failed to load existing armor', e);
          }
        }
        
        for (const itemId of progress.all_item_ids.armor) {
          if (progress.completed_items.includes(itemId)) {
            continue; // Skip already processed
          }
          
          this.log(`Processing armor ${itemId} (${progress.total_processed + 1}/${totalItems})...`);
          
          const item = await this.scrapeItemDetails(itemId);
          if (item) {
            armor.push(item);
            progress.completed_items.push(itemId);
            progress.total_processed++;
            progress.last_item_id = itemId;
            
            // Save progress after every item
            this.saveProgress(progress);
            this.saveItemData(armor, 'armor.json');
            
            this.log(`Successfully processed armor: ${item.name}`);
          } else {
            progress.failed_items.push(itemId);
            this.saveProgress(progress);
            this.logError(`Failed to process armor ${itemId}`);
          }
          
          // Rate limiting
          await this.delay(1500);
        }
        
        progress.category_complete.armor = true;
        this.saveProgress(progress);
        this.log(`Armor complete: ${armor.length} items`);
      }
      
      // Final summary
      progress.current_category = 'complete';
      this.saveProgress(progress);
      
      this.log('\n=== SCRAPING COMPLETE ===');
      this.log(`Total items processed: ${progress.total_processed}`);
      this.log(`Failed items: ${progress.failed_items.length}`);
      this.log(`Started: ${progress.start_time}`);
      this.log(`Completed: ${new Date().toISOString()}`);
      
      if (progress.failed_items.length > 0) {
        this.log(`Failed item IDs: ${progress.failed_items.join(', ')}`);
        writeFileSync('turtle_db/failed-items.json', JSON.stringify(progress.failed_items, null, 2));
      }
      
    } catch (error) {
      this.logError('Fatal scraper error', error);
    } finally {
      await this.cleanup();
    }
  }
}

// Run the scraper
const scraper = new TurtleWowCompleteScraper();
scraper.run().catch(console.error);