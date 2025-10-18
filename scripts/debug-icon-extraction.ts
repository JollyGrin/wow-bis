import puppeteer from 'puppeteer';

async function debugIconExtraction() {
  console.log('🔍 Debugging icon extraction...');
  
  const browser = await puppeteer.launch({
    headless: false, // Show browser to see what's happening
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
  
  // Test with Axe of the Deep Woods
  const itemId = 811;
  const url = `https://database.turtle-wow.org/?item=${itemId}`;
  
  console.log(`📄 Loading: ${url}`);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Extract icon information
  const iconInfo = await page.evaluate(() => {
    const result: any = {
      allImages: [],
      tableImages: [],
      iconImages: []
    };
    
    // Get all images on the page
    document.querySelectorAll('img').forEach((img, idx) => {
      result.allImages.push({
        index: idx,
        src: img.getAttribute('src'),
        alt: img.getAttribute('alt'),
        className: img.className,
        parentTag: img.parentElement?.tagName
      });
    });
    
    // Get images specifically in tables
    document.querySelectorAll('table img').forEach((img, idx) => {
      result.tableImages.push({
        index: idx,
        src: img.getAttribute('src'),
        alt: img.getAttribute('alt'),
        className: img.className
      });
    });
    
    // Get images with "icons" in the src
    document.querySelectorAll('img[src*="icons"]').forEach((img, idx) => {
      result.iconImages.push({
        index: idx,
        src: img.getAttribute('src'),
        alt: img.getAttribute('alt'),
        className: img.className
      });
    });
    
    // Test the current extraction logic
    const iconElem = document.querySelector('table img') || document.querySelector('img[src*="icons"]');
    if (iconElem) {
      const iconSrc = iconElem.getAttribute('src') || '';
      const iconMatch = iconSrc.match(/icons\/[a-z]+\/([^.]+)/i) || iconSrc.match(/([^\/]+)\.jpg$/i);
      result.currentExtraction = {
        src: iconSrc,
        match: iconMatch,
        icon: iconMatch?.[1] || ''
      };
    } else {
      result.currentExtraction = { error: 'No icon element found' };
    }
    
    return result;
  });
  
  console.log('📊 Icon Analysis:');
  console.log('All images found:', iconInfo.allImages.length);
  iconInfo.allImages.forEach((img, idx) => {
    console.log(`  Image ${idx}: ${img.src} (parent: ${img.parentTag})`);
  });
  
  console.log('\nTable images:', iconInfo.tableImages.length);
  iconInfo.tableImages.forEach((img, idx) => {
    console.log(`  Table Image ${idx}: ${img.src}`);
  });
  
  console.log('\nIcon images:', iconInfo.iconImages.length);
  iconInfo.iconImages.forEach((img, idx) => {
    console.log(`  Icon Image ${idx}: ${img.src}`);
  });
  
  console.log('\nCurrent extraction result:', iconInfo.currentExtraction);
  
  console.log('\n⏳ Browser window open for manual inspection...');
  await new Promise(resolve => setTimeout(resolve, 30000));
  
  await browser.close();
}

debugIconExtraction().catch(console.error);