import puppeteer, { Browser, Page } from "puppeteer";
import { writeFileSync, existsSync, readFileSync, mkdirSync } from "fs";

interface SubcategoryProgress {
  current_page: number;
  complete: boolean;
  total_ids: number;
}

interface IdExtractionProgress {
  subcategories: { [subcategoryId: string]: SubcategoryProgress };
  start_time: string;
  last_updated: string;
}

// Comprehensive category configuration based on TURTLE_ITEMS_FETCH.md
const CATEGORY_CONFIG = {
  // Weapons (2.0 - 2.20)
  "2.0": { name: "1h-axes", type: "weapons" },
  "2.1": { name: "2h-axes", type: "weapons" },
  "2.2": { name: "bows", type: "weapons" },
  "2.3": { name: "guns", type: "weapons" },
  "2.4": { name: "1h-maces", type: "weapons" },
  "2.5": { name: "2h-maces", type: "weapons" },
  "2.6": { name: "polearms", type: "weapons" },
  "2.7": { name: "1h-swords", type: "weapons" },
  "2.8": { name: "2h-swords", type: "weapons" },
  "2.10": { name: "staves", type: "weapons" },
  "2.13": { name: "fist", type: "weapons" },
  "2.14": { name: "miscellaneous", type: "weapons" },
  "2.15": { name: "daggers", type: "weapons" },
  "2.16": { name: "thrown", type: "weapons" },
  "2.17": { name: "spears", type: "weapons" },
  "2.18": { name: "crossbows", type: "weapons" },
  "2.19": { name: "wands", type: "weapons" },
  "2.20": { name: "fishing-poles", type: "weapons" },

  // Armor - Accessories
  "4.0.2": { name: "amulets", type: "armor" },
  "4.0.11": { name: "rings", type: "armor" },
  "4.0.12": { name: "trinkets", type: "armor" },
  "4.1.16": { name: "cloaks", type: "armor" },
  "4.6.14": { name: "shields", type: "armor" },

  // Cloth Armor (4.1.x) - skipping 4.1.2 and 4.1.4 as noted in docs
  "4.1.1": { name: "cloth-head", type: "armor" },
  "4.1.3": { name: "cloth-shoulder", type: "armor" },
  "4.1.5": { name: "cloth-chest", type: "armor" },
  "4.1.6": { name: "cloth-waist", type: "armor" },
  "4.1.7": { name: "cloth-legs", type: "armor" },
  "4.1.8": { name: "cloth-feet", type: "armor" },
  "4.1.9": { name: "cloth-wrist", type: "armor" },
  "4.1.10": { name: "cloth-hands", type: "armor" },

  // Leather Armor (4.2.x) - following same pattern, skipping .2 and .4
  "4.2.1": { name: "leather-head", type: "armor" },
  "4.2.3": { name: "leather-shoulder", type: "armor" },
  "4.2.5": { name: "leather-chest", type: "armor" },
  "4.2.6": { name: "leather-waist", type: "armor" },
  "4.2.7": { name: "leather-legs", type: "armor" },
  "4.2.8": { name: "leather-feet", type: "armor" },
  "4.2.9": { name: "leather-wrist", type: "armor" },
  "4.2.10": { name: "leather-hands", type: "armor" },

  // Mail Armor (4.3.x) - following same pattern
  "4.3.1": { name: "mail-head", type: "armor" },
  "4.3.3": { name: "mail-shoulder", type: "armor" },
  "4.3.5": { name: "mail-chest", type: "armor" },
  "4.3.6": { name: "mail-waist", type: "armor" },
  "4.3.7": { name: "mail-legs", type: "armor" },
  "4.3.8": { name: "mail-feet", type: "armor" },
  "4.3.9": { name: "mail-wrist", type: "armor" },
  "4.3.10": { name: "mail-hands", type: "armor" },

  // Plate Armor (4.4.x) - following same pattern
  "4.4.1": { name: "plate-head", type: "armor" },
  "4.4.3": { name: "plate-shoulder", type: "armor" },
  "4.4.5": { name: "plate-chest", type: "armor" },
  "4.4.6": { name: "plate-waist", type: "armor" },
  "4.4.7": { name: "plate-legs", type: "armor" },
  "4.4.8": { name: "plate-feet", type: "armor" },
  "4.4.9": { name: "plate-wrist", type: "armor" },
  "4.4.10": { name: "plate-hands", type: "armor" },
} as const;

