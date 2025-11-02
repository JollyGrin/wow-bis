import { readFileSync, writeFileSync, existsSync } from 'fs';
import { CATEGORY_CONFIG, CategoryId } from './constants';

interface Item {
  itemId: number;
  name: string;
  slot: string;
  subclass: string;
  class: string;
  [key: string]: any;
}

interface CategoryMapping {
  [slot: string]: {
    [subclass: string]: string;
  };
}

class ItemReorganizer {
  private categoryMapping: CategoryMapping;
  
  constructor() {
    this.categoryMapping = this.buildCategoryMapping();
  }

  private buildCategoryMapping(): CategoryMapping {
    return {
      // Weapons
      "Main Hand": {
        "Axe": "1h-axes",
        "axe": "1h-axes",
        "Mace": "1h-maces",
        "mace": "1h-maces", 
        "Sword": "1h-swords",
        "sword": "1h-swords",
        "Dagger": "daggers",
        "dagger": "daggers",
        "Fist Weapon": "fist",
        "fist": "fist",
        "Wand": "wands",
        "wand": "wands"
      },
      "One-hand": {
        "Axe": "1h-axes",
        "axe": "1h-axes",
        "Mace": "1h-maces", 
        "mace": "1h-maces",
        "Sword": "1h-swords",
        "sword": "1h-swords",
        "Dagger": "daggers",
        "dagger": "daggers",
        "Fist Weapon": "fist",
        "fist": "fist"
      },
      "Two-hand": {
        "Axe": "2h-axes",
        "axe": "2h-axes", 
        "Mace": "2h-maces",
        "mace": "2h-maces",
        "Sword": "2h-swords",
        "sword": "2h-swords",
        "Staff": "staves",
        "staff": "staves",
        "Polearm": "polearms",
        "polearm": "polearms"
      },
      "Ranged": {
        "Bow": "bows",
        "bow": "bows",
        "Gun": "guns", 
        "gun": "guns",
        "Crossbow": "crossbows",
        "crossbow": "crossbows",
        "Thrown": "thrown",
        "thrown": "thrown",
        "Fishing Pole": "fishing-poles",
        "fishing": "fishing-poles"
      },

      // Armor by slot
      "Head": {
        "Cloth": "cloth-head",
        "cloth": "cloth-head",
        "Leather": "leather-head", 
        "leather": "leather-head",
        "Mail": "mail-head",
        "mail": "mail-head",
        "Plate": "plate-head",
        "plate": "plate-head"
      },
      "Shoulder": {
        "Cloth": "cloth-shoulder",
        "cloth": "cloth-shoulder", 
        "Leather": "leather-shoulder",
        "leather": "leather-shoulder",
        "Mail": "mail-shoulder",
        "mail": "mail-shoulder",
        "Plate": "plate-shoulder", 
        "plate": "plate-shoulder"
      },
      "Chest": {
        "Cloth": "cloth-chest",
        "cloth": "cloth-chest",
        "Leather": "leather-chest",
        "leather": "leather-chest", 
        "Mail": "mail-chest",
        "mail": "mail-chest",
        "Plate": "plate-chest",
        "plate": "plate-chest"
      },
      "Waist": {
        "Cloth": "cloth-waist",
        "cloth": "cloth-waist",
        "Leather": "leather-waist",
        "leather": "leather-waist",
        "Mail": "mail-waist", 
        "mail": "mail-waist",
        "Plate": "plate-waist",
        "plate": "plate-waist"
      },
      "Legs": {
        "Cloth": "cloth-legs",
        "cloth": "cloth-legs",
        "Leather": "leather-legs",
        "leather": "leather-legs",
        "Mail": "mail-legs",
        "mail": "mail-legs", 
        "Plate": "plate-legs",
        "plate": "plate-legs"
      },
      "Feet": {
        "Cloth": "cloth-feet",
        "cloth": "cloth-feet",
        "Leather": "leather-feet",
        "leather": "leather-feet",
        "Mail": "mail-feet",
        "mail": "mail-feet",
        "Plate": "plate-feet",
        "plate": "plate-feet"
      },
      "Wrist": {
        "Cloth": "cloth-wrist", 
        "cloth": "cloth-wrist",
        "Leather": "leather-wrist",
        "leather": "leather-wrist",
        "Mail": "mail-wrist",
        "mail": "mail-wrist",
        "Plate": "plate-wrist",
        "plate": "plate-wrist"
      },
      "Hands": {
        "Cloth": "cloth-hands",
        "cloth": "cloth-hands",
        "Leather": "leather-hands", 
        "leather": "leather-hands",
        "Mail": "mail-hands",
        "mail": "mail-hands",
        "Plate": "plate-hands",
        "plate": "plate-hands"
      },

      // Accessories and other armor
      "Neck": {
        "Armor": "amulets"
      },
      "Finger": {
        "Armor": "rings"
      },
      "Trinket": {
        "Armor": "trinkets"
      },
      "Back": {
        "Armor": "cloaks"
      },
      "Shield": {
        "Armor": "shields",
        "Shield": "shields"
      },
      "Off Hand": {
        "Armor": "shields",
        "Shield": "shields"
      },

      // Handle lowercase variants
      "neck": { "Armor": "amulets" },
      "finger": { "Armor": "rings" },
      "back": { "Armor": "cloaks" },
      "shield": { "Armor": "shields", "Shield": "shields" },
      "head": { "Cloth": "cloth-head", "Leather": "leather-head", "Mail": "mail-head", "Plate": "plate-head" },
      "feet": { "Cloth": "cloth-feet", "Leather": "leather-feet", "Mail": "mail-feet", "Plate": "plate-feet" },
      "relic": { "Armor": "trinkets" }
    };
  }

