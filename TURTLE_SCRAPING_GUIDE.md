# Turtle WoW Database Scraping Implementation Guide

## Overview

This guide documents the complete system for scraping item data from the Turtle WoW database to replace the existing Classic WoW data with Turtle WoW specific items and quest information.

## 🎯 Problem Statement

The original `items.json` contains Classic WoW data where quest reward items have `requiredLevel: 0`, making them appear available from level 1. This is misleading since these items actually require completing quests that have minimum level requirements.

## 🛠️ Solution Architecture

### Phase 1: Data Extraction
1. **List Extraction** - Get all item IDs from paginated lists
2. **Item Scraping** - Extract complete item details for each ID
3. **Progress Tracking** - Resume capability for interrupted scrapes
4. **Data Storage** - Save weapons.json and armor.json separately

### Phase 2: Data Enhancement  
1. **Data Merging** - Combine weapons and armor into single dataset
2. **Quest Processing** - Extract quest minimum levels
3. **Data Validation** - Quality checks and issue detection
4. **Final Integration** - Replace existing data

## 📁 File Structure

```
turtle_db/
├── weapons.json              # Scraped weapon data
├── armor.json               # Scraped armor data  
├── all-items.json           # Merged dataset
├── quest-levels.json        # Quest minimum levels
├── progress.json            # Scraper progress
├── quest-progress.json      # Quest fetcher progress
├── failed-items.json        # Items that failed to scrape
├── failed-quests.json       # Quests that failed to fetch
├── logs/
│   ├── scraper.log         # Detailed scraping logs
│   ├── quest-fetcher.log   # Quest fetching logs
│   └── errors.log          # Error-only logs
└── reports/
    ├── merge-report.md     # Data merge analysis
    ├── quest-report.md     # Quest processing results
    ├── validation-report.md # Data quality report
    └── workflow-test-report.md # End-to-end test results
```

## 🚀 Scripts Overview

### 1. `scripts/scrape-turtle-complete.ts` - Main Scraper
**Purpose**: Extract all items from Turtle WoW database

**Key Features**:
- ✅ **Headless Operation** - Runs without visible browser
- ✅ **Granular Progress** - Saves after every single item  
- ✅ **Resume Capability** - Continues from exact failure point
- ✅ **Rate Limiting** - 1.5s delays between requests
- ✅ **Error Recovery** - Retries with exponential backoff
- ✅ **Complete Data** - Icons, tooltips, stats, source info

**Usage**:
```bash
npx tsx scripts/scrape-turtle-complete.ts
```

**Progress Tracking**:
- Automatically extracts all item IDs first
- Processes each item sequentially
- Saves progress after every item (not batched)
- Can restart at any time without losing work

**Expected Runtime**: 2-4 hours for ~2000+ items

### 2. `scripts/merge-turtle-data.ts` - Data Merger
**Purpose**: Combine weapons.json + armor.json into single dataset

**Features**:
- Deduplication of items
- Data validation during merge
- Statistical analysis
- Quality reporting

**Usage**:
```bash
npx tsx scripts/merge-turtle-data.ts
```

**Output**: `turtle_db/all-items.json` + `merge-report.md`

### 3. `scripts/fetch-quest-levels.ts` - Quest Level Fetcher  
**Purpose**: Get minimum levels for all quests found in item sources

**Features**:
- Extracts unique quest IDs from item data
- Visits each quest page to get minimum level
- Updates quest data with minLevel field
- Resume capability for interrupted fetching

**Usage**:
```bash
npx tsx scripts/fetch-quest-levels.ts
```

**Output**: `turtle_db/quest-levels.json` + `quest-report.md`

### 4. `scripts/validate-turtle-data.ts` - Data Validator
**Purpose**: Comprehensive data quality analysis

**Validation Checks**:
- Required field validation
- Data type verification  
- Enum value validation
- Business logic checks
- Duplicate detection
- Quest item analysis

**Usage**:
```bash
npx tsx scripts/validate-turtle-data.ts
```