class ItemIdExtractor {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private baseUrl = "https://database.turtle-wow.org";
  private progressFile = "turtle_db/id-extraction-progress.json";
  private logFile = "turtle_db/logs/id-extractor.log";

  constructor() {
    // Ensure directories exist
    ["turtle_db", "turtle_db/logs"].forEach((dir) => {
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    });
  }

  async initialize() {
    this.log("🚀 Initializing browser with anti-detection...");
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
        "--disable-features=VizDisplayCompositor",
        "--disable-web-security",
        "--disable-dev-shm-usage",
      ],
    });

    this.page = await this.browser.newPage();
    await this.setupStealth(this.page);
    this.log("✅ Browser initialized with stealth mode");
  }

  private async setupStealth(page: any) {
    // Set realistic headers
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    );
    await page.setExtraHTTPHeaders({
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      Connection: "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
    });

    await page.setViewport({ width: 1920, height: 1080 });

    // Remove automation indicators
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
      Object.defineProperty(navigator, "plugins", {
        get: () => [1, 2, 3, 4, 5],
      });
      Object.defineProperty(navigator, "languages", {
        get: () => ["en-US", "en"],
      });
      window.chrome = { runtime: {} };
    });
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.log("🔒 Browser closed");
    }
  }

  private log(message: string) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);

    try {
      writeFileSync(this.logFile, logMessage + "\n", { flag: "a" });
    } catch (e) {
      console.error("Failed to write to log file:", e);
    }
  }

  private loadProgress(): IdExtractionProgress {
    if (existsSync(this.progressFile)) {
      try {
        const data = JSON.parse(readFileSync(this.progressFile, "utf-8"));

        // Migration: Handle old format
        if (data.weapons && data.armor && !data.subcategories) {
          this.log(
            "📦 Migrating old progress format to new subcategory structure",
          );
          const migratedProgress: IdExtractionProgress = {
            subcategories: {},
            start_time: data.start_time || new Date().toISOString(),
            last_updated: new Date().toISOString(),
          };

          // Migrate weapons progress to all weapon subcategories
          Object.keys(CATEGORY_CONFIG).forEach((subcategoryId) => {
            const config =
              CATEGORY_CONFIG[subcategoryId as keyof typeof CATEGORY_CONFIG];
            if (config.type === "weapons") {
              migratedProgress.subcategories[subcategoryId] = {
                current_page: data.weapons.complete
                  ? 0
                  : data.weapons.current_page,
                complete: data.weapons.complete,
                total_ids: 0,
              };
            } else if (config.type === "armor") {
              migratedProgress.subcategories[subcategoryId] = {
                current_page: data.armor.complete ? 0 : data.armor.current_page,
                complete: data.armor.complete,
                total_ids: 0,
              };
            }
          });

          this.saveProgress(migratedProgress);
          return migratedProgress;
        }

        return data;
      } catch (e) {
        this.log("! Failed to load progress, starting fresh");
      }
    }

    // Create fresh progress for all subcategories
    const freshProgress: IdExtractionProgress = {
      subcategories: {},
      start_time: new Date().toISOString(),
      last_updated: new Date().toISOString(),
    };

    Object.keys(CATEGORY_CONFIG).forEach((subcategoryId) => {
      freshProgress.subcategories[subcategoryId] = {
        current_page: 0,
        complete: false,
        total_ids: 0,
      };
    });

    return freshProgress;
  }

  private saveProgress(progress: IdExtractionProgress) {
    progress.last_updated = new Date().toISOString();
    try {
      const tempFile = this.progressFile + ".tmp";
      writeFileSync(tempFile, JSON.stringify(progress, null, 2));
      writeFileSync(this.progressFile, readFileSync(tempFile));
      require("fs").unlinkSync(tempFile);
    } catch (e) {
      this.log(`❌ Failed to save progress: ${e}`);
    }
  }

  private async loadExistingIds(subcategoryId: string): Promise<number[]> {
    const filename = `turtle_db/items-${subcategoryId}.json`;
    if (existsSync(filename)) {
      try {
        return JSON.parse(readFileSync(filename, "utf-8"));
      } catch (e) {
        this.log(`! Failed to load existing ${subcategoryId} IDs`);
      }
    }

    // Migration: Check for old files
    const config =
      CATEGORY_CONFIG[subcategoryId as keyof typeof CATEGORY_CONFIG];
    if (config) {
      const oldFilename = `turtle_db/${config.type}-ids.json`;
      if (existsSync(oldFilename)) {
        try {
          const oldIds = JSON.parse(readFileSync(oldFilename, "utf-8"));
          this.log(
            `📦 Found old ${config.type} file, will be migrated during processing`,
          );
          return [];
        } catch (e) {
          this.log(`! Failed to load old ${config.type} IDs`);
        }
      }
    }

    return [];
  }

  private saveIds(subcategoryId: string, ids: number[]) {
    const filename = `turtle_db/items-${subcategoryId}.json`;
    const config =
      CATEGORY_CONFIG[subcategoryId as keyof typeof CATEGORY_CONFIG];
    try {
      const tempFile = filename + ".tmp";
      writeFileSync(tempFile, JSON.stringify(ids, null, 2));
      writeFileSync(filename, readFileSync(tempFile));
      require("fs").unlinkSync(tempFile);
      this.log(
        `💾 Saved ${ids.length} ${config?.name || subcategoryId} IDs to ${filename}`,
      );
    } catch (e) {
      this.log(`❌ Failed to save ${subcategoryId} IDs: ${e}`);
    }
  }

  private async extractItemIdsFromPage(): Promise<number[]> {
    return await this.page!.evaluate(() => {
      const items: number[] = [];
      const links = document.querySelectorAll('a[href*="?item="]');

      links.forEach((link) => {
        const href = link.getAttribute("href");
        const match = href?.match(/item=(\d+)/);
        if (match) {
          const itemId = parseInt(match[1]);
          if (!items.includes(itemId)) {
            items.push(itemId);
          }
        }
      });

      return items.sort((a, b) => a - b);
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async navigateToPage(
    subcategoryId: string,
    page: number,
  ): Promise<boolean> {
    const offset = page * 50;

    try {
      // Use fresh page method for all pages (discovered this works best)
      if (page > 0) {
        // Close current page and create fresh one
        await this.page!.close();
        this.page = await this.browser!.newPage();
        await this.setupStealth(this.page);
      }

      const url =
        page === 0
          ? `${this.baseUrl}/?items=${subcategoryId}`
          : `${this.baseUrl}/?items=${subcategoryId}#${offset}+1`;

      this.log(
        `📄 Loading page ${page + 1} with fresh browser context: ${url}`,
      );

      await this.page!.goto(url, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });

      // Check for Cloudflare challenge
      const isCloudflare = await this.page!.evaluate(() => {
        return (
          document.body.textContent?.includes("Verifying you are human") ||
          document.body.textContent?.includes("security check") ||
          document.title.includes("Just a moment")
        );
      });

      if (isCloudflare) {
        this.log("🛡 Cloudflare challenge detected, waiting...");
        await this.delay(10000);

        const stillBlocked = await this.page!.evaluate(() => {
          return document.body.textContent?.includes("Verifying you are human");
        });

        if (stillBlocked) {
          this.log("❌ Still blocked by Cloudflare");
          return false;
        }
      }

      await this.delay(3000); // Additional wait for content
      return true;
    } catch (error) {
      this.log(`❌ Navigation failed for page ${page + 1}: ${error}`);
      return false;
    }
  }

  async extractSubcategoryIds(subcategoryId: string): Promise<number[]> {
    const progress = this.loadProgress();
    const existingIds = await this.loadExistingIds(subcategoryId);
    const config =
      CATEGORY_CONFIG[subcategoryId as keyof typeof CATEGORY_CONFIG];

    if (!config) {
      this.log(`❌ Unknown subcategory: ${subcategoryId}`);
      return [];
    }

    this.log(`\n🎯 Starting ${config.name} (${subcategoryId}) ID extraction`);
    this.log(`📊 Already have ${existingIds.length} ${config.name} IDs`);
    this.log(
      `📖 Resuming from page ${progress.subcategories[subcategoryId]?.current_page + 1 || 1}`,
    );

    let allIds = [...existingIds];
    let currentPage = progress.subcategories[subcategoryId]?.current_page || 0;
    let hasMore = true;
    let consecutiveEmptyPages = 0;
    let consecutiveNoNewItems = 0;

    while (hasMore && consecutiveEmptyPages < 3 && consecutiveNoNewItems < 10) {
      const success = await this.navigateToPage(subcategoryId, currentPage);
      if (!success) {
        this.log(
          `! Failed to navigate to page ${currentPage + 1}, trying next page`,
        );
        currentPage++;
        consecutiveEmptyPages++;
        continue;
      }

      const pageIds = await this.extractItemIdsFromPage();

      if (pageIds.length === 0) {
        consecutiveEmptyPages++;
        consecutiveNoNewItems++;
        this.log(
          `📄 Page ${currentPage + 1}: No items found (${consecutiveEmptyPages}/3 empty)`,
        );
      } else {
        consecutiveEmptyPages = 0;
        const newIds = pageIds.filter((id) => !allIds.includes(id));
        
        if (newIds.length === 0) {
          consecutiveNoNewItems++;
          this.log(
            `📄 Page ${currentPage + 1}: Found ${pageIds.length} items (0 new) - ${consecutiveNoNewItems}/10 consecutive pages with no new items`,
          );
        } else {
          consecutiveNoNewItems = 0;
          allIds.push(...newIds);
          this.log(
            `📄 Page ${currentPage + 1}: Found ${pageIds.length} items (${newIds.length} new)`,
          );
        }
        
        this.log(`🆔 Sample IDs: ${pageIds.slice(0, 5).join(", ")}`);
        this.log(`📊 Total unique ${config.name}: ${allIds.length}`);

        // Save progress after each page
        if (!progress.subcategories[subcategoryId]) {
          progress.subcategories[subcategoryId] = {
            current_page: 0,
            complete: false,
            total_ids: 0,
          };
        }
        progress.subcategories[subcategoryId].current_page = currentPage;
        progress.subcategories[subcategoryId].total_ids = allIds.length;
        this.saveProgress(progress);
        this.saveIds(subcategoryId, allIds);

        // Stop if we found less than 50 items (last page)
        if (pageIds.length < 50) {
          this.log(`🏁 Last page detected (${pageIds.length} < 50 items)`);
          hasMore = false;
        }
      }

      currentPage++;
      await this.delay(1500); // Rate limiting
    }

    if (consecutiveEmptyPages >= 3) {
      this.log(
        `🛑 Stopping after ${consecutiveEmptyPages} consecutive empty pages`,
      );
    }
    
    if (consecutiveNoNewItems >= 10) {
      this.log(
        `🛑 Stopping after ${consecutiveNoNewItems} consecutive pages with no new items (likely reached end of category)`,
      );
    }

    // Mark as complete
    if (!progress.subcategories[subcategoryId]) {
      progress.subcategories[subcategoryId] = {
        current_page: 0,
        complete: false,
        total_ids: 0,
      };
    }
    progress.subcategories[subcategoryId].complete = true;
    progress.subcategories[subcategoryId].total_ids = allIds.length;
    this.saveProgress(progress);
    this.saveIds(subcategoryId, allIds);

    this.log(
      `✅ ${config.name} (${subcategoryId}) extraction complete: ${allIds.length} total IDs`,
    );
    return allIds;
  }

  async extractAllIds() {
    this.log("\n🚀 Starting Item ID Extraction\n");

    const progress = this.loadProgress();
    const subcategories = Object.keys(CATEGORY_CONFIG);
    const weaponCounts = { completed: 0, total: 0, totalIds: 0 };
    const armorCounts = { completed: 0, total: 0, totalIds: 0 };

    this.log(`📋 Processing ${subcategories.length} subcategories:`);
    subcategories.forEach((subcategoryId) => {
      const config =
        CATEGORY_CONFIG[subcategoryId as keyof typeof CATEGORY_CONFIG];
      const isComplete =
        progress.subcategories[subcategoryId]?.complete || false;
      const status = isComplete ? "✅" : "⏳";
      this.log(`   ${status} ${config.name} (${subcategoryId})`);

      if (config.type === "weapons") {
        weaponCounts.total++;
        if (isComplete) weaponCounts.completed++;
      } else {
        armorCounts.total++;
        if (isComplete) armorCounts.completed++;
      }
    });

    this.log(
      `\n📊 Summary: Weapons ${weaponCounts.completed}/${weaponCounts.total}, Armor ${armorCounts.completed}/${armorCounts.total}`,
    );

    // Process each subcategory
    for (const subcategoryId of subcategories) {
      const config =
        CATEGORY_CONFIG[subcategoryId as keyof typeof CATEGORY_CONFIG];
      const subcategoryProgress = progress.subcategories[subcategoryId];

      if (subcategoryProgress?.complete) {
        this.log(
          `✅ ${config.name} (${subcategoryId}) already complete: ${subcategoryProgress.total_ids} IDs`,
        );
        if (config.type === "weapons") {
          weaponCounts.totalIds += subcategoryProgress.total_ids;
        } else {
          armorCounts.totalIds += subcategoryProgress.total_ids;
        }
        continue;
      }

      try {
        const ids = await this.extractSubcategoryIds(subcategoryId);
        if (config.type === "weapons") {
          weaponCounts.totalIds += ids.length;
          weaponCounts.completed++;
        } else {
          armorCounts.totalIds += ids.length;
          armorCounts.completed++;
        }
      } catch (error) {
        this.log(
          `❌ Failed to extract ${config.name} (${subcategoryId}): ${error}`,
        );
      }

      // Small delay between subcategories to be respectful
      await this.delay(2000);
    }

    this.log("\n🎉 ID extraction complete!");
    this.log(`📊 Final counts:`);
    this.log(
      `   Weapons: ${weaponCounts.totalIds} IDs (${weaponCounts.completed}/${weaponCounts.total} subcategories)`,
    );
    this.log(
      `   Armor: ${armorCounts.totalIds} IDs (${armorCounts.completed}/${armorCounts.total} subcategories)`,
    );
    this.log(`   Total: ${weaponCounts.totalIds + armorCounts.totalIds} IDs`);

    // Create summary file
    const summary = {
      extraction_date: new Date().toISOString(),
      weapons: {
        subcategories: weaponCounts.completed,
        total_ids: weaponCounts.totalIds,
      },
      armor: {
        subcategories: armorCounts.completed,
        total_ids: armorCounts.totalIds,
      },
      grand_total: weaponCounts.totalIds + armorCounts.totalIds,
      subcategory_details: Object.keys(CATEGORY_CONFIG).map((subcategoryId) => {
        const config =
          CATEGORY_CONFIG[subcategoryId as keyof typeof CATEGORY_CONFIG];
        const subcategoryProgress = progress.subcategories[subcategoryId];
        return {
          subcategory_id: subcategoryId,
          name: config.name,
          type: config.type,
          complete: subcategoryProgress?.complete || false,
          total_ids: subcategoryProgress?.total_ids || 0,
        };
      }),
    };

    try {
      writeFileSync(
        "turtle_db/extraction-summary.json",
        JSON.stringify(summary, null, 2),
      );
      this.log(`📋 Summary saved to turtle_db/extraction-summary.json`);
    } catch (e) {
      this.log(`! Failed to save summary: ${e}`);
    }
  }
}

async function main() {
  const extractor = new ItemIdExtractor();

  try {
    await extractor.initialize();
    await extractor.extractAllIds();
  } catch (error) {
    console.error("💥 Extraction failed:", error);
  } finally {
    await extractor.cleanup();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

