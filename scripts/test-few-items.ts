import puppeteer from 'puppeteer';

async function testItemExtraction() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Test with a few different items
    const testItems = [
      16798, // Arcanist Robes (quest reward)
      16977, // Warsong Boots (quest reward) 
      17064  // Another item to test
    ];
    
    for (const itemId of testItems) {
      console.log(`\n=== Testing Item ${itemId} ===`);
      
      const url = `https://database.turtle-wow.org/?item=${itemId}`;
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const itemData = await page.evaluate((itemId) => {
        const nameElem = document.querySelector('h1') || document.querySelector('.heading-size-1');
        const name = nameElem?.textContent?.trim().replace(' - Items', '').trim() || '';
        const qualityClass = nameElem?.className.match(/q\d/)?.[0] || 'q1';
        
        // Get icon
        const iconElem = document.querySelector('table img');
        const iconSrc = iconElem?.getAttribute('src') || '';
        const iconMatch = iconSrc.match(/icons\/[a-z]+\/([^.]+)/i);
        const icon = iconMatch?.[1] || '';
        
        // Get basic stats from table
        const tableText = document.querySelector('table')?.textContent || '';
        const reqLevelMatch = tableText.match(/Requires Level (\d+)/);
        const requiredLevel = reqLevelMatch ? parseInt(reqLevelMatch[1]) : 0;
        
        // Check for quest source
        const questSection = Array.from(document.querySelectorAll('h2, h3'))
          .find(h => h.textContent?.includes('Reward from'));
        let hasQuests = false;
        let questCount = 0;
        
        if (questSection && questSection.nextElementSibling) {
          hasQuests = true;
          const questLinks = questSection.nextElementSibling.querySelectorAll('a[href*="?quest="]');
          questCount = questLinks.length;
        }
        
        return {
          itemId,
          name,
          icon,
          quality: qualityClass,
          requiredLevel,
          hasQuests,
          questCount
        };
      }, itemId);
      
      console.log(`Name: ${itemData.name}`);
      console.log(`Icon: ${itemData.icon}`);
      console.log(`Quality: ${itemData.quality}`);
      console.log(`Required Level: ${itemData.requiredLevel}`);
      console.log(`Has Quests: ${itemData.hasQuests} (${itemData.questCount} quests)`);
    }
    
    console.log('\nTest completed successfully!');
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
}

testItemExtraction();