  private getCategoryForItem(item: Item): string | null {
    const slot = item.slot;
    const subclass = item.subclass;
    
    if (this.categoryMapping[slot] && this.categoryMapping[slot][subclass]) {
      return this.categoryMapping[slot][subclass];
    }
    
    // Special handling for some edge cases
    if (item.class === "Weapon") {
      if (subclass.toLowerCase().includes("axe")) {
        return slot === "Two-hand" ? "2h-axes" : "1h-axes";
      }
      if (subclass.toLowerCase().includes("mace")) {
        return slot === "Two-hand" ? "2h-maces" : "1h-maces";
      }
      if (subclass.toLowerCase().includes("sword")) {
        return slot === "Two-hand" ? "2h-swords" : "1h-swords";
      }
    }
    
    // Fallback mappings for armor with weird subclasses
    if (item.class === "Armor") {
      // All cloaks/back items should go to cloaks regardless of subclass
      if (slot === "Back" || slot === "back") {
        return "cloaks";
      }
      
      // All necks should go to amulets regardless of subclass
      if (slot === "Neck" || slot === "neck") {
        return "amulets";
      }
      
      // All rings should go to rings regardless of subclass
      if (slot === "Finger" || slot === "finger") {
        return "rings";
      }
      
      // All trinkets should go to trinkets regardless of subclass
      if (slot === "Trinket") {
        return "trinkets";
      }
      
      // All shields should go to shields regardless of subclass
      if (slot === "Shield" || slot === "shield" || slot === "Off Hand") {
        return "shields";
      }
      
      // Relics go to trinkets as fallback
      if (slot === "Relic" || slot === "relic") {
        return "trinkets";
      }
      
      // Handle cloth armor with different slot names
      if (slot === "Head" || slot === "head") {
        return subclass.toLowerCase().includes("cloth") ? "cloth-head" :
               subclass.toLowerCase().includes("leather") ? "leather-head" :
               subclass.toLowerCase().includes("mail") ? "mail-head" :
               subclass.toLowerCase().includes("plate") ? "plate-head" : "cloth-head"; // fallback
      }
      
      if (slot === "Shoulder") {
        return subclass.toLowerCase().includes("cloth") ? "cloth-shoulder" :
               subclass.toLowerCase().includes("leather") ? "leather-shoulder" :
               subclass.toLowerCase().includes("mail") ? "mail-shoulder" :
               subclass.toLowerCase().includes("plate") ? "plate-shoulder" : "cloth-shoulder";
      }
      
      if (slot === "Chest") {
        return subclass.toLowerCase().includes("cloth") ? "cloth-chest" :
               subclass.toLowerCase().includes("leather") ? "leather-chest" :
               subclass.toLowerCase().includes("mail") ? "mail-chest" :
               subclass.toLowerCase().includes("plate") ? "plate-chest" : "cloth-chest";
      }
      
      if (slot === "Waist") {
        return subclass.toLowerCase().includes("cloth") ? "cloth-waist" :
               subclass.toLowerCase().includes("leather") ? "leather-waist" :
               subclass.toLowerCase().includes("mail") ? "mail-waist" :
               subclass.toLowerCase().includes("plate") ? "plate-waist" : "cloth-waist";
      }
      
      if (slot === "Legs") {
        return subclass.toLowerCase().includes("cloth") ? "cloth-legs" :
               subclass.toLowerCase().includes("leather") ? "leather-legs" :
               subclass.toLowerCase().includes("mail") ? "mail-legs" :
               subclass.toLowerCase().includes("plate") ? "plate-legs" : "cloth-legs";
      }
      
      if (slot === "Feet" || slot === "feet") {
        return subclass.toLowerCase().includes("cloth") ? "cloth-feet" :
               subclass.toLowerCase().includes("leather") ? "leather-feet" :
               subclass.toLowerCase().includes("mail") ? "mail-feet" :
               subclass.toLowerCase().includes("plate") ? "plate-feet" : "cloth-feet";
      }
      
      if (slot === "Wrist") {
        return subclass.toLowerCase().includes("cloth") ? "cloth-wrist" :
               subclass.toLowerCase().includes("leather") ? "leather-wrist" :
               subclass.toLowerCase().includes("mail") ? "mail-wrist" :
               subclass.toLowerCase().includes("plate") ? "plate-wrist" : "cloth-wrist";
      }
      
      if (slot === "Hands") {
        return subclass.toLowerCase().includes("cloth") ? "cloth-hands" :
               subclass.toLowerCase().includes("leather") ? "leather-hands" :
               subclass.toLowerCase().includes("mail") ? "mail-hands" :
               subclass.toLowerCase().includes("plate") ? "plate-hands" : "cloth-hands";
      }
    }
    
    return null;
  }

