import puppeteer from 'puppeteer';
import { writeFileSync } from 'fs';

async function debugItemStructure() {
  console.log('🔍 Debugging item page structure...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
  await page.setViewport({ width: 1920, height: 1080 });
  
  // Test with multiple items of known quality
  const testItems = [
    { id: 17182, name: "Sulfuras", expected: "Legendary" },
    { id: 19323, name: "Unstoppable Force", expected: "Epic" },
    { id: 13965, name: "Blackhand's Breadth", expected: "Rare" }
  ];
  
  for (const item of testItems) {
    const url = `https://database.turtle-wow.org/?item=${item.id}`;
    
    console.log(`\n📄 Loading ${item.name} (${item.expected}): ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Extract detailed structure
    const structure = await page.evaluate(() => {
      const result: any = {
        title: document.title,
        h1: {
          text: document.querySelector('h1')?.textContent || '',
          classes: document.querySelector('h1')?.className || '',
          html: document.querySelector('h1')?.outerHTML || ''
        },
        qualityElements: [],
        tables: [],
        iconInfo: null,
        tooltipInfo: null
      };
      
      // Look for quality indicators in various places
      // Check all elements with color classes (q0-q7)
      const qualityClasses = ['q0', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7'];
      qualityClasses.forEach(qClass => {
        const elements = document.querySelectorAll(`.${qClass}`);
        elements.forEach((elem, idx) => {
          result.qualityElements.push({
            class: qClass,
            tag: elem.tagName,
            text: elem.textContent?.substring(0, 50),
            html: elem.outerHTML.substring(0, 100)
          });
        });
      });
      
      // Get all tables and their content
      document.querySelectorAll('table').forEach((table, idx) => {
        const tableInfo = {
          index: idx,
          classes: table.className,
          firstCellText: table.querySelector('td')?.textContent?.substring(0, 100),
          html: table.outerHTML.substring(0, 200)
        };
        result.tables.push(tableInfo);
      });
      
      // Look for icon
      const iconImg = document.querySelector('img[src*="icons"]') || document.querySelector('table img');
      if (iconImg) {
        result.iconInfo = {
          src: iconImg.getAttribute('src'),
          alt: iconImg.getAttribute('alt')
        };
      }
      
      // Look for tooltip container
      const tooltipDiv = document.querySelector('.tooltip') || document.querySelector('[id*="tooltip"]');
      if (tooltipDiv) {
        result.tooltipInfo = {
          classes: tooltipDiv.className,
          html: tooltipDiv.outerHTML.substring(0, 300)
        };
      }
      
      // Check for JavaScript variables that might contain item data
      result.hasG_items = typeof (window as any).g_items !== 'undefined';
      if (result.hasG_items) {
        result.g_items_sample = JSON.stringify((window as any).g_items).substring(0, 200);
      }
      
      return result;
    });
    
    console.log('📊 Structure Analysis:');
    console.log('  H1:', structure.h1.text);
    console.log('  H1 HTML:', structure.h1.html);
    console.log('  Quality elements found:', structure.qualityElements.length);
    if (structure.qualityElements.length > 0) {
      console.log('  First quality element:', JSON.stringify(structure.qualityElements[0], null, 2));
    }
    console.log('  Tables found:', structure.tables.length);
    console.log('  Has icon:', !!structure.iconInfo);
    if (structure.iconInfo) {
      console.log('  Icon src:', structure.iconInfo.src);
    }
    console.log('  Has g_items:', structure.hasG_items);
    if (structure.hasG_items) {
      console.log('  g_items sample:', structure.g_items_sample);
    }
    
    // Save full structure for analysis
    writeFileSync(`turtle_db/debug-${item.id}.json`, JSON.stringify(structure, null, 2));
  }
  
  await browser.close();
  console.log('\n✅ Debug complete! Check turtle_db/debug-*.json files for full structure');
}

debugItemStructure().catch(console.error);