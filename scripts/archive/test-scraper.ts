import puppeteer from 'puppeteer';

// Quick test to verify Puppeteer can access the Turtle WoW database
async function testScraper() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    console.log('Testing connection to Turtle WoW database...');
    
    // Test 1: Can we access the weapons list?
    console.log('\nTest 1: Accessing weapons list...');
    const weaponsUrl = 'https://database.turtle-wow.org/?items=2';
    const response1 = await page.goto(weaponsUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    console.log(`Weapons page status: ${response1?.status()}`);
    
    // Wait for the list to load
    try {
      await page.waitForSelector('.listview-row', { timeout: 10000 });
    } catch (e) {
      console.log('Could not find .listview-row, checking page structure...');
      
      // Debug: save screenshot and HTML
      await page.screenshot({ path: 'debug-page.png' });
      const bodyHTML = await page.evaluate(() => document.body.innerHTML);
      console.log('Page HTML snippet:', bodyHTML.substring(0, 500));
    }
    
    // Check if we can find item links
    const weaponCount = await page.evaluate(() => {
      const links = document.querySelectorAll('a[href*="item="]');
      return links.length;
    });
    console.log(`Found ${weaponCount} weapon links on first page`);
    
    // Test 2: Extract item data from list page
    console.log('\nTest 2: Extracting item data from list...');
    const itemsData = await page.evaluate(() => {
      const items: any[] = [];
      // Look for table rows containing items
      const rows = document.querySelectorAll('table tr');
      
      // Get first 5 items as example
      let itemCount = 0;
      for (const row of rows) {
        if (itemCount >= 5) break;
        
        const link = row.querySelector('a[href*="?item="]');
        if (link) {
          const nameCell = link.closest('td');
          const href = link.getAttribute('href') || '';
          const itemId = href.match(/item=(\d+)/)?.[1];
          const name = link.textContent?.trim();
          
          // Get other cells in the same row
          const cells = row.querySelectorAll('td');
          let level = '';
          let reqLevel = '';
          
          // Find level and req level columns
          cells.forEach((cell, index) => {
            const text = cell.textContent?.trim() || '';
            // Level column usually contains just numbers
            if (index > 0 && /^\d+$/.test(text)) {
              if (!level) level = text;
              else if (!reqLevel) reqLevel = text;
            }
          });
          
          items.push({
            itemId,
            name,
            level,
            reqLevel,
            href
          });
          itemCount++;
        }
      }
      
      return items;
    });
    
    console.log('Sample items from list:');
    itemsData.forEach(item => {
      console.log(`  - ${item.name} (ID: ${item.itemId}, Level: ${item.level})`);
    });
    
    // Test accessing item through click simulation
    console.log('\nTest 2b: Testing tooltip hover...');
    if (itemsData.length > 0) {
      const firstItemLink = `a[href*="item=${itemsData[0].itemId}"]`;
      await page.hover(firstItemLink);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const tooltipExists = await page.evaluate(() => {
        return !!document.querySelector('.wowhead-tooltip');
      });
      console.log(`Tooltip appears on hover: ${tooltipExists}`);
    }
    
    // Test 3: Check rate limiting
    console.log('\nTest 3: Testing multiple requests...');
    for (let i = 0; i < 3; i++) {
      const start = Date.now();
      await page.goto(`https://database.turtle-wow.org/?item=${16977 + i}`, { waitUntil: 'networkidle2' });
      const elapsed = Date.now() - start;
      console.log(`Request ${i + 1} took ${elapsed}ms`);
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    console.log('\nAll tests completed successfully!');
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
}

testScraper();