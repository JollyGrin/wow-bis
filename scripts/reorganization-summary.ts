import { readFileSync, readdirSync } from 'fs';

function generateSummary() {
  console.log('📊 Item Reorganization Summary\n');
  
  // Check original files
  const originalArmor = JSON.parse(readFileSync('turtle_db/processed-armor.json', 'utf-8'));
  const originalWeapons = JSON.parse(readFileSync('turtle_db/processed-weapons.json', 'utf-8'));
  const recoveredUnknown = JSON.parse(readFileSync('turtle_db/recovered-unknown.json', 'utf-8'));
  
  console.log(`📋 Original Data:`);
  console.log(`   Processed Armor: ${originalArmor.length} items`);
  console.log(`   Processed Weapons: ${originalWeapons.length} items`);
  console.log(`   Recovered Unknown: ${recoveredUnknown.length} items`);
  console.log(`   Total Original: ${originalArmor.length + originalWeapons.length + recoveredUnknown.length} items\n`);
  
  // Check reorganized files
  const armorFiles = readdirSync('turtle_db/items/armor').filter(f => f.endsWith('.json'));
  const weaponFiles = readdirSync('turtle_db/items/weapons').filter(f => f.endsWith('.json'));
  
  let totalArmorItems = 0;
  let totalWeaponItems = 0;
  
  console.log(`🛡️ Armor Categories (${armorFiles.length} files):`);
  for (const file of armorFiles.sort()) {
    const items = JSON.parse(readFileSync(`turtle_db/items/armor/${file}`, 'utf-8'));
    totalArmorItems += items.length;
    console.log(`   ${file.replace('.json', '')}: ${items.length} items`);
  }
  
  console.log(`\n⚔️ Weapon Categories (${weaponFiles.length} files):`);
  for (const file of weaponFiles.sort()) {
    const items = JSON.parse(readFileSync(`turtle_db/items/weapons/${file}`, 'utf-8'));
    totalWeaponItems += items.length;
    console.log(`   ${file.replace('.json', '')}: ${items.length} items`);
  }
  
  console.log(`\n📈 Summary:`);
  console.log(`   Total reorganized armor items: ${totalArmorItems}`);
  console.log(`   Total reorganized weapon items: ${totalWeaponItems}`);
  console.log(`   Total reorganized items: ${totalArmorItems + totalWeaponItems}`);
  console.log(`   Total category files created: ${armorFiles.length + weaponFiles.length}`);
  
  // Data integrity check
  const originalTotal = originalArmor.length + originalWeapons.length + recoveredUnknown.length;
  const reorganizedTotal = totalArmorItems + totalWeaponItems;
  const dataLoss = originalTotal - reorganizedTotal;
  
  console.log(`\n🔍 Data Integrity:`);
  console.log(`   Items processed: ${reorganizedTotal}/${originalTotal}`);
  if (dataLoss === 0) {
    console.log(`   ✅ No data loss detected!`);
  } else {
    console.log(`   ⚠️ ${dataLoss} items not categorized (saved in unknown.json files)`);
  }
}

generateSummary();