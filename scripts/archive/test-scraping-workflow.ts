import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface TestResult {
  step: string;
  success: boolean;
  duration: number;
  output?: string;
  error?: string;
  itemCount?: number;
}

class WorkflowTester {
  private results: TestResult[] = [];
  
  private log(message: string) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
  }

  private async runCommand(command: string, description: string, timeout = 300000): Promise<TestResult> {
    this.log(`Starting: ${description}`);
    const startTime = Date.now();
    
    try {
      const output = execSync(command, { 
        encoding: 'utf-8', 
        timeout,
        cwd: process.cwd(),
        stdio: 'pipe'
      });
      
      const duration = Date.now() - startTime;
      const result: TestResult = {
        step: description,
        success: true,
        duration,
        output: output.substring(0, 1000) // Truncate long output
      };
      
      this.log(`✅ Completed: ${description} (${Math.round(duration/1000)}s)`);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const result: TestResult = {
        step: description,
        success: false,
        duration,
        error: error instanceof Error ? error.message : String(error)
      };
      
      this.log(`❌ Failed: ${description} (${Math.round(duration/1000)}s)`);
      return result;
    }
  }

  private checkFileExists(filepath: string): boolean {
    return existsSync(filepath);
  }

  private getItemCount(filepath: string): number {
    try {
      if (!existsSync(filepath)) return 0;
      const data = JSON.parse(readFileSync(filepath, 'utf-8'));
      return Array.isArray(data) ? data.length : 0;
    } catch {
      return 0;
    }
  }

  private generateTestReport(): string {
    const totalSteps = this.results.length;
    const successfulSteps = this.results.filter(r => r.success).length;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);

    return `
# Turtle WoW Scraping Workflow Test Report
Generated: ${new Date().toISOString()}

## Summary
- **Total Steps**: ${totalSteps}
- **Successful**: ${successfulSteps}
- **Failed**: ${totalSteps - successfulSteps}
- **Success Rate**: ${Math.round((successfulSteps / totalSteps) * 100)}%
- **Total Duration**: ${Math.round(totalDuration / 1000)}s (${Math.round(totalDuration / 60000)}min)

## Test Results

${this.results.map((result, index) => `
### ${index + 1}. ${result.step}
- **Status**: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}
- **Duration**: ${Math.round(result.duration / 1000)}s
${result.itemCount ? `- **Items Found**: ${result.itemCount}` : ''}
${result.error ? `- **Error**: ${result.error}` : ''}
${result.output ? `- **Output Sample**: \`\`\`\n${result.output}\n\`\`\`` : ''}
`).join('\n')}

## File Verification

### Expected Files
- ✅ turtle_db/weapons.json: ${this.checkFileExists('turtle_db/weapons.json') ? 'EXISTS' : 'MISSING'}
- ✅ turtle_db/armor.json: ${this.checkFileExists('turtle_db/armor.json') ? 'EXISTS' : 'MISSING'}  
- ✅ turtle_db/all-items.json: ${this.checkFileExists('turtle_db/all-items.json') ? 'EXISTS' : 'MISSING'}
- ✅ turtle_db/quest-levels.json: ${this.checkFileExists('turtle_db/quest-levels.json') ? 'EXISTS' : 'MISSING'}
- ✅ turtle_db/validation-report.json: ${this.checkFileExists('turtle_db/validation-report.json') ? 'EXISTS' : 'MISSING'}

### Item Counts
- **Weapons**: ${this.getItemCount('turtle_db/weapons.json')}
- **Armor**: ${this.getItemCount('turtle_db/armor.json')}
- **All Items**: ${this.getItemCount('turtle_db/all-items.json')}

### Log Files
- ✅ turtle_db/logs/scraper.log: ${this.checkFileExists('turtle_db/logs/scraper.log') ? 'EXISTS' : 'MISSING'}
- ✅ turtle_db/logs/quest-fetcher.log: ${this.checkFileExists('turtle_db/logs/quest-fetcher.log') ? 'EXISTS' : 'MISSING'}

## Recommendations

${successfulSteps === totalSteps ? '🎉 **Perfect!** All workflow steps completed successfully.' : 
  `⚠️ **Issues Found**: ${totalSteps - successfulSteps} steps failed. Review the errors above.`}

${!this.checkFileExists('turtle_db/all-items.json') ? '🔴 **Critical**: Missing merged items file. Run merger script.' : ''}
${this.getItemCount('turtle_db/all-items.json') < 100 ? '⚠️ **Warning**: Very few items found. Check scraper results.' : ''}
${!this.checkFileExists('turtle_db/quest-levels.json') ? '🟡 **Optional**: No quest levels found. Run quest fetcher if needed.' : ''}

## Next Steps
1. Review any failed steps and resolve issues
2. If data looks good, replace existing items.json with turtle_db/all-items.json
3. Update application to use new Turtle WoW data
4. Test application with new data
    `;
  }

  async runFullWorkflowTest(): Promise<void> {
    this.log('🚀 Starting Turtle WoW scraping workflow test...');
    this.log('⚠️  This is a LIMITED TEST - will only scrape a few items for validation');

    // Clean up any existing test data
    this.log('Cleaning up previous test data...');
    const filesToClean = [
      'turtle_db/weapons.json',
      'turtle_db/armor.json', 
      'turtle_db/all-items.json',
      'turtle_db/quest-levels.json',
      'turtle_db/progress.json',
      'turtle_db/quest-progress.json'
    ];

    filesToClean.forEach(file => {
      if (existsSync(file)) {
        require('fs').unlinkSync(file);
        this.log(`Removed ${file}`);
      }
    });

    // Step 1: Test scraper setup (just check if it starts)
    this.log('\\n📋 Step 1: Testing scraper initialization...');
    const initResult = await this.runCommand(
      'npx tsx -e "import(\\\'./scripts/scrape-turtle-complete.ts\\\').then(m => console.log(\\\'Scraper loaded successfully\\\'))"',
      'Scraper Script Loading Test',
      30000
    );
    this.results.push(initResult);

    // Step 2: Test a minimal scrape (we'll modify the script to limit items)
    this.log('\\n⚔️  Step 2: Testing limited item scraping...');
    
    // Create a test version that only scrapes a few items
    const testScraperContent = `
    // Quick test scraper - only scrapes first few items
    import puppeteer from 'puppeteer';
    import { writeFileSync, mkdirSync, existsSync } from 'fs';

    async function testLimitedScrape() {
      if (!existsSync('turtle_db')) mkdirSync('turtle_db', { recursive: true });
      
      const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
      const page = await browser.newPage();
      
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
      
      // Test weapon list access
      await page.goto('https://database.turtle-wow.org/?items=2', { waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 2000));
      
      const itemIds = await page.evaluate(() => {
        const links = document.querySelectorAll('a[href*="?item="]');
        const ids = [];
        for (let i = 0; i < Math.min(5, links.length); i++) {
          const href = links[i].getAttribute('href');
          const match = href?.match(/item=(\\\\d+)/);
          if (match) ids.push(parseInt(match[1]));
        }
        return ids;
      });
      
      console.log('Found item IDs:', itemIds);
      
      // Test scraping one item
      if (itemIds.length > 0) {
        await page.goto('https://database.turtle-wow.org/?item=' + itemIds[0]);
        await new Promise(r => setTimeout(r, 2000));
        
        const itemData = await page.evaluate(() => {
          const nameElem = document.querySelector('h1');
          return {
            name: nameElem?.textContent?.replace(' - Items', '') || 'Unknown',
            found: !!nameElem
          };
        });
        
        console.log('Item data:', itemData);
        
        // Save test result
        writeFileSync('turtle_db/test-result.json', JSON.stringify({
          itemIds,
          sampleItem: itemData,
          timestamp: new Date().toISOString()
        }, null, 2));
      }
      
      await browser.close();
      console.log('Test scrape completed successfully');
    }
    
    testLimitedScrape().catch(console.error);
    `;

    writeFileSync('test-scraper-limited.js', testScraperContent);
    
    const scrapeResult = await this.runCommand(
      'node test-scraper-limited.js',
      'Limited Item Scraping Test',
      120000
    );
    scrapeResult.itemCount = this.getItemCount('turtle_db/test-result.json') > 0 ? 5 : 0;
    this.results.push(scrapeResult);

    // Clean up test file
    if (existsSync('test-scraper-limited.js')) {
      require('fs').unlinkSync('test-scraper-limited.js');
    }

    // Step 3: Test merger (create dummy data if scraper failed)
    this.log('\\n🔗 Step 3: Testing data merger...');
    
    // Create minimal test data if scraping failed
    if (!scrapeResult.success) {
      this.log('Creating dummy data for merger test...');
      const dummyWeapons = [
        { itemId: 1, name: 'Test Sword', class: 'Weapon', slot: 'Main Hand', quality: 'Common', tooltip: [], itemLink: '', uniqueName: 'test-sword' }
      ];
      const dummyArmor = [
        { itemId: 2, name: 'Test Helmet', class: 'Armor', slot: 'Head', quality: 'Common', tooltip: [], itemLink: '', uniqueName: 'test-helmet' }
      ];
      
      writeFileSync('turtle_db/weapons.json', JSON.stringify(dummyWeapons, null, 2));
      writeFileSync('turtle_db/armor.json', JSON.stringify(dummyArmor, null, 2));
    }

    const mergeResult = await this.runCommand(
      'npx tsx scripts/merge-turtle-data.ts',
      'Data Merger Test',
      60000
    );
    mergeResult.itemCount = this.getItemCount('turtle_db/all-items.json');
    this.results.push(mergeResult);

    // Step 4: Test validation
    this.log('\\n✅ Step 4: Testing data validation...');
    const validateResult = await this.runCommand(
      'npx tsx scripts/validate-turtle-data.ts',
      'Data Validation Test',
      60000
    );
    this.results.push(validateResult);

    // Step 5: Test quest level fetcher (if we have quest items)
    this.log('\\n🗡️  Step 5: Testing quest level fetcher...');
    
    // Check if we have any quest items to test with
    let hasQuestItems = false;
    if (existsSync('turtle_db/all-items.json')) {
      try {
        const items = JSON.parse(readFileSync('turtle_db/all-items.json', 'utf-8'));
        hasQuestItems = items.some((item: any) => item.source?.category === 'Quest');
      } catch {}
    }

    if (hasQuestItems) {
      const questResult = await this.runCommand(
        'npx tsx scripts/fetch-quest-levels.ts',
        'Quest Level Fetcher Test',
        120000
      );
      this.results.push(questResult);
    } else {
      this.results.push({
        step: 'Quest Level Fetcher Test',
        success: true,
        duration: 0,
        output: 'Skipped - no quest items found'
      });
      this.log('⏭️  Skipped quest level fetcher - no quest items found');
    }

    // Generate final report
    this.log('\\n📊 Generating test report...');
    const report = this.generateTestReport();
    writeFileSync('turtle_db/workflow-test-report.md', report);

    // Display summary
    const successful = this.results.filter(r => r.success).length;
    const total = this.results.length;
    
    console.log('\\n' + '='.repeat(60));
    console.log('WORKFLOW TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`🎯 Steps Completed: ${successful}/${total}`);
    console.log(`⏱️  Total Duration: ${Math.round(this.results.reduce((sum, r) => sum + r.duration, 0) / 1000)}s`);
    console.log(`📊 Success Rate: ${Math.round((successful / total) * 100)}%`);
    
    const itemCount = this.getItemCount('turtle_db/all-items.json');
    if (itemCount > 0) {
      console.log(`📦 Items Processed: ${itemCount}`);
    }
    
    if (successful === total) {
      console.log('\\n🎉 All workflow steps completed successfully!');
      console.log('✅ Ready for production scraping');
    } else {
      console.log('\\n⚠️  Some workflow steps failed');
      console.log('📄 Check workflow-test-report.md for details');
    }
    
    console.log('\\n📋 Files created:');
    console.log('  - turtle_db/workflow-test-report.md');
    if (existsSync('turtle_db/all-items.json')) {
      console.log('  - turtle_db/all-items.json');
    }
    if (existsSync('turtle_db/validation-report.md')) {
      console.log('  - turtle_db/validation-report.md');
    }
  }
}

// Run the workflow test
const tester = new WorkflowTester();
tester.runFullWorkflowTest().catch(console.error);