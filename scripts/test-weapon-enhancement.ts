import puppeteer, { Browser, Page } from 'puppeteer';
import { readFileSync } from 'fs';
import { Item } from './item-extractor';

async function testWeaponEnhancement() {
  console.log('🧪 Testing weapon enhancement on sample items...');
  
  // Read a few sample weapons from the 1h-axes file
  const weaponsFile = 'turtle_db/items/weapons/1h-axes.json';
  let weapons: Item[];
  
  try {
    weapons = JSON.parse(readFileSync(weaponsFile, 'utf-8'));
  } catch (error) {
    console.error('❌ Failed to read weapons file:', error);
    return;
  }
  
  // Test on first 3 weapons
  const testWeapons = weapons.slice(0, 3);
  console.log(`📊 Testing on ${testWeapons.length} weapons:`);
  testWeapons.forEach(w => console.log(`  - ${w.name} (ID: ${w.itemId})`));

  const browser = await puppeteer.launch({
    headless: false, // Use false to see what's happening
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  );

  for (const weapon of testWeapons) {
    console.log(`\n🔍 Testing weapon: ${weapon.name} (ID: ${weapon.itemId})`);
    
    try {
      const url = `https://database.turtle-wow.org/?item=${weapon.itemId}`;
      console.log(`   🌐 Navigating to: ${url}`);
      
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Extract weapon data
      const weaponData = await page.evaluate(() => {
        // Look for the main item tooltip table
        const tooltipDiv = document.querySelector('.tooltip') || document.querySelector('[id*="tooltip"]');
        const allTables = document.querySelectorAll('table');
        const itemTable = tooltipDiv?.querySelector('table') || allTables[1] || allTables[0];
        
        if (!itemTable) {
          return { error: 'No item table found' };
        }
        
        const tableText = itemTable.textContent || '';
        const tableHTML = itemTable.innerHTML || '';
        
        console.log('Table text preview:', tableText.substring(0, 500));
        
        let speed: number | undefined;
        let dps: number | undefined;
        
        // Extract weapon speed - look for "Speed X.XX"
        const speedMatch = tableText.match(/Speed\s+(\d+\.?\d*)/i);
        if (speedMatch) {
          speed = parseFloat(speedMatch[1]);
          console.log('Found speed:', speed);
        } else {
          console.log('Speed not found. Looking for speed patterns in text:', tableText.match(/speed/gi));
        }
        
        // Extract DPS - look for "(X.X damage per second)" or similar patterns
        const dpsMatch = tableText.match(/\((\d+\.?\d*)\s+damage\s+per\s+second\)/i);
        if (dpsMatch) {
          dps = parseFloat(dpsMatch[1]);
          console.log('Found DPS:', dps);
        } else {
          console.log('DPS not found. Looking for damage per second patterns:', tableText.match(/damage.*second/gi));
        }
        
        // Debug: Return raw text to see what we're working with
        return { 
          speed, 
          dps, 
          tableTextPreview: tableText.substring(0, 1000),
          speedRegexTest: tableText.match(/Speed\s+(\d+\.?\d*)/gi),
          dpsRegexTest: tableText.match(/\(.*damage.*per.*second.*\)/gi)
        };
      });

      console.log(`   📊 Results:`, weaponData);
      
      if (weaponData.speed !== undefined || weaponData.dps !== undefined) {
        console.log(`   ✅ SUCCESS - Speed: ${weaponData.speed}, DPS: ${weaponData.dps}`);
      } else {
        console.log(`   ⚠️ No speed/DPS found`);
        console.log(`   📝 Table preview:`, weaponData.tableTextPreview?.substring(0, 200));
      }
      
    } catch (error) {
      console.error(`   ❌ Error testing ${weapon.name}:`, error);
    }
    
    // Wait between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  await browser.close();
  console.log('\n🧪 Test complete!');
}

if (require.main === module) {
  testWeaponEnhancement().catch(console.error);
}