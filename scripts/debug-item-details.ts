import puppeteer from 'puppeteer';

async function debugItemDetails() {
  console.log('🔍 Debugging item detail extraction...');
  
  const browser = await puppeteer.launch({
    headless: false, // Show browser to see structure
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=VizDisplayCompositor',
      '--disable-web-security',
      '--disable-dev-shm-usage',
    ],
  });
  
  const page = await browser.newPage();
  
  // Apply stealth setup
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  );
  await page.setExtraHTTPHeaders({
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    Connection: 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
  });

  await page.setViewport({ width: 1920, height: 1080 });

  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5],
    });
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en'],
    });
    window.chrome = { runtime: {} };
  });
  
  // Test with an item that should have item level and sell price
  const itemId = 17182; // Sulfuras - should have item level and sell price
  const url = `https://database.turtle-wow.org/?item=${itemId}`;
  
  console.log(`📄 Loading: ${url}`);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Extract detailed structure for Quick Facts and other sections
  const structure = await page.evaluate(() => {
    const result: any = {
      title: document.title,
      quickFacts: null,
      infoboxes: [],
      allTables: [],
      pageText: document.body.textContent?.substring(0, 1000)
    };
    
    // Look for Quick Facts section specifically
    const quickFactsHeaders = Array.from(document.querySelectorAll('th')).find(th => 
      th.textContent?.includes('Quick Facts')
    );
    if (quickFactsHeaders) {
      const quickFactsTable = quickFactsHeaders.closest('table');
      if (quickFactsTable) {
        result.quickFacts = {
          html: quickFactsTable.outerHTML.substring(0, 1000),
          text: quickFactsTable.textContent?.substring(0, 500)
        };
      }
    }
    
    // Get all infobox tables
    document.querySelectorAll('table.infobox').forEach((table, idx) => {
      result.infoboxes.push({
        index: idx,
        text: table.textContent?.substring(0, 300),
        html: table.outerHTML.substring(0, 500)
      });
    });
    
    // Get all tables for reference
    document.querySelectorAll('table').forEach((table, idx) => {
      result.allTables.push({
        index: idx,
        classes: table.className,
        text: table.textContent?.substring(0, 200),
        firstCellText: table.querySelector('td')?.textContent?.substring(0, 100)
      });
    });
    
    return result;
  });
  
  console.log('📊 Quick Facts:');
  if (structure.quickFacts) {
    console.log('Text:', structure.quickFacts.text);
    console.log('HTML:', structure.quickFacts.html);
  } else {
    console.log('❌ No Quick Facts section found');
  }
  
  console.log('\n📊 Infoboxes found:', structure.infoboxes.length);
  structure.infoboxes.forEach((box, idx) => {
    console.log(`Infobox ${idx}:`, box.text?.substring(0, 150));
  });
  
  console.log('\n📊 All tables:');
  structure.allTables.forEach((table, idx) => {
    console.log(`Table ${idx} (${table.classes}):`, table.text?.substring(0, 100));
  });
  
  console.log('\n⏳ Browser window open for manual inspection...');
  await new Promise(resolve => setTimeout(resolve, 30000));
  
  await browser.close();
}

debugItemDetails().catch(console.error);