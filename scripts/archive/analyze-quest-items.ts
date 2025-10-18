import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface Quest {
  questId: number;
  name: string;
  faction: string;
}

interface ItemSource {
  category: string;
  quests?: Quest[];
}

interface Item {
  itemId: number;
  name: string;
  itemLevel: number;
  requiredLevel: number;
  slot: string;
  source?: ItemSource;
  quality: string;
}

// Read items.json
const itemsPath = join(process.cwd(), 'public', 'items.json');
const items: Item[] = JSON.parse(readFileSync(itemsPath, 'utf-8'));

// Find all quest reward items with requiredLevel: 0
const questItemsWithZeroLevel = items.filter(item => 
  item.source?.category === 'Quest' && 
  (item.requiredLevel === 0 || !item.requiredLevel)
);

// Group by quest
const questMap = new Map<number, { quest: Quest; items: Item[] }>();

questItemsWithZeroLevel.forEach(item => {
  if (item.source?.quests) {
    item.source.quests.forEach(quest => {
      if (!questMap.has(quest.questId)) {
        questMap.set(quest.questId, { quest, items: [] });
      }
      questMap.get(quest.questId)!.items.push(item);
    });
  }
});

// Sort quests by number of affected items
const sortedQuests = Array.from(questMap.entries())
  .sort((a, b) => b[1].items.length - a[1].items.length);

// Generate report
console.log(`Found ${questItemsWithZeroLevel.length} quest reward items with requiredLevel: 0`);
console.log(`These items come from ${questMap.size} unique quests\n`);

console.log('Top 20 quests with the most affected items:');
console.log('='.repeat(80));

sortedQuests.slice(0, 20).forEach(([questId, { quest, items }]) => {
  console.log(`\nQuest: ${quest.name} (ID: ${questId}) - ${quest.faction}`);
  console.log(`Affected items (${items.length}):`);
  items.forEach(item => {
    console.log(`  - ${item.name} (ID: ${item.itemId}) - ${item.quality} ${item.slot} - iLvl: ${item.itemLevel}`);
  });
});

// Create a CSV for easier analysis
const csvContent = [
  'Quest ID,Quest Name,Faction,Item ID,Item Name,Item Level,Quality,Slot',
  ...sortedQuests.flatMap(([questId, { quest, items }]) => 
    items.map(item => 
      `${questId},"${quest.name}",${quest.faction},${item.itemId},"${item.name}",${item.itemLevel},${item.quality},"${item.slot}"`
    )
  )
].join('\n');

writeFileSync('quest-items-analysis.csv', csvContent);
console.log('\nDetailed analysis saved to quest-items-analysis.csv');

// Create a JSON file with quest IDs for potential scraping
const questIds = Array.from(questMap.keys()).sort((a, b) => a - b);
writeFileSync('quest-ids-to-fetch.json', JSON.stringify(questIds, null, 2));
console.log(`Quest IDs saved to quest-ids-to-fetch.json (${questIds.length} quests)`);