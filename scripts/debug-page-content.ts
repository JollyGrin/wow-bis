import puppeteer from 'puppeteer';

async function debugPageContent() {
  console.log('🔍 Debugging page content for item extraction...');
  
  const browser = await puppeteer.launch({
    headless: false, // Show browser to see what's happening
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
  await page.setViewport({ width: 1920, height: 1080 });
  
  // Test with Sulfuras (should be legendary)
  const itemId = 17182;
  const url = `https://database.turtle-wow.org/?item=${itemId}`;
  
  console.log(`📄 Loading: ${url}`);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Extract basic page structure to understand what we're working with
  const pageInfo = await page.evaluate(() => {
    const result = {
      title: document.title,
      h1Text: document.querySelector('h1')?.textContent || 'No H1 found',
      h1Classes: document.querySelector('h1')?.className || 'No classes',
      tableCount: document.querySelectorAll('table').length,
      hasItemTable: !!document.querySelector('table'),
      pageText: document.body.textContent?.substring(0, 500) || 'No body text'
    };
    
    // Get first table content if it exists
    const firstTable = document.querySelector('table');
    if (firstTable) {
      result.firstTableText = firstTable.textContent?.substring(0, 300) || 'No table text';
    }
    
    // Check for quality indicators
    const h1 = document.querySelector('h1');
    if (h1) {
      result.h1Style = h1.style.cssText || 'No inline styles';
      result.h1ComputedColor = window.getComputedStyle(h1).color || 'No computed color';
    }
    
    return result;
  });
  
  console.log('📊 Page Analysis:');
  console.log('  Title:', pageInfo.title);
  console.log('  H1 Text:', pageInfo.h1Text);
  console.log('  H1 Classes:', pageInfo.h1Classes);  
  console.log('  H1 Style:', pageInfo.h1Style);
  console.log('  H1 Color:', pageInfo.h1ComputedColor);
  console.log('  Table Count:', pageInfo.tableCount);
  console.log('  First 300 chars of table:', pageInfo.firstTableText?.substring(0, 300));
  console.log('  First 500 chars of page:', pageInfo.pageText?.substring(0, 500));
  
  // Wait for manual inspection
  console.log('\n⏳ Browser window is open - inspect the page manually, then press Enter to continue...');
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.on('data', () => {
    browser.close();
    process.exit(0);
  });
}

debugPageContent().catch(console.error);