import puppeteer from 'puppeteer';

async function debugItemAccess() {
  const browser = await puppeteer.launch({
    headless: false, // Show browser for debugging
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Test the Warsong Boots specifically
    const itemId = 16977;
    const url = `https://database.turtle-wow.org/?item=${itemId}`;
    
    console.log(`Testing access to: ${url}`);
    
    const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    console.log(`Response status: ${response?.status()}`);
    console.log(`Final URL: ${page.url()}`);
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check page title and basic structure
    const pageInfo = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        hasH1: !!document.querySelector('h1'),
        h1Text: document.querySelector('h1')?.textContent,
        bodySnippet: document.body.textContent?.substring(0, 200)
      };
    });
    
    console.log('Page info:', JSON.stringify(pageInfo, null, 2));
    
    // Take a screenshot for manual inspection
    await page.screenshot({ path: 'debug-warsong-boots.png' });
    console.log('Screenshot saved to debug-warsong-boots.png');
    
    // Wait for manual inspection
    console.log('Waiting 10 seconds for manual inspection...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
  } catch (error) {
    console.error('Debug failed:', error);
  } finally {
    await browser.close();
  }
}

debugItemAccess();