**Output**: `validation-report.json` + `validation-report.md`

### 5. `scripts/test-scraping-workflow.ts` - Workflow Tester
**Purpose**: End-to-end testing of the complete pipeline

**Test Steps**:
1. Scraper initialization test
2. Limited item scraping test  
3. Data merger test
4. Validation test
5. Quest level fetcher test

**Usage**:
```bash
npx tsx scripts/test-scraping-workflow.ts
```

**Output**: `workflow-test-report.md`

## 🔄 Complete Workflow

### Step 1: Run Workflow Test (Optional but Recommended)
```bash
npx tsx scripts/test-scraping-workflow.ts
```
**Purpose**: Verify all scripts work before full scrape
**Duration**: 5-10 minutes
**Creates**: Test data and workflow report

### Step 2: Full Item Scraping
```bash
npx tsx scripts/scrape-turtle-complete.ts
```
**Purpose**: Extract all weapons and armor from Turtle WoW
**Duration**: 2-4 hours  
**Creates**: `weapons.json`, `armor.json`, progress files, logs
**Resume**: Can be stopped and restarted at any time

### Step 3: Data Merging
```bash
npx tsx scripts/merge-turtle-data.ts
```
**Purpose**: Combine into single dataset with analysis
**Duration**: 30 seconds
**Creates**: `all-items.json`, `merge-report.md`

### Step 4: Quest Level Processing (Optional)
```bash
npx tsx scripts/fetch-quest-levels.ts
```
**Purpose**: Fix quest items with requiredLevel: 0
**Duration**: 1-2 hours
**Creates**: `quest-levels.json`, `quest-report.md`
**When to run**: If validation shows quest items with zero levels

### Step 5: Data Validation
```bash
npx tsx scripts/validate-turtle-data.ts
```
**Purpose**: Final quality check
**Duration**: 30 seconds
**Creates**: `validation-report.json`, `validation-report.md`

### Step 6: Production Integration
Replace existing `public/items.json` with `turtle_db/all-items.json`

## 🛡️ Error Recovery Features

### Automatic Resume
All scripts support resuming from interruption:
- **Scraper**: Resumes from last processed item
- **Quest Fetcher**: Resumes from last processed quest  
- **Merger**: Stateless, always safe to re-run
- **Validator**: Stateless, always safe to re-run

### Progress Safety
- Atomic file saves (temp file + rename)
- Progress validation on startup
- Detailed logging for debugging
- Failed items tracked separately for retry

### Error Handling
- Network timeouts: Auto-retry with backoff
- Page load failures: Mark for later retry
- Parsing errors: Log and continue
- Browser crashes: Restart browser, resume

## 🔧 Configuration & Requirements

### Dependencies
```bash
npm install --save-dev puppeteer @types/puppeteer
# or
pnpm add -D puppeteer @types/puppeteer
```

### Browser Setup
```bash
npx puppeteer browsers install chrome
```

### System Requirements
- **Memory**: 2GB+ RAM (for browser)
- **Storage**: 100MB+ for data and logs
- **Network**: Stable connection (rate limited to 1.5s)
- **Time**: 2-4 hours for complete scrape

### Rate Limiting
- **Item Scraping**: 1.5 seconds between requests
- **Quest Fetching**: 1.5 seconds between requests
- **Respectful**: Won't overload Turtle WoW servers

## 📊 Data Structure

The scraped data maintains compatibility with existing `items.json` structure:

```typescript
interface Item {
  itemId: number;                    // Unique identifier
  name: string;                      // Item display name  
  icon: string;                      // Icon filename
  class: string;                     // "Weapon" | "Armor"
  subclass: string;                  // Weapon/armor type
  sellPrice: number;                 // Vendor price in copper
  quality: string;                   // Rarity level
  itemLevel: number;                 // Item's level
  requiredLevel: number;             // Min character level
  slot: string;                      // Equipment slot
  tooltip: TooltipLine[];            // Rich tooltip data
  itemLink: string;                  // WoW hyperlink format
  contentPhase: number;              // Content phase (1)
  source?: {                         // Source information
    category: string;                // "Quest" | "Boss Drop" | etc
    quests?: Quest[];                // Quest details if applicable
    name?: string;                   // Boss name if applicable  
    zone?: number;                   // Zone ID if applicable
    dropChance?: number;             // Drop rate if applicable
  };
  uniqueName: string;                // URL-friendly identifier
}
```

