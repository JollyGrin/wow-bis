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

class TurtleWowScraper {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private weapons: Item[] = [];
  private armor: Item[] = [];
  private progressFile = 'scraper-progress.json';
  private baseUrl = 'https://database.turtle-wow.org';

  async initialize() {
    console.log('Initializing Puppeteer...');
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    this.page = await this.browser.newPage();
    
    // Set viewport and user agent
    await this.page.setViewport({ width: 1920, height: 1080 });
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

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

  private loadProgress(): { weaponPage: number; armorPage: number; processedItems: number[] } {
    if (existsSync(this.progressFile)) {
      return JSON.parse(readFileSync(this.progressFile, 'utf-8'));
    }
    return { weaponPage: 0, armorPage: 0, processedItems: [] };
  }

  private saveProgress(weaponPage: number, armorPage: number, processedItems: number[]) {
    writeFileSync(this.progressFile, JSON.stringify({ 
      weaponPage, 
      armorPage, 
      processedItems 
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
        const url = currentPage === 0 
          ? `${this.baseUrl}/?items=${categoryId}`
          : `${this.baseUrl}/?items=${categoryId}#${currentPage * 50}+1`;
        
        console.log(`Scraping ${category} page ${currentPage + 1}: ${url}`);
        await this.page!.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        
        // Wait for items to load
        await this.page!.waitForSelector('.listview-mode-default', { timeout: 10000 });
        await this.delay(2000); // Let JavaScript render

        // Extract item IDs from the page
        const pageItemIds = await this.page!.evaluate(() => {
          const items: number[] = [];
          const rows = document.querySelectorAll('.listview-mode-default tbody tr');
          
          rows.forEach(row => {
            const link = row.querySelector('td a[href*="item="]');
            if (link) {
              const href = link.getAttribute('href');
              const match = href?.match(/item=(\d+)/);
              if (match) {
                items.push(parseInt(match[1]));
              }
            }
          });
          
          return items;
        });

        if (pageItemIds.length === 0) {
          console.log('No more items found on page');
          hasMore = false;
        } else {
          itemIds.push(...pageItemIds);
          console.log(`Found ${pageItemIds.length} items on page (total: ${itemIds.length})`);
          
          // Check if there's a next page
          const hasNextPage = await this.page!.evaluate(() => {
            const navLinks = document.querySelectorAll('.listview-nav a');
            return Array.from(navLinks).some(link => link.textContent?.includes('Next'));
          });
          
          if (!hasNextPage) {
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

    return itemIds;
  }

  async scrapeItemDetails(itemId: number, retryCount = 0): Promise<Item | null> {
    try {
      const url = `${this.baseUrl}/?item=${itemId}`;
      console.log(`Scraping item ${itemId}...`);
      
      await this.page!.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      await this.delay(1000);

      // Extract item data
      const itemData = await this.page!.evaluate((itemId) => {
        // Helper function to extract text content
        const getText = (selector: string): string => {
          const elem = document.querySelector(selector);
          return elem?.textContent?.trim() || '';
        };

        // Get item name and quality
        const nameElem = document.querySelector('h1.heading-size-1');
        const name = nameElem?.textContent?.trim() || '';
        const qualityClass = nameElem?.className.match(/q\d/)?.[0] || 'q1';

        // Get basic info from infobox
        const infoRows = document.querySelectorAll('.infobox tr');
        let itemLevel = 0;
        let requiredLevel = 0;
        let sellPrice = 0;
        let slot = '';
        let itemClass = '';
        let subclass = '';

        infoRows.forEach(row => {
          const label = row.querySelector('th')?.textContent?.trim();
          const value = row.querySelector('td')?.textContent?.trim();
          
          if (label && value) {
            if (label.includes('Level')) {
              itemLevel = parseInt(value) || 0;
            } else if (label.includes('Requires Level')) {
              requiredLevel = parseInt(value) || 0;
            } else if (label.includes('Sell Price')) {
              // Parse sell price (handle gold, silver, copper)
              const gold = value.match(/(\d+)g/)?.[1] || '0';
              const silver = value.match(/(\d+)s/)?.[1] || '0';
              const copper = value.match(/(\d+)c/)?.[1] || '0';
              sellPrice = (parseInt(gold) * 10000) + (parseInt(silver) * 100) + parseInt(copper);
            } else if (label.includes('Slot')) {
              slot = value;
            } else if (label.includes('Type')) {
              const parts = value.split(' - ');
              itemClass = parts[0] || '';
              subclass = parts[1] || parts[0] || '';
            }
          }
        });

        // Get icon
        const iconElem = document.querySelector('.iconlarge ins');
        const iconStyle = iconElem?.getAttribute('style') || '';
        const iconMatch = iconStyle.match(/icons\/large\/([^.]+)/);
        const icon = iconMatch?.[1] || '';

        // Get tooltip lines
        const tooltip: any[] = [];
        const tooltipElem = document.querySelector('.tooltip');
        if (tooltipElem) {
          const lines = tooltipElem.querySelectorAll('table tr td');
          lines.forEach(line => {
            const text = line.textContent?.trim();
            if (text) {
              const tooltipLine: any = { label: text };
              
              // Check for special formatting
              if (line.querySelector('.q2')) tooltipLine.format = 'Uncommon';
              else if (line.querySelector('.q3')) tooltipLine.format = 'Rare';
              else if (line.querySelector('.q4')) tooltipLine.format = 'Epic';
              else if (line.querySelector('.moneygold') || line.querySelector('.moneysilver')) {
                tooltipLine.format = 'alignRight';
              }
              
              tooltip.push(tooltipLine);
            }
          });
        }

        // Get source information
        let source = undefined;
        const droppedBySection = Array.from(document.querySelectorAll('h2.heading-size-3'))
          .find(h => h.textContent?.includes('Dropped by'));
        
        const questRewardSection = Array.from(document.querySelectorAll('h2.heading-size-3'))
          .find(h => h.textContent?.includes('Reward from'));

        if (questRewardSection) {
          // Quest source
          const questTable = questRewardSection.nextElementSibling;
          if (questTable?.tagName === 'TABLE') {
            const quests: any[] = [];
            const questRows = questTable.querySelectorAll('tbody tr');
            
            questRows.forEach(row => {
              const linkElem = row.querySelector('a[href*="quest="]');
              if (linkElem) {
                const href = linkElem.getAttribute('href') || '';
                const questIdMatch = href.match(/quest=(\d+)/);
                if (questIdMatch) {
                  const questName = linkElem.textContent?.trim() || '';
                  const faction = row.textContent?.includes('Alliance') ? 'Alliance' 
                    : row.textContent?.includes('Horde') ? 'Horde' 
                    : 'Both';
                  
                  quests.push({
                    questId: parseInt(questIdMatch[1]),
                    name: questName,
                    faction: faction
                  });
                }
              }
            });
            
            if (quests.length > 0) {
              source = {
                category: 'Quest',
                quests: quests
              };
            }
          }
        } else if (droppedBySection) {
          // Boss/Zone drop source
          const dropTable = droppedBySection.nextElementSibling;
          if (dropTable?.tagName === 'TABLE') {
            const firstRow = dropTable.querySelector('tbody tr');
            if (firstRow) {
              const npcName = firstRow.querySelector('td a')?.textContent?.trim() || '';
              const dropChanceText = firstRow.querySelector('td:last-child')?.textContent?.trim() || '';
              const dropChance = parseFloat(dropChanceText.replace('%', '')) || 0;
              
              // Simplified source detection
              if (npcName) {
                source = {
                  category: 'Boss Drop',
                  name: npcName,
                  zone: 0, // Would need additional scraping for zone ID
                  dropChance: dropChance
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
          subclass,
          sellPrice,
          quality: qualityClass,
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

      // Parse quality and generate additional fields
      const quality = this.parseQuality(itemData.quality);
      const itemLink = this.generateItemLink(itemId, quality, itemData.name);
      const uniqueName = this.generateUniqueName(itemData.name);

      const item: Item = {
        ...itemData,
        quality,
        itemLink,
        contentPhase: 1, // Default phase, could be determined from other data
        uniqueName
      };

      return item;
    } catch (error) {
      console.error(`Error scraping item ${itemId}:`, error);
      
      if (retryCount < 3) {
        console.log(`Retrying item ${itemId} (attempt ${retryCount + 1}/3)...`);
        await this.delay(5000);
        return this.scrapeItemDetails(itemId, retryCount + 1);
      }
      
      return null;
    }
  }

  async run() {
    try {
      await this.initialize();
      
      const progress = this.loadProgress();
      console.log('Loaded progress:', progress);

      // Scrape weapons
      if (progress.weaponPage >= 0) {
        console.log('\n=== Scraping Weapons ===');
        const weaponIds = await this.scrapeItemList('weapons', progress.weaponPage);
        
        for (const itemId of weaponIds) {
          if (!progress.processedItems.includes(itemId)) {
            const item = await this.scrapeItemDetails(itemId);
            if (item) {
              this.weapons.push(item);
              progress.processedItems.push(itemId);
              
              // Save progress every 10 items
              if (this.weapons.length % 10 === 0) {
                this.saveProgress(progress.weaponPage, progress.armorPage, progress.processedItems);
                this.saveResults();
                console.log(`Progress saved: ${this.weapons.length} weapons scraped`);
              }
            }
            
            await this.delay(1500); // Rate limiting
          }
        }
      }

      // Scrape armor
      console.log('\n=== Scraping Armor ===');
      const armorIds = await this.scrapeItemList('armor', progress.armorPage);
      
      for (const itemId of armorIds) {
        if (!progress.processedItems.includes(itemId)) {
          const item = await this.scrapeItemDetails(itemId);
          if (item) {
            this.armor.push(item);
            progress.processedItems.push(itemId);
            
            // Save progress every 10 items
            if (this.armor.length % 10 === 0) {
              this.saveProgress(progress.weaponPage, -1, progress.processedItems);
              this.saveResults();
              console.log(`Progress saved: ${this.armor.length} armor pieces scraped`);
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

    } catch (error) {
      console.error('Scraper error:', error);
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
const scraper = new TurtleWowScraper();
scraper.run().catch(console.error);