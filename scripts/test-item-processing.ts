import puppeteer, { Browser, Page } from 'puppeteer';
import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'fs';
import { CATEGORY_CONFIG } from './constants';
import { ItemExtractor, Item } from './item-extractor';

// Test the shared item extraction function with proper validation
async function testItemExtraction() {
  console.log('🧪 Testing comprehensive item extraction...');
  
  // Test with random items from different categories to check quality detection
  const testItems = [
    // From rings (4.0.11) - should have rare/epic items
    5009,   // Ring from rings list
    
    // From trinkets (4.0.12) - often have higher quality  
    13965,  // Random trinket
    
    // From cloth chest (4.1.5) - mix of qualities
    7534,   // Random cloth chest
    
    // From 1h swords (2.7) - should have variety
    17182,  // Sword from weapons
    
    // Known epic item if possible
    19323   // The Unstoppable Force (should be epic)
  ];
  
  console.log(`📋 Testing with ${testItems.length} item IDs:`, testItems);
  
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=VizDisplayCompositor',
      '--disable-web-security',
      '--disable-dev-shm-usage'
    ],
  });
  
  const page = await browser.newPage();
  
  // Set realistic headers (same as production script)
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.setExtraHTTPHeaders({
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none'
  });
  
  await page.setViewport({ width: 1920, height: 1080 });
  
  // Remove automation indicators
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    (window as any).chrome = { runtime: {} };
  });
  
  const results: (Item | null)[] = [];
  const validResults: Item[] = [];
  
  for (const itemId of testItems) {
    try {
      console.log(`🔍 Processing item ${itemId}...`);
      
      // Use the shared extraction function
      const item = await ItemExtractor.extractItemDetails(page, itemId);
      
      results.push(item);
      
      if (item) {
        validResults.push(item);
        console.log(`✅ Successfully extracted: ${item.name}`);
        console.log(`   📊 Quality: ${item.quality}, Level: ${item.itemLevel}, Required: ${item.requiredLevel}`);
        console.log(`   💰 Sell Price: ${item.sellPrice} copper`);
        console.log(`   🏷️  Class: ${item.class}, Subclass: ${item.subclass}, Slot: ${item.slot}`);
        console.log(`   🎨 Icon: ${item.icon}`);
        console.log(`   📜 Tooltip lines: ${item.tooltip.length}`);
        if (item.source) {
          console.log(`   🔗 Source: ${item.source.category}`);
          if (item.source.quests) {
            item.source.quests.forEach(quest => {
              console.log(`      Quest: ${quest.name} (ID: ${quest.questId}, Faction: ${quest.faction})`);
            });
          }
        } else {
          console.log(`   🔗 Source: None detected`);
        }
      } else {
        console.log(`❌ Failed to extract item ${itemId} (likely invalid or redirect)`);
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1500));
      
    } catch (error) {
      console.error(`💥 Error processing item ${itemId}:`, error);
      results.push(null);
    }
  }
  
  await browser.close();
  
  console.log('\n📊 Test Summary:');
  console.log(`   Total items tested: ${testItems.length}`);
  console.log(`   Successfully extracted: ${validResults.length}`);
  console.log(`   Failed extractions: ${testItems.length - validResults.length}`);
  
  // Validate the structure matches TURTLE_ITEMS_FETCH.md
  console.log('\n🔍 Validating data structure...');
  const validationResults = [];
  
  for (const item of validResults) {
    const validation = {
      itemId: item.itemId,
      name: item.name,
      hasRequiredFields: true,
      missingFields: [] as string[],
      dataQuality: 'good' as 'good' | 'partial' | 'poor'
    };
    
    // Check required fields
    const requiredFields = ['itemId', 'name', 'quality', 'class', 'subclass', 'slot', 'tooltip', 'itemLink', 'uniqueName'];
    for (const field of requiredFields) {
      if (!item[field as keyof Item] && item[field as keyof Item] !== 0) {
        validation.hasRequiredFields = false;
        validation.missingFields.push(field);
      }
    }
    
    // Check data quality
    if (item.icon === '' || item.tooltip.length < 2) {
      validation.dataQuality = 'partial';
    }
    if (validation.missingFields.length > 2) {
      validation.dataQuality = 'poor';
    }
    
    console.log(`   ✅ ${item.name}: ${validation.dataQuality} quality, ${validation.missingFields.length} missing fields`);
    if (validation.missingFields.length > 0) {
      console.log(`      Missing: ${validation.missingFields.join(', ')}`);
    }
    
    validationResults.push(validation);
  }
  
  // Save comprehensive test results
  const testReport = {
    timestamp: new Date().toISOString(),
    testItems,
    results: validResults,
    validationResults,
    summary: {
      totalTested: testItems.length,
      successfulExtractions: validResults.length,
      failedExtractions: testItems.length - validResults.length,
      averageTooltipLines: validResults.length > 0 ? Math.round(validResults.reduce((sum, item) => sum + item.tooltip.length, 0) / validResults.length) : 0,
      itemsWithSources: validResults.filter(item => item.source).length,
      itemsWithQuests: validResults.filter(item => item.source?.quests).length
    }
  };
  
  writeFileSync('turtle_db/test-extraction-report.json', JSON.stringify(testReport, null, 2));
  console.log('💾 Comprehensive test report saved to turtle_db/test-extraction-report.json');
  
  // Check if extraction meets quality standards
  const qualityThreshold = 0.8; // 80% of items should extract successfully
  const successRate = validResults.length / testItems.length;
  
  if (successRate >= qualityThreshold) {
    console.log(`\n🎉 Extraction test PASSED! Success rate: ${(successRate * 100).toFixed(1)}%`);
    return true;
  } else {
    console.log(`\n❌ Extraction test FAILED! Success rate: ${(successRate * 100).toFixed(1)}% (required: ${(qualityThreshold * 100)}%)`);
    return false;
  }
}

testItemExtraction().catch(console.error);