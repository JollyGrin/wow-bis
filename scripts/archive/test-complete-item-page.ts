import puppeteer from 'puppeteer';

async function testCompleteItemPage() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    const itemId = 16977; // Warsong Boots
    const url = `https://database.turtle-wow.org/?item=${itemId}`;
    
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Scroll down to load any lazy content
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const fullPageData = await page.evaluate(() => {
      // Get item name and quality
      const nameElem = document.querySelector('h1');
      const name = nameElem?.textContent?.trim().replace(' - Items', '').trim() || '';
      const qualityClass = nameElem?.className.match(/q\d/)?.[0] || 'q1';
      
      // Get icon
      const iconElem = document.querySelector('table img');
      const iconSrc = iconElem?.getAttribute('src') || '';
      const iconMatch = iconSrc.match(/icons\/[a-z]+\/([^.]+)/i);
      const icon = iconMatch?.[1] || '';
      
      // Parse the item table for all details
      const itemTable = document.querySelector('table');
      const tableData: any = {
        slot: '',
        subclass: '',
        armor: '',
        stats: [],
        requiredLevel: 0,
        durability: '',
        binding: ''
      };
      
      if (itemTable) {
        const rows = itemTable.querySelectorAll('tr');
        rows.forEach(row => {
          const text = row.textContent?.trim() || '';
          
          // Slot and subclass (first non-empty row usually)
          if (text.match(/^(Feet|Head|Chest|etc)/)) {
            const parts = text.split(/\s{2,}/);
            tableData.slot = parts[0] || '';
            tableData.subclass = parts[1] || '';
          }
          
          // Armor value
          if (text.includes('Armor') && text.match(/\\d+/)) {
            tableData.armor = text;
          }
          
          // Stats (+X Stat)
          if (text.match(/\\+\\d+\\s+\\w+/)) {
            tableData.stats.push(text);
          }
          
          // Durability
          if (text.includes('Durability')) {
            tableData.durability = text;
          }
          
          // Binding
          if (text.includes('Binds when') || text.includes('Soulbound')) {
            tableData.binding = text;
          }
          
          // Required level
          if (text.includes('Requires Level')) {
            const match = text.match(/Requires Level (\\d+)/);
            tableData.requiredLevel = match ? parseInt(match[1]) : 0;
          }
        });
      }
      
      // Check for all possible section headers
      const allHeaders = Array.from(document.querySelectorAll('h1, h2, h3, h4, .heading-size-1, .heading-size-2, .heading-size-3'));
      const sections = allHeaders.map(h => h.textContent?.trim()).filter(Boolean);
      
      // Check specifically for quest rewards
      const questSection = allHeaders.find(h => 
        h.textContent?.includes('Reward from') ||
        h.textContent?.includes('Quest reward') ||
        h.textContent?.includes('Reward')
      );
      
      const dropSection = allHeaders.find(h => 
        h.textContent?.includes('Dropped by') ||
        h.textContent?.includes('Drop')
      );
      
      // Get all links to see if there are quest links anywhere
      const allLinks = Array.from(document.querySelectorAll('a[href*="quest="]'));
      const questLinks = allLinks.map(link => ({
        href: link.getAttribute('href'),
        text: link.textContent?.trim()
      }));
      
      return {
        name,
        quality: qualityClass,
        icon,
        tableData,
        sections,
        hasQuestSection: !!questSection,
        hasDropSection: !!dropSection,
        questLinks,
        fullHTML: document.body.innerHTML.substring(0, 1000) // Just a snippet for debugging
      };
    });
    
    console.log('Complete item data:');
    console.log(JSON.stringify(fullPageData, null, 2));
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
}

testCompleteItemPage();