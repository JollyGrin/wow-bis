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

interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  category: string;
  itemId?: number;
  itemName?: string;
  description: string;
  suggestion?: string;
}

interface ValidationReport {
  summary: {
    totalItems: number;
    errors: number;
    warnings: number;
    infos: number;
    validItems: number;
    questItemsWithZeroLevel: number;
    missingIcons: number;
  };
  issues: ValidationIssue[];
  qualityDistribution: Record<string, number>;
  slotDistribution: Record<string, number>;
  sourceDistribution: Record<string, number>;
  levelRangeDistribution: Record<string, number>;
}

class TurtleDataValidator {
  private items: Item[] = [];
  private questLevels: Record<number, number> = {};
  private issues: ValidationIssue[] = [];

  private validQualities = ['Poor', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Artifact', 'Heirloom'];
  private validSlots = [
    'Head', 'Neck', 'Shoulder', 'Back', 'Chest', 'Shirt', 'Tabard',
    'Wrist', 'Hands', 'Waist', 'Legs', 'Feet', 'Finger', 'Trinket',
    'Main Hand', 'Off Hand', 'One-Hand', 'Two-Hand', 'Ranged', 'Thrown', 'Relic', 'Ammo'
  ];
  private validClasses = ['Weapon', 'Armor'];
  private validSourceCategories = ['Quest', 'Boss Drop', 'Zone Drop', 'Rare Drop', 'Vendor'];

  private log(message: string) {
    console.log(`[${new Date().toISOString()}] ${message}`);
  }

  private addIssue(issue: ValidationIssue) {
    this.issues.push(issue);
  }

  private loadItems(): boolean {
    const itemsPath = join(process.cwd(), 'turtle_db', 'all-items.json');
    
    if (!existsSync(itemsPath)) {
      this.log('No merged items file found, checking individual files...');
      
      const weapons = this.loadItemsFromFile('weapons.json');
      const armor = this.loadItemsFromFile('armor.json');
      
      if (weapons.length === 0 && armor.length === 0) {
        this.log('No item files found. Run the scraper first.');
        return false;
      }
      
      this.items = [...weapons, ...armor];
    } else {
      try {
        this.items = JSON.parse(readFileSync(itemsPath, 'utf-8'));
      } catch (error) {
        this.log(`Failed to load items: ${error}`);
        return false;
      }
    }

    this.log(`Loaded ${this.items.length} items for validation`);
    return true;
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

  private loadQuestLevels() {
    const questLevelsPath = join(process.cwd(), 'turtle_db', 'quest-levels.json');
    
    if (existsSync(questLevelsPath)) {
      try {
        this.questLevels = JSON.parse(readFileSync(questLevelsPath, 'utf-8'));
        this.log(`Loaded ${Object.keys(this.questLevels).length} quest levels`);
      } catch (error) {
        this.log(`Failed to load quest levels: ${error}`);
      }
    } else {
      this.log('No quest levels file found. Run quest level fetcher if needed.');
    }
  }

  private validateRequiredFields(item: any): boolean {
    const requiredFields = [
      'itemId', 'name', 'icon', 'class', 'subclass', 'quality', 
      'slot', 'tooltip', 'itemLink', 'uniqueName'
    ];

    let isValid = true;

    for (const field of requiredFields) {
      if (!(field in item)) {
        this.addIssue({
          severity: 'error',
          category: 'Missing Field',
          itemId: item.itemId,
          itemName: item.name,
          description: `Missing required field: ${field}`,
          suggestion: 'Re-scrape this item to get complete data'
        });
        isValid = false;
      }
    }

    return isValid;
  }

  private validateFieldTypes(item: Item): void {
    // Validate itemId
    if (typeof item.itemId !== 'number' || item.itemId <= 0) {
      this.addIssue({
        severity: 'error',
        category: 'Invalid Type',
        itemId: item.itemId,
        itemName: item.name,
        description: `Invalid itemId: ${item.itemId} (expected positive number)`
      });
    }

    // Validate name
    if (typeof item.name !== 'string' || item.name.trim() === '') {
      this.addIssue({
        severity: 'error',
        category: 'Invalid Type',
        itemId: item.itemId,
        itemName: item.name,
        description: 'Invalid or empty item name'
      });
    }

    // Validate levels
    if (typeof item.itemLevel !== 'number' || item.itemLevel < 0) {
      this.addIssue({
        severity: 'warning',
        category: 'Invalid Value',
        itemId: item.itemId,
        itemName: item.name,
        description: `Invalid itemLevel: ${item.itemLevel}`
      });
    }

    if (typeof item.requiredLevel !== 'number' || item.requiredLevel < 0) {
      this.addIssue({
        severity: 'warning',
        category: 'Invalid Value',
        itemId: item.itemId,
        itemName: item.name,
        description: `Invalid requiredLevel: ${item.requiredLevel}`
      });
    }

    // Validate tooltip
    if (!Array.isArray(item.tooltip)) {
      this.addIssue({
        severity: 'error',
        category: 'Invalid Type',
        itemId: item.itemId,
        itemName: item.name,
        description: 'Tooltip is not an array'
      });
    }
  }

  private validateEnumFields(item: Item): void {
    // Validate quality
    if (!this.validQualities.includes(item.quality)) {
      this.addIssue({
        severity: 'error',
        category: 'Invalid Value',
        itemId: item.itemId,
        itemName: item.name,
        description: `Invalid quality: ${item.quality}`,
        suggestion: `Valid qualities: ${this.validQualities.join(', ')}`
      });
    }

    // Validate slot
    if (!this.validSlots.includes(item.slot)) {
      this.addIssue({
        severity: 'warning',
        category: 'Invalid Value',
        itemId: item.itemId,
        itemName: item.name,
        description: `Unusual slot: ${item.slot}`,
        suggestion: 'Verify this is a valid equipment slot'
      });
    }

    // Validate class
    if (!this.validClasses.includes(item.class)) {
      this.addIssue({
        severity: 'warning',
        category: 'Invalid Value',
        itemId: item.itemId,
        itemName: item.name,
        description: `Unusual class: ${item.class}`,
        suggestion: `Expected: ${this.validClasses.join(' or ')}`
      });
    }

    // Validate source category
    if (item.source && !this.validSourceCategories.includes(item.source.category)) {
      this.addIssue({
        severity: 'warning',
        category: 'Invalid Value',
        itemId: item.itemId,
        itemName: item.name,
        description: `Unusual source category: ${item.source.category}`
      });
    }
  }

  private validateBusinessLogic(item: Item): void {
    // Check for quest items with requiredLevel 0
    if (item.source?.category === 'Quest' && item.requiredLevel === 0) {
      // Check if we have quest level data
      const hasQuestLevelData = item.source.quests?.some(q => 
        this.questLevels[q.questId] !== undefined
      );

      this.addIssue({
        severity: hasQuestLevelData ? 'warning' : 'error',
        category: 'Quest Item Issue',
        itemId: item.itemId,
        itemName: item.name,
        description: 'Quest reward item has requiredLevel: 0',
        suggestion: hasQuestLevelData 
          ? 'Use quest minimum level as effective required level'
          : 'Fetch quest level data to determine proper required level'
      });
    }

    // Check for items with very high required level vs item level
    if (item.requiredLevel > item.itemLevel + 10) {
      this.addIssue({
        severity: 'warning',
        category: 'Level Mismatch',
        itemId: item.itemId,
        itemName: item.name,
        description: `Required level (${item.requiredLevel}) much higher than item level (${item.itemLevel})`
      });
    }

    // Check for missing icons
    if (!item.icon || item.icon.trim() === '') {
      this.addIssue({
        severity: 'warning',
        category: 'Missing Data',
        itemId: item.itemId,
        itemName: item.name,
        description: 'Missing item icon'
      });
    }

    // Check for empty tooltip
    if (item.tooltip.length === 0) {
      this.addIssue({
        severity: 'warning',
        category: 'Missing Data',
        itemId: item.itemId,
        itemName: item.name,
        description: 'Empty tooltip'
      });
    }

    // Check for class/slot mismatch
    if (item.class === 'Weapon' && !item.slot.match(/Hand|Ranged|Thrown|Relic|Ammo/)) {
      this.addIssue({
        severity: 'warning',
        category: 'Data Inconsistency',
        itemId: item.itemId,
        itemName: item.name,
        description: `Weapon item with non-weapon slot: ${item.slot}`
      });
    }

    if (item.class === 'Armor' && item.slot.match(/Hand|Ranged|Thrown|Relic|Ammo/)) {
      this.addIssue({
        severity: 'warning',
        category: 'Data Inconsistency',
        itemId: item.itemId,
        itemName: item.name,
        description: `Armor item with weapon slot: ${item.slot}`
      });
    }
  }

  private checkForDuplicates(): void {
    const itemIds = new Set<number>();
    const uniqueNames = new Set<string>();
    
    this.items.forEach(item => {
      // Check for duplicate IDs
      if (itemIds.has(item.itemId)) {
        this.addIssue({
          severity: 'error',
          category: 'Duplicate Data',
          itemId: item.itemId,
          itemName: item.name,
          description: 'Duplicate item ID found'
        });
      } else {
        itemIds.add(item.itemId);
      }

      // Check for duplicate names (less critical)
      if (uniqueNames.has(item.name)) {
        this.addIssue({
          severity: 'info',
          category: 'Duplicate Data',
          itemId: item.itemId,
          itemName: item.name,
          description: 'Duplicate item name found (may be intentional for different variants)'
        });
      } else {
        uniqueNames.add(item.name);
      }
    });
  }

  private generateStatistics(): Partial<ValidationReport> {
    const stats = {
      qualityDistribution: {} as Record<string, number>,
      slotDistribution: {} as Record<string, number>,
      sourceDistribution: {} as Record<string, number>,
      levelRangeDistribution: {} as Record<string, number>
    };

    let questItemsWithZeroLevel = 0;
    let missingIcons = 0;

    this.items.forEach(item => {
      // Quality distribution
      stats.qualityDistribution[item.quality] = (stats.qualityDistribution[item.quality] || 0) + 1;

      // Slot distribution
      stats.slotDistribution[item.slot] = (stats.slotDistribution[item.slot] || 0) + 1;

      // Source distribution
      const sourceCategory = item.source?.category || 'Unknown';
      stats.sourceDistribution[sourceCategory] = (stats.sourceDistribution[sourceCategory] || 0) + 1;

      // Level range distribution
      const levelRange = item.requiredLevel < 10 ? '1-9' :
                        item.requiredLevel < 20 ? '10-19' :
                        item.requiredLevel < 30 ? '20-29' :
                        item.requiredLevel < 40 ? '30-39' :
                        item.requiredLevel < 50 ? '40-49' :
                        item.requiredLevel < 60 ? '50-59' : '60';
      stats.levelRangeDistribution[levelRange] = (stats.levelRangeDistribution[levelRange] || 0) + 1;

      // Count specific issues
      if (item.source?.category === 'Quest' && item.requiredLevel === 0) {
        questItemsWithZeroLevel++;
      }
      if (!item.icon || item.icon.trim() === '') {
        missingIcons++;
      }
    });

    return {
      ...stats,
      summary: {
        questItemsWithZeroLevel,
        missingIcons
      }
    } as Partial<ValidationReport>;
  }

  async validate(): Promise<ValidationReport> {
    this.log('Starting data validation...');

    // Load data
    if (!this.loadItems()) {
      throw new Error('Failed to load items for validation');
    }

    this.loadQuestLevels();

    // Run validations
    this.log('Validating item structure and types...');
    let validItems = 0;

    this.items.forEach(item => {
      if (this.validateRequiredFields(item)) {
        this.validateFieldTypes(item);
        this.validateEnumFields(item);
        this.validateBusinessLogic(item);
        validItems++;
      }
    });

    this.log('Checking for duplicates...');
    this.checkForDuplicates();

    // Generate statistics
    this.log('Generating statistics...');
    const stats = this.generateStatistics();

    const errorCount = this.issues.filter(i => i.severity === 'error').length;
    const warningCount = this.issues.filter(i => i.severity === 'warning').length;
    const infoCount = this.issues.filter(i => i.severity === 'info').length;

    const report: ValidationReport = {
      summary: {
        totalItems: this.items.length,
        errors: errorCount,
        warnings: warningCount,
        infos: infoCount,
        validItems,
        questItemsWithZeroLevel: stats.summary?.questItemsWithZeroLevel || 0,
        missingIcons: stats.summary?.missingIcons || 0
      },
      issues: this.issues,
      qualityDistribution: stats.qualityDistribution || {},
      slotDistribution: stats.slotDistribution || {},
      sourceDistribution: stats.sourceDistribution || {},
      levelRangeDistribution: stats.levelRangeDistribution || {}
    };

    this.log('Validation complete');
    this.log(`Summary: ${this.items.length} items, ${errorCount} errors, ${warningCount} warnings`);

    return report;
  }

  generateReport(report: ValidationReport): string {
    const { summary } = report;
    
    return `
# Turtle WoW Data Validation Report
Generated: ${new Date().toISOString()}

## Summary Statistics
- **Total Items**: ${summary.totalItems}
- **Valid Items**: ${summary.validItems}
- **Errors**: ${summary.errors} ❌
- **Warnings**: ${summary.warnings} ⚠️
- **Info Messages**: ${summary.infos} ℹ️
- **Quest Items with Zero Level**: ${summary.questItemsWithZeroLevel}
- **Missing Icons**: ${summary.missingIcons}

## Data Quality Score
**${Math.round(((summary.totalItems - summary.errors) / summary.totalItems) * 100)}%** 
(${summary.totalItems - summary.errors}/${summary.totalItems} items without errors)

## Quality Distribution
${Object.entries(report.qualityDistribution)
  .sort(([,a], [,b]) => b - a)
  .map(([quality, count]) => `- **${quality}**: ${count}`)
  .join('\\n')}

## Slot Distribution  
${Object.entries(report.slotDistribution)
  .sort(([,a], [,b]) => b - a)
  .map(([slot, count]) => `- **${slot}**: ${count}`)
  .join('\\n')}

## Source Distribution
${Object.entries(report.sourceDistribution)
  .sort(([,a], [,b]) => b - a)
  .map(([source, count]) => `- **${source}**: ${count}`)
  .join('\\n')}

## Level Range Distribution
${Object.entries(report.levelRangeDistribution)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([range, count]) => `- **Level ${range}**: ${count}`)
  .join('\\n')}

## Issues Found

### Errors (${summary.errors})
${report.issues.filter(i => i.severity === 'error').slice(0, 20).map(issue => 
  `- **${issue.category}**: ${issue.description}${issue.itemName ? ` (${issue.itemName} - ID: ${issue.itemId})` : ''}`
).join('\\n')}
${report.issues.filter(i => i.severity === 'error').length > 20 ? 
  `... and ${report.issues.filter(i => i.severity === 'error').length - 20} more errors` : ''}

### Warnings (${summary.warnings})
${report.issues.filter(i => i.severity === 'warning').slice(0, 10).map(issue => 
  `- **${issue.category}**: ${issue.description}${issue.itemName ? ` (${issue.itemName} - ID: ${issue.itemId})` : ''}`
).join('\\n')}
${report.issues.filter(i => i.severity === 'warning').length > 10 ? 
  `... and ${report.issues.filter(i => i.severity === 'warning').length - 10} more warnings` : ''}

## Recommendations

${summary.errors > 0 ? '🔴 **Critical**: Fix all errors before using this data in production.' : ''}
${summary.questItemsWithZeroLevel > 0 ? `🟡 **Important**: ${summary.questItemsWithZeroLevel} quest items have requiredLevel: 0. Run quest level fetcher.` : ''}
${summary.missingIcons > 0 ? `🟡 **Cosmetic**: ${summary.missingIcons} items missing icons.` : ''}
${summary.warnings === 0 && summary.errors === 0 ? '✅ **Excellent**: No critical issues found!' : ''}

## Next Steps
1. Address all error-level issues
2. Consider fixing warning-level issues
3. Run quest level processing if needed
4. Re-validate after fixes
    `;
  }

  async run() {
    try {
      const report = await this.validate();
      
      // Save full report as JSON
      const reportPath = join(process.cwd(), 'turtle_db', 'validation-report.json');
      writeFileSync(reportPath, JSON.stringify(report, null, 2));
      
      // Generate and save markdown report
      const markdownReport = this.generateReport(report);
      const markdownPath = join(process.cwd(), 'turtle_db', 'validation-report.md');
      writeFileSync(markdownPath, markdownReport);
      
      this.log('Validation report saved to validation-report.json and validation-report.md');
      
      // Print summary to console
      console.log('\\n' + '='.repeat(60));
      console.log('VALIDATION SUMMARY');
      console.log('='.repeat(60));
      console.log(`📊 Total Items: ${report.summary.totalItems}`);
      console.log(`✅ Valid Items: ${report.summary.validItems}`);
      console.log(`❌ Errors: ${report.summary.errors}`);
      console.log(`⚠️  Warnings: ${report.summary.warnings}`);
      console.log(`📈 Data Quality: ${Math.round(((report.summary.totalItems - report.summary.errors) / report.summary.totalItems) * 100)}%`);
      
      if (report.summary.questItemsWithZeroLevel > 0) {
        console.log(`🔍 Quest items with zero level: ${report.summary.questItemsWithZeroLevel}`);
      }
      
      console.log('\\n📄 See validation-report.md for detailed analysis');
      
    } catch (error) {
      this.log(`Validation failed: ${error}`);
      throw error;
    }
  }
}

// Run the validator
const validator = new TurtleDataValidator();
validator.run().catch(console.error);