### Enhanced Quest Data
When quest levels are fetched, quest objects include:
```typescript
interface Quest {
  questId: number;
  name: string;
  faction: string;
  minLevel?: number;                 // Added by quest fetcher
}
```

## 🚨 Important Notes

### Access Requirements
- ✅ **No Authentication** - Public database access
- ✅ **Headless Compatible** - Runs without visible browser
- ✅ **Rate Limited** - Respectful server usage
- ❌ **No API** - Must scrape HTML pages

### Data Consistency
- **Duplicate Handling**: Automatic deduplication by item ID
- **Missing Data**: Graceful handling of missing fields
- **Error Items**: Tracked separately, can be retried
- **Resume Safety**: No duplicate work on restart

### Performance Considerations
- **Memory Usage**: ~200MB during scraping
- **Disk Space**: ~50MB for complete dataset + logs
- **Network Usage**: ~1GB total download
- **CPU Usage**: Low (mostly waiting for network)

## 🔍 Troubleshooting

### Common Issues

**Browser Launch Fails**:
```bash
npx puppeteer browsers install chrome
```

**Network Timeouts**:
- Check internet connection
- Scripts auto-retry failed requests
- Resume from progress file

**Out of Memory**:
- Close other applications
- Scripts designed for low memory usage
- Progress saved frequently

**Incomplete Data**:
- Check validation report for issues
- Re-run specific failed items
- Check logs for error details

### Recovery Procedures

**Corrupted Progress**:
```bash
rm turtle_db/progress.json
# Restart scraper - will begin fresh
```

**Partial Scrape Results**:
```bash
# Check what was completed
npx tsx scripts/validate-turtle-data.ts

# Resume scraping if needed
npx tsx scripts/scrape-turtle-complete.ts
```

**Data Quality Issues**:
```bash
# Run validation for detailed analysis
npx tsx scripts/validate-turtle-data.ts

# Check validation-report.md for specific issues
```

## 📈 Success Metrics

### Expected Results
- **Total Items**: 2000+ items
- **Data Quality**: 95%+ items without errors  
- **Quest Items**: 200+ quest rewards identified
- **Source Coverage**: 80%+ items with source info
- **Icons**: 90%+ items with icon data

### Quality Thresholds
- **Errors**: < 5% of total items
- **Missing Icons**: < 10% of items
- **Invalid Required Levels**: < 2% of items
- **Duplicate Items**: 0 items

## 🎉 Final Integration

Once scraping is complete and validated:

1. **Backup Current Data**:
   ```bash
   cp public/items.json public/items.json.backup
   ```

2. **Replace with Turtle Data**:
   ```bash
   cp turtle_db/all-items.json public/items.json
   ```

3. **Update Application** (if needed):
   - Test that app loads correctly
   - Verify quest items show proper levels
   - Check that icons display correctly

4. **Monitor Results**:
   - Quest items no longer show level 0
   - Turtle WoW specific items appear
   - Overall data quality improved

## 🤝 Maintenance

### Regular Updates
- **Frequency**: Monthly or when Turtle WoW adds new content
- **Process**: Re-run complete workflow
- **Duration**: 2-4 hours automated

### Data Freshness
- **Item Changes**: Turtle WoW occasionally updates items
- **New Items**: New content patches add items
- **Quest Changes**: Quest requirements may change

### Monitoring
- **Success Rate**: Should remain >95%
- **Performance**: Scripts should complete in expected time
- **Quality**: Validation should show minimal issues

---

This implementation provides a robust, resumable system for maintaining up-to-date Turtle WoW item data with proper quest level requirements, solving the original issue of quest rewards appearing available from level 1.