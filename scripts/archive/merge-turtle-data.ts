import { readFileSync, writeFileSync, existsSync } from 'fs';
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

interface MergeStats {
  weapons: number;
  armor: number;
  total: number;
  duplicates: number;
  questItems: number;
  bossDrops: number;
  qualityBreakdown: Record<string, number>;
  slotBreakdown: Record<string, number>;
  errors: string[];
}

class TurtleDataMerger {
  private weapons: Item[] = [];
  private armor: Item[] = [];
  private stats: MergeStats = {
    weapons: 0,
    armor: 0,
    total: 0,
    duplicates: 0,
    questItems: 0,
    bossDrops: 0,
    qualityBreakdown: {},
    slotBreakdown: {},
    errors: []
  };

  private log(message: string) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
  }

  private logError(message: string) {
    const timestamp = new Date().toISOString();
    const errorMsg = `[${timestamp}] ERROR: ${message}`;
    console.error(errorMsg);
    this.stats.errors.push(errorMsg);
  }

  private loadItemData(filename: string): Item[] {
    const filepath = join(process.cwd(), 'turtle_db', filename);
    
    if (!existsSync(filepath)) {
      this.logError(`File not found: ${filename}`);
      return [];
    }

    try {
      const data = JSON.parse(readFileSync(filepath, 'utf-8'));
      
      if (!Array.isArray(data)) {
        this.logError(`Invalid data format in ${filename}: not an array`);
        return [];
      }

      this.log(`Loaded ${data.length} items from ${filename}`);
      return data;
    } catch (error) {
      this.logError(`Failed to parse ${filename}: ${error}`);
      return [];
    }
  }

  private validateItem(item: any, source: string): item is Item {
    const requiredFields = [
      'itemId', 'name', 'icon', 'class', 'subclass', 
      'quality', 'slot', 'tooltip', 'itemLink', 'uniqueName'
    ];

    for (const field of requiredFields) {
      if (!(field in item)) {
        this.logError(`${source} item ${item.itemId || 'unknown'} missing required field: ${field}`);
        return false;
      }
    }

    // Validate types
    if (typeof item.itemId !== 'number' || item.itemId <= 0) {
      this.logError(`${source} item has invalid itemId: ${item.itemId}`);
      return false;
    }

    if (typeof item.name !== 'string' || item.name.trim() === '') {
      this.logError(`${source} item ${item.itemId} has invalid name: ${item.name}`);
      return false;
    }

    if (!Array.isArray(item.tooltip)) {
      this.logError(`${source} item ${item.itemId} has invalid tooltip: not an array`);
      return false;
    }

    return true;
  }

  private updateStats(items: Item[], category: 'weapons' | 'armor') {
    this.stats[category] = items.length;

    items.forEach(item => {
      // Quality breakdown
      if (!this.stats.qualityBreakdown[item.quality]) {
        this.stats.qualityBreakdown[item.quality] = 0;
      }
      this.stats.qualityBreakdown[item.quality]++;

      // Slot breakdown
      if (!this.stats.slotBreakdown[item.slot]) {
        this.stats.slotBreakdown[item.slot] = 0;
      }
      this.stats.slotBreakdown[item.slot]++;

      // Source breakdown
      if (item.source?.category === 'Quest') {
        this.stats.questItems++;
      } else if (item.source?.category === 'Boss Drop') {
        this.stats.bossDrops++;
      }
    });
  }

  private detectDuplicates(weapons: Item[], armor: Item[]): number {
    const allItems = [...weapons, ...armor];
    const itemIds = new Set<number>();
    let duplicates = 0;

    for (const item of allItems) {
      if (itemIds.has(item.itemId)) {
        this.logError(`Duplicate item ID found: ${item.itemId} (${item.name})`);
        duplicates++;
      } else {
        itemIds.add(item.itemId);
      }
    }

    return duplicates;
  }

  private generateSummaryReport(): string {
    const report = `
# Turtle WoW Data Merge Report
Generated: ${new Date().toISOString()}

## Summary Statistics
- **Total Items**: ${this.stats.total}
- **Weapons**: ${this.stats.weapons}
- **Armor**: ${this.stats.armor}
- **Duplicates Found**: ${this.stats.duplicates}
- **Quest Items**: ${this.stats.questItems}
- **Boss Drops**: ${this.stats.bossDrops}

## Quality Breakdown
${Object.entries(this.stats.qualityBreakdown)
  .sort(([,a], [,b]) => b - a)
  .map(([quality, count]) => `- **${quality}**: ${count}`)
  .join('\n')}

## Slot Breakdown
${Object.entries(this.stats.slotBreakdown)
  .sort(([,a], [,b]) => b - a)
  .map(([slot, count]) => `- **${slot}**: ${count}`)
  .join('\n')}

## Errors Found
${this.stats.errors.length === 0 ? 'No errors found ✅' : this.stats.errors.map(error => `- ${error}`).join('\n')}

## Quest Items Analysis
Quest items found: ${this.stats.questItems}

These items may need quest minimum level processing to fix requiredLevel: 0 issues.

## Next Steps
1. Run quest level fetcher if quest items have requiredLevel: 0
2. Validate data quality with validation script
3. Replace existing items.json with merged data
    `;

    return report;
  }

  async merge(): Promise<void> {
    try {
      this.log('Starting Turtle WoW data merge...');

      // Load weapons and armor data
      this.weapons = this.loadItemData('weapons.json');
      this.armor = this.loadItemData('armor.json');

      if (this.weapons.length === 0 && this.armor.length === 0) {
        this.logError('No data found to merge. Run the scraper first.');
        return;
      }

      // Validate all items
      this.log('Validating weapons data...');
      const validWeapons = this.weapons.filter(item => this.validateItem(item, 'weapons'));
      
      this.log('Validating armor data...');
      const validArmor = this.armor.filter(item => this.validateItem(item, 'armor'));

      // Update statistics
      this.updateStats(validWeapons, 'weapons');
      this.updateStats(validArmor, 'armor');
      this.stats.total = validWeapons.length + validArmor.length;

      // Check for duplicates
      this.stats.duplicates = this.detectDuplicates(validWeapons, validArmor);

      // Merge all items
      const allItems = [...validWeapons, ...validArmor];
      
      // Sort by item ID
      allItems.sort((a, b) => a.itemId - b.itemId);

      this.log(`Merge complete: ${allItems.length} total items`);

      // Save merged data
      const mergedFilePath = join(process.cwd(), 'turtle_db', 'all-items.json');
      writeFileSync(mergedFilePath, JSON.stringify(allItems, null, 2));
      this.log(`Saved merged data to: all-items.json`);

      // Generate and save report
      const report = this.generateSummaryReport();
      const reportPath = join(process.cwd(), 'turtle_db', 'merge-report.md');
      writeFileSync(reportPath, report);
      this.log(`Generated merge report: merge-report.md`);

      // Save stats as JSON for other scripts
      const statsPath = join(process.cwd(), 'turtle_db', 'merge-stats.json');
      writeFileSync(statsPath, JSON.stringify(this.stats, null, 2));

      console.log('\n' + '='.repeat(50));
      console.log('MERGE SUMMARY');
      console.log('='.repeat(50));
      console.log(`✅ Total items merged: ${this.stats.total}`);
      console.log(`⚔️  Weapons: ${this.stats.weapons}`);
      console.log(`🛡️  Armor: ${this.stats.armor}`);
      console.log(`📋 Quest items: ${this.stats.questItems}`);
      console.log(`💀 Boss drops: ${this.stats.bossDrops}`);
      
      if (this.stats.duplicates > 0) {
        console.log(`⚠️  Duplicates: ${this.stats.duplicates}`);
      }
      
      if (this.stats.errors.length > 0) {
        console.log(`❌ Errors: ${this.stats.errors.length}`);
      }
      
      console.log('\n📄 See merge-report.md for detailed analysis');

    } catch (error) {
      this.logError(`Fatal merge error: ${error}`);
      throw error;
    }
  }
}

// Run the merger
const merger = new TurtleDataMerger();
merger.merge().catch(console.error);