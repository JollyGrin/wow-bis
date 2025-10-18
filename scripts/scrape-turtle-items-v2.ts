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

class TurtleWowScraperV2 {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private weapons: Item[] = [];
  private armor: Item[] = [];
  private progressFile = 'scraper-progress-v2.json';
  private baseUrl = 'https://database.turtle-wow.org';

  async initialize() {
    console.log('Initializing Puppeteer...');
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    this.page = await this.browser.newPage();
    
    // Set complete headers to mimic a real browser
    await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await this.page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    });
    
    await this.page.setViewport({ width: 1920, height: 1080 });

    // Create turtle_db directory if it doesn't exist
    const dbDir = join(process.cwd(), 'turtle_db');
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir);
    }
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private loadProgress(): { processedItems: Set<number>; lastPage: { weapons: number; armor: number } } {
    if (existsSync(this.progressFile)) {
      const data = JSON.parse(readFileSync(this.progressFile, 'utf-8'));
      return {
        processedItems: new Set(data.processedItems),
        lastPage: data.lastPage || { weapons: 0, armor: 0 }
      };
    }
    return { processedItems: new Set(), lastPage: { weapons: 0, armor: 0 } };
  }

  private saveProgress(processedItems: Set<number>, lastPage: { weapons: number; armor: number }) {
    writeFileSync(this.progressFile, JSON.stringify({ 
      processedItems: Array.from(processedItems),
      lastPage
    }, null, 2));
  }

  private parseQuality(qualityClass: string): string {
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
    return qualityMap[qualityClass] || 'Common';
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

  async scrapeItemList(category: 'weapons' | 'armor', startPage: number = 0): Promise<number[]> {
    const itemIds: number[] = [];
    const categoryId = category === 'weapons' ? 2 : 4;
    let currentPage = startPage;
    let hasMore = true;

    while (hasMore) {
      try {
        const offset = currentPage * 50;
        const url = currentPage === 0 
          ? `${this.baseUrl}/?items=${categoryId}`
          : `${this.baseUrl}/?items=${categoryId}#${offset}+1`;
        
        console.log(`Scraping ${category} page ${currentPage + 1} (offset: ${offset})`);
        await this.page!.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        await this.delay(2000); // Wait for JavaScript to render

        // Extract item IDs from the page
        const pageItemIds = await this.page!.evaluate(() => {
          const items: number[] = [];
          const links = document.querySelectorAll('a[href*="?item="]');
          
          links.forEach(link => {
            const href = link.getAttribute('href');
            const match = href?.match(/item=(\d+)/);
            if (match) {
              const itemId = parseInt(match[1]);
              // Filter out duplicates on the same page
              if (!items.includes(itemId)) {
                items.push(itemId);
              }
            }
          });
          
          return items;
        });

        console.log(`Found ${pageItemIds.length} items on page`);

        if (pageItemIds.length === 0) {
          hasMore = false;
        } else {
          itemIds.push(...pageItemIds);
          
          // Check if we have exactly 50 items (full page), indicating there might be more
          if (pageItemIds.length < 50) {
            hasMore = false;
          } else {
            currentPage++;
            await this.delay(1500); // Rate limiting
          }
        }
      } catch (error) {
        console.error(`Error scraping ${category} page ${currentPage}:`, error);
        hasMore = false;
      }
    }

    // Remove duplicates
    return [...new Set(itemIds)];
  }

  async scrapeItemDetails(itemId: number, retryCount = 0): Promise<Item | null> {
    try {
      const url = `${this.baseUrl}/?item=${itemId}`;
      console.log(`Scraping item ${itemId}...`);
      
      await this.page!.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      await this.delay(2000); // Wait for content to load

      // Extract item data
      const itemData = await this.page!.evaluate((itemId) => {
        // Get item name and quality from the main heading
        const nameElem = document.querySelector('h1') || document.querySelector('.heading-size-1');
        if (!nameElem) return null;
        
        const name = nameElem.textContent?.trim().replace(' - Items', '').trim() || '';
        const qualityClass = nameElem.className.match(/q\d/)?.[0] || 'q1';

        // Extract tooltip data from the item box
        const tooltipLines: any[] = [];
        const itemBox = document.querySelector('table');
        
        // First line is the item name
        tooltipLines.push({ label: name });
        
        // Get binding type
        const bindingText = itemBox?.textContent?.match(/(Binds when [a-z]+|Soulbound)/i)?.[0];
        if (bindingText) {
          tooltipLines.push({ label: bindingText });
        }
        
        // Parse item stats from the table
        let itemLevel = 0;
        let requiredLevel = 0;
        let sellPrice = 0;
        let slot = '';
        let itemClass = '';
        let subclass = '';
        let icon = '';

        // Look for the icon
        const iconElem = document.querySelector('table img');
        if (iconElem) {
          const iconSrc = iconElem.getAttribute('src') || '';
          const iconMatch = iconSrc.match(/icons\/[a-z]+\/([^.]+)/i);
          icon = iconMatch?.[1] || '';
        }

        // Parse all table rows
        const rows = itemBox?.querySelectorAll('tr') || [];
        rows.forEach(row => {
          const cells = row.querySelectorAll('td');
          const text = row.textContent?.trim() || '';
          
          // Slot detection
          if (text.match(/^(Head|Neck|Shoulder|Back|Chest|Shirt|Tabard|Wrist|Hands|Waist|Legs|Feet|Finger|Trinket|Main Hand|Off Hand|One-Hand|Two-Hand|Ranged|Thrown|Relic|Ammo)/)) {
            const parts = text.split(/\s{2,}/);
            slot = parts[0];
            if (parts[1]) {
              subclass = parts[1];
              tooltipLines.push({ label: slot });
              tooltipLines.push({ label: subclass, format: 'alignRight' });
            }
          }
          
          // Stats and other attributes
          if (text.includes('Armor') && !text.includes('Classes:')) {
            const armorMatch = text.match(/(\d+)\s*Armor/);
            if (armorMatch) {
              tooltipLines.push({ label: `${armorMatch[1]} Armor` });
            }
          }
          
          // Attributes (Strength, Intellect, etc.)
          const statMatch = text.match(/\+(\d+)\s+([A-Za-z\s]+)/);
          if (statMatch && !text.includes('Resistance')) {
            tooltipLines.push({ label: text });
          }
          
          // Durability
          if (text.includes('Durability')) {
            tooltipLines.push({ label: text });
          }
          
          // Classes restriction
          if (text.includes('Classes:')) {
            tooltipLines.push({ label: text });
          }
          
          // Required level
          if (text.includes('Requires Level')) {
            const levelMatch = text.match(/Requires Level (\d+)/);
            if (levelMatch) {
              requiredLevel = parseInt(levelMatch[1]);
              tooltipLines.push({ label: text });
            }
          }
          
          // Equip effects (green text)
          const equipElems = row.querySelectorAll('.q2');
          equipElems.forEach(elem => {
            const equipText = elem.textContent?.trim();
            if (equipText && equipText.startsWith('Equip:')) {
              tooltipLines.push({ label: equipText, format: 'Uncommon' });
            }
          });
        });

        // Determine item class
        if (slot.match(/Main Hand|Off Hand|One-Hand|Two-Hand/)) {
          itemClass = 'Weapon';
        } else if (slot.match(/Ranged|Thrown|Ammo|Relic/)) {
          itemClass = 'Weapon';
        } else {
          itemClass = 'Armor';
        }

        // Get source information
        let source = undefined;
        
        // Check for quest rewards
        const questRewardSection = Array.from(document.querySelectorAll('h2, h3'))
          .find(h => h.textContent?.includes('Reward from'));
          
        if (questRewardSection && questRewardSection.nextElementSibling) {
          const questTable = questRewardSection.nextElementSibling;
          if (questTable.tagName === 'TABLE') {
            const quests: any[] = [];
            const questLinks = questTable.querySelectorAll('a[href*="?quest="]');
            
            questLinks.forEach(link => {
              const href = link.getAttribute('href') || '';
              const questIdMatch = href.match(/quest=(\d+)/);
              if (questIdMatch) {
                const row = link.closest('tr');
                const questName = link.textContent?.trim() || '';
                let faction = 'Both';
                
                // Check for faction icons or text
                if (row?.textContent?.includes('Alliance')) faction = 'Alliance';
                else if (row?.textContent?.includes('Horde')) faction = 'Horde';
                
                quests.push({
                  questId: parseInt(questIdMatch[1]),
                  name: questName,
                  faction: faction
                });
              }
            });
            
            if (quests.length > 0) {
              source = { category: 'Quest', quests };
            }
          }
        }
        
        // Check for drops
        const droppedBySection = Array.from(document.querySelectorAll('h2, h3'))
          .find(h => h.textContent?.includes('Dropped by'));
          
        if (!source && droppedBySection && droppedBySection.nextElementSibling) {
          const dropTable = droppedBySection.nextElementSibling;
          if (dropTable.tagName === 'TABLE') {
            const firstRow = dropTable.querySelector('tr');
            if (firstRow) {
              const npcLink = firstRow.querySelector('a');
              const npcName = npcLink?.textContent?.trim() || '';
              const dropRateCell = firstRow.querySelector('td:last-child');
              const dropRate = parseFloat(dropRateCell?.textContent?.replace('%', '') || '0');
              
              if (npcName) {
                source = {
                  category: 'Boss Drop',
                  name: npcName,
                  zone: 0, // Would need additional parsing
                  dropChance: dropRate
                };
              }
            }
          }
        }

        return {
          itemId,
          name,
          icon,
          class: itemClass,
          subclass: subclass || itemClass,
          sellPrice,
          quality: qualityClass,
          itemLevel,
          requiredLevel,
          slot,
          tooltip: tooltipLines,
          source
        };
      }, itemId);

      if (!itemData || !itemData.name) {
        throw new Error('Failed to extract item data');
      }

      // Parse quality and generate additional fields
      const quality = this.parseQuality(itemData.quality);
      const itemLink = this.generateItemLink(itemId, quality, itemData.name);
      const uniqueName = this.generateUniqueName(itemData.name);

      const item: Item = {
        ...itemData,
        quality,
        itemLink,
        contentPhase: 1, // Default phase
        uniqueName
      };

      return item;
    } catch (error) {
      console.error(`Error scraping item ${itemId}:`, error);
      
      if (retryCount < 2) {
        console.log(`Retrying item ${itemId} (attempt ${retryCount + 2}/3)...`);
        await this.delay(3000);
        return this.scrapeItemDetails(itemId, retryCount + 1);
      }
      
      return null;
    }
  }

  async run() {
    try {
      await this.initialize();
      
      const progress = this.loadProgress();
      console.log(`Resuming from: Weapons page ${progress.lastPage.weapons}, Armor page ${progress.lastPage.armor}`);
      console.log(`Already processed ${progress.processedItems.size} items`);

      // Load existing data
      const weaponsFile = join(process.cwd(), 'turtle_db', 'weapons.json');
      const armorFile = join(process.cwd(), 'turtle_db', 'armor.json');
      
      if (existsSync(weaponsFile)) {
        this.weapons = JSON.parse(readFileSync(weaponsFile, 'utf-8'));
      }
      if (existsSync(armorFile)) {
        this.armor = JSON.parse(readFileSync(armorFile, 'utf-8'));
      }

      // Scrape weapons
      console.log('\n=== Scraping Weapons ===');
      const weaponIds = await this.scrapeItemList('weapons', 0);
      console.log(`Total weapon IDs found: ${weaponIds.length}`);
      
      let weaponsProcessed = 0;
      for (const itemId of weaponIds) {
        if (!progress.processedItems.has(itemId)) {
          const item = await this.scrapeItemDetails(itemId);
          if (item) {
            this.weapons.push(item);
            progress.processedItems.add(itemId);
            weaponsProcessed++;
            
            // Save progress every 10 items
            if (weaponsProcessed % 10 === 0) {
              this.saveProgress(progress.processedItems, progress.lastPage);
              this.saveResults();
              console.log(`Progress saved: ${weaponsProcessed} new weapons scraped (${this.weapons.length} total)`);
            }
          }
          
          await this.delay(1500); // Rate limiting
        }
      }

      // Scrape armor
      console.log('\n=== Scraping Armor ===');
      const armorIds = await this.scrapeItemList('armor', 0);
      console.log(`Total armor IDs found: ${armorIds.length}`);
      
      let armorProcessed = 0;
      for (const itemId of armorIds) {
        if (!progress.processedItems.has(itemId)) {
          const item = await this.scrapeItemDetails(itemId);
          if (item) {
            this.armor.push(item);
            progress.processedItems.add(itemId);
            armorProcessed++;
            
            // Save progress every 10 items
            if (armorProcessed % 10 === 0) {
              this.saveProgress(progress.processedItems, progress.lastPage);
              this.saveResults();
              console.log(`Progress saved: ${armorProcessed} new armor pieces scraped (${this.armor.length} total)`);
            }
          }
          
          await this.delay(1500); // Rate limiting
        }
      }

      // Final save
      this.saveResults();
      console.log('\nScraping complete!');
      console.log(`Total weapons: ${this.weapons.length}`);
      console.log(`Total armor: ${this.armor.length}`);
      console.log(`Total items processed: ${progress.processedItems.size}`);

    } catch (error) {
      console.error('Scraper error:', error);
      this.saveResults(); // Save what we have
    } finally {
      await this.cleanup();
    }
  }

  private saveResults() {
    const dbDir = join(process.cwd(), 'turtle_db');
    
    if (this.weapons.length > 0) {
      writeFileSync(
        join(dbDir, 'weapons.json'),
        JSON.stringify(this.weapons, null, 2)
      );
    }
    
    if (this.armor.length > 0) {
      writeFileSync(
        join(dbDir, 'armor.json'),
        JSON.stringify(this.armor, null, 2)
      );
    }
  }
}

// Run the scraper
const scraper = new TurtleWowScraperV2();
scraper.run().catch(console.error);