  private loadItems(filename: string): Item[] {
    if (!existsSync(filename)) {
      console.log(`⚠️ File ${filename} does not exist`);
      return [];
    }
    
    try {
      const data = JSON.parse(readFileSync(filename, 'utf-8'));
      console.log(`📦 Loaded ${data.length} items from ${filename}`);
      return data;
    } catch (e) {
      console.error(`❌ Failed to load ${filename}:`, e);
      return [];
    }
  }

  private saveItemsByCategory(items: Item[], type: 'weapons' | 'armor') {
    const categorizedItems: { [category: string]: Item[] } = {};
    const unknownItems: Item[] = [];
    
    // Group items by category
    for (const item of items) {
      const category = this.getCategoryForItem(item);
      if (category) {
        if (!categorizedItems[category]) {
          categorizedItems[category] = [];
        }
        categorizedItems[category].push(item);
      } else {
        unknownItems.push(item);
        console.log(`❓ Unknown category for item ${item.itemId} (${item.name}): slot=${item.slot}, subclass=${item.subclass}, class=${item.class}`);
      }
    }
    
    // Save each category
    const savedCategories = [];
    for (const [category, categoryItems] of Object.entries(categorizedItems)) {
      const filename = `turtle_db/items/${type}/${category}.json`;
      try {
        writeFileSync(filename, JSON.stringify(categoryItems, null, 2));
        console.log(`💾 Saved ${categoryItems.length} items to ${filename}`);
        savedCategories.push(category);
      } catch (e) {
        console.error(`❌ Failed to save ${filename}:`, e);
      }
    }
    
    // Save unknown items if any
    if (unknownItems.length > 0) {
      const unknownFilename = `turtle_db/items/${type}/unknown.json`;
      try {
        writeFileSync(unknownFilename, JSON.stringify(unknownItems, null, 2));
        console.log(`⚠️ Saved ${unknownItems.length} unknown items to ${unknownFilename}`);
      } catch (e) {
        console.error(`❌ Failed to save unknown items:`, e);
      }
    }
    
    return { savedCategories, unknownCount: unknownItems.length };
  }

  async reorganizeItems() {
    console.log('🚀 Starting item reorganization...\n');
    
    // Load recovered-unknown items and categorize them
    console.log('📦 Processing recovered unknown items...');
    const recoveredUnknown = this.loadItems('turtle_db/recovered-unknown.json');
    const recoveredWeapons: Item[] = [];
    const recoveredArmor: Item[] = [];
    
    for (const item of recoveredUnknown) {
      if (item.class === 'Weapon') {
        recoveredWeapons.push(item);
      } else if (item.class === 'Armor') {
        recoveredArmor.push(item);
      }
    }
    
    console.log(`📊 Categorized recovered items: ${recoveredWeapons.length} weapons, ${recoveredArmor.length} armor`);
    
    // Load and process armor
    console.log('\n📦 Processing armor items...');
    const armorItems = this.loadItems('turtle_db/processed-armor.json');
    const existingRecoveredArmor = this.loadItems('turtle_db/recovered-armor.json');
    const allArmor = [...armorItems, ...existingRecoveredArmor, ...recoveredArmor];
    
    if (allArmor.length > 0) {
      const armorResult = this.saveItemsByCategory(allArmor, 'armor');
      console.log(`✅ Armor reorganization complete: ${armorResult.savedCategories.length} categories, ${armorResult.unknownCount} unknown items`);
    }
    
    console.log('\n📦 Processing weapon items...');
    const weaponItems = this.loadItems('turtle_db/processed-weapons.json');
    const existingRecoveredWeapons = this.loadItems('turtle_db/recovered-weapons.json');
    const allWeapons = [...weaponItems, ...existingRecoveredWeapons, ...recoveredWeapons];
    
    if (allWeapons.length > 0) {
      const weaponResult = this.saveItemsByCategory(allWeapons, 'weapons');
      console.log(`✅ Weapon reorganization complete: ${weaponResult.savedCategories.length} categories, ${weaponResult.unknownCount} unknown items`);
    }
    
    console.log('\n🎉 Item reorganization complete!');
  }
}

async function main() {
  const reorganizer = new ItemReorganizer();
  await reorganizer.reorganizeItems();
}

if (require.main === module) {
  main().catch(console.error);
}