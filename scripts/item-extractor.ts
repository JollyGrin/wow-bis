import { Page } from 'puppeteer';

export interface TooltipLine {
  label: string;
  format?: string;
}

export interface Quest {
  questId: number;
  name: string;
  faction: string;
}

export interface ItemSource {
  category: string;
  quests?: Quest[];
  name?: string;
  zone?: number;
  dropChance?: number;
}

export interface Item {
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

export class ItemExtractor {
  
  static generateItemLink(itemId: number, quality: string, name: string): string {
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

  static generateUniqueName(name: string): string {
    return name.toLowerCase()
      .replace(/'/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  static async extractItemDetails(page: Page, itemId: number): Promise<Item | null> {
    try {
      const url = `https://database.turtle-wow.org/?item=${itemId}`;
      
      await page.goto(url, { 
        waitUntil: 'networkidle2', 
        timeout: 30000 
      });
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Extract comprehensive item data
      const itemData = await page.evaluate((itemId) => {
        // Get item name and validate we're on an item page
        const nameElem = document.querySelector('h1');
        if (!nameElem) return null;
        
        const rawName = nameElem.textContent?.trim() || '';
        
        // Check if we got redirected to homepage or invalid page
        if (rawName.includes('database.turtle-wow.org') || rawName === '') {
          return null;
        }
        
        const name = rawName.replace(' - Items', '').replace(' - Item', '').trim();
        
        // Get quality by checking for color classes
        let quality = 'q1'; // Default to common
        const qualityClasses = ['q0', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7'];
        for (const qClass of qualityClasses) {
          if (nameElem.className.includes(qClass)) {
            quality = qClass;
            break;
          }
        }

        // Get icon with better extraction logic
        let icon = '';
        const iconElem = document.querySelector('table img') || document.querySelector('img[src*="icons"]');
        if (iconElem) {
          const iconSrc = iconElem.getAttribute('src') || '';
          const iconMatch = iconSrc.match(/icons\/[a-z]+\/([^.]+)/i) || iconSrc.match(/([^\/]+)\.jpg$/i);
          icon = iconMatch?.[1] || '';
        }

        // Parse item details from main content table
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
          
          // Parse item level
          const itemLevelMatch = tableText.match(/Item Level (\d+)/i);
          if (itemLevelMatch) {
            itemLevel = parseInt(itemLevelMatch[1]);
            tooltip.push({ label: `Item Level ${itemLevel}`, format: 'Misc' });
          }
          
          // Parse required level
          const reqLevelMatch = tableText.match(/Requires Level (\d+)/);
          if (reqLevelMatch) {
            requiredLevel = parseInt(reqLevelMatch[1]);
            tooltip.push({ label: `Requires Level ${requiredLevel}` });
          }
          
          // Parse slot with more comprehensive patterns including weapon slots
          const slotMatch = tableText.match(/(Head|Neck|Shoulder|Back|Chest|Shirt|Tabard|Wrist|Hands|Waist|Legs|Feet|Finger|Trinket|Main Hand|Off Hand|One-Hand|Two-Hand|Ranged|Thrown|Relic|Ammo|Shield|Weapon)/i);
          if (slotMatch) {
            slot = slotMatch[1];
            tooltip.push({ label: slot });
          }
          
          // For weapons, try to infer slot from weapon type if not explicitly stated
          if (!slot) {
            const weaponTypeMatch = tableText.match(/(Sword|Axe|Mace|Dagger|Staff|Bow|Gun|Crossbow|Wand|Polearm|Spear|Thrown|Fist Weapon)/i);
            if (weaponTypeMatch) {
              const weaponType = weaponTypeMatch[1].toLowerCase();
              // Most weapons default to Main Hand unless specifically two-handed
              if (weaponType.includes('staff') || weaponType.includes('polearm') || weaponType.includes('spear')) {
                slot = 'Two-Hand';
              } else if (weaponType.includes('bow') || weaponType.includes('gun') || weaponType.includes('crossbow')) {
                slot = 'Ranged';
              } else if (weaponType.includes('thrown')) {
                slot = 'Thrown';
              } else {
                slot = 'Main Hand'; // Default for most one-handed weapons
              }
              tooltip.push({ label: slot });
            }
          }
          
          // Parse subclass - look for material types and weapon types
          const subclassMatch = tableText.match(/(Cloth|Leather|Mail|Plate|Shield|Sword|Axe|Mace|Dagger|Staff|Bow|Gun|Crossbow|Wand|Polearm|Spear|Thrown|Fist Weapon)/i);
          if (subclassMatch) {
            subclass = subclassMatch[1];
            tooltip.push({ label: subclass, format: 'alignRight' });
          }
          
          // Parse armor value
          const armorMatch = tableText.match(/(\d+)\s*Armor/);
          if (armorMatch) {
            tooltip.push({ label: `${armorMatch[1]} Armor` });
          }
          
          // Parse weapon damage
          const damageMatch = tableText.match(/(\d+)\s*-\s*(\d+)\s*(.*?)\s*Damage/);
          if (damageMatch) {
            tooltip.push({ label: `${damageMatch[1]} - ${damageMatch[2]} ${damageMatch[3]} Damage` });
          }
          
          // Parse stats with better pattern matching
          const statPattern = /\+(\d+)\s+([A-Za-z\s]+?)(?=\s|$|\+|\n)/g;
          let statMatch;
          while ((statMatch = statPattern.exec(tableText)) !== null) {
            const statName = statMatch[2].trim();
            // Filter out unwanted matches and ensure reasonable stat names
            if (!statName.includes('Resistance') && 
                !statName.includes('Level') && 
                !statName.includes('Armor') &&
                statName.length > 2 && statName.length < 20) {
              tooltip.push({ label: `+${statMatch[1]} ${statName}` });
            }
          }
          
          // Parse sell price
          const sellPriceMatch = tableText.match(/Sell Price:.*?(\d+)/);
          if (sellPriceMatch) {
            sellPrice = parseInt(sellPriceMatch[1]);
            tooltip.push({ label: 'Sell Price:' });
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
        
        // Determine item class based on slot and subclass
        if (slot && slot.match(/Main Hand|Off Hand|One-Hand|Two-Hand|Ranged|Thrown|Ammo|Relic/)) {
          itemClass = 'Weapon';
        } else if (subclass && subclass.match(/Sword|Axe|Mace|Dagger|Staff|Bow|Gun|Crossbow|Wand|Polearm|Spear|Thrown|Fist Weapon/i)) {
          itemClass = 'Weapon';
        } else if (name && (name.toLowerCase().includes('spear') || 
                            name.toLowerCase().includes('mace') ||
                            name.toLowerCase().includes('hammer') ||
                            name.toLowerCase().includes('crusher') ||
                            name.toLowerCase().includes('gavel'))) {
          itemClass = 'Weapon';
          if (name.toLowerCase().includes('spear')) {
            if (!slot) slot = 'Two-Hand';
            if (!subclass) subclass = 'Polearm';
          } else if (name.toLowerCase().includes('mace') || 
                     name.toLowerCase().includes('hammer') ||
                     name.toLowerCase().includes('crusher') ||
                     name.toLowerCase().includes('gavel')) {
            if (!slot) slot = 'Two-Hand'; // 2.5 is 2H maces
            if (!subclass) subclass = 'Mace';
          }
        } else {
          itemClass = 'Armor';
        }
        
        if (!subclass) subclass = itemClass;

        // Extract source information with comprehensive quest detection
        let source = undefined;
        
        // Look for quest links in various sections
        const questLinks = document.querySelectorAll('a[href*="?quest="]');
        if (questLinks.length > 0) {
          const quests: any[] = [];
          
          questLinks.forEach(link => {
            const href = link.getAttribute('href') || '';
            const questIdMatch = href.match(/quest=(\d+)/);
            if (questIdMatch) {
              const questName = link.textContent?.trim() || '';
              const questId = parseInt(questIdMatch[1]);
              
              // Try to determine faction from surrounding context
              let faction = 'Both';
              const parentRow = link.closest('tr');
              const parentSection = link.closest('div') || link.closest('td');
              const contextText = (parentRow?.textContent || parentSection?.textContent || '').toLowerCase();
              
              if (contextText.includes('alliance')) faction = 'Alliance';
              else if (contextText.includes('horde')) faction = 'Horde';
              
              // Avoid duplicate quests
              if (!quests.some(q => q.questId === questId)) {
                quests.push({ questId, name: questName, faction });
              }
            }
          });
          
          if (quests.length > 0) {
            source = { category: 'Quest', quests };
          }
        }
        
        // Check for drop sources if no quest found
        if (!source) {
          // Look for "Dropped by" sections
          const dropHeaders = Array.from(document.querySelectorAll('h2, h3, th'))
            .find(h => h.textContent?.toLowerCase().includes('dropped by'));
            
          if (dropHeaders) {
            const dropTable = dropHeaders.closest('table') || dropHeaders.nextElementSibling;
            if (dropTable && dropTable.tagName === 'TABLE') {
              const firstRow = dropTable.querySelector('tr:not(:first-child)') || dropTable.querySelector('tr');
              if (firstRow) {
                const npcLink = firstRow.querySelector('a');
                const npcName = npcLink?.textContent?.trim() || '';
                const dropRateCell = firstRow.querySelector('td:last-child');
                const dropRateText = dropRateCell?.textContent || '';
                const dropRate = parseFloat(dropRateText.replace('%', '')) || 0;
                
                if (npcName && npcName !== name) { // Avoid self-references
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
        return null;
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
      console.error(`Error extracting item ${itemId}:`, error);
      return null;
    }
  }
}