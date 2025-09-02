import { promises as fs } from 'fs';
import path from 'path';

export interface Item {
  itemId: number;
  name: string;
  icon: string;
  class: string;
  subclass: string;
  sellPrice: number;
  quality: string;
  itemLevel: number;
  requiredLevel: number;
  slot: string;
  tooltip: TooltipLine[];
  itemLink: string;
  contentPhase: number;
  source?: {
    category: string;
    dropChance?: number;
  };
  uniqueName: string;
}

export interface TooltipLine {
  label: string;
  format?: string;
}

export interface ItemsSearchParams {
  query?: string;
  slot?: string;
  quality?: string;
  minLevel?: number;
  maxLevel?: number;
  class?: string;
  subclass?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

class ItemsService {
  private items: Item[] | null = null;
  private itemsMap: Map<number, Item> | null = null;
  private lastLoadTime: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private async loadItems(): Promise<void> {
    const now = Date.now();
    
    // Check if cache is still valid
    if (this.items && this.itemsMap && (now - this.lastLoadTime) < this.CACHE_DURATION) {
      return;
    }

    const filePath = path.join(process.cwd(), 'public', 'items.json');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    this.items = JSON.parse(fileContent);
    
    // Create map for O(1) lookup by ID
    this.itemsMap = new Map();
    for (const item of this.items!) {
      this.itemsMap.set(item.itemId, item);
    }
    
    this.lastLoadTime = now;
  }

  async getItemById(itemId: number): Promise<Item | null> {
    await this.loadItems();
    return this.itemsMap!.get(itemId) || null;
  }

  async getItemsByIds(itemIds: number[]): Promise<Item[]> {
    await this.loadItems();
    return itemIds
      .map(id => this.itemsMap!.get(id))
      .filter((item): item is Item => item !== undefined);
  }

  async searchItems(params: ItemsSearchParams): Promise<PaginatedResponse<Item>> {
    await this.loadItems();
    
    let filtered = this.items!;

    // Apply filters
    if (params.query) {
      const query = params.query.toLowerCase();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(query) ||
        item.uniqueName.toLowerCase().includes(query)
      );
    }

    if (params.slot) {
      filtered = filtered.filter(item => item.slot === params.slot);
    }

    if (params.quality) {
      filtered = filtered.filter(item => item.quality === params.quality);
    }

    if (params.minLevel !== undefined) {
      filtered = filtered.filter(item => item.requiredLevel >= params.minLevel!);
    }

    if (params.maxLevel !== undefined) {
      filtered = filtered.filter(item => item.requiredLevel <= params.maxLevel!);
    }

    if (params.class) {
      filtered = filtered.filter(item => item.class === params.class);
    }

    if (params.subclass) {
      filtered = filtered.filter(item => item.subclass === params.subclass);
    }

    // Pagination
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const paginatedItems = filtered.slice(startIndex, endIndex);

    return {
      data: paginatedItems,
      total: filtered.length,
      page,
      limit,
      totalPages: Math.ceil(filtered.length / limit)
    };
  }

  async getItemsMetadata() {
    await this.loadItems();
    
    const slots = new Set<string>();
    const qualities = new Set<string>();
    const classes = new Set<string>();
    const subclasses = new Set<string>();
    
    for (const item of this.items!) {
      slots.add(item.slot);
      qualities.add(item.quality);
      classes.add(item.class);
      subclasses.add(item.subclass);
    }
    
    return {
      totalItems: this.items!.length,
      slots: Array.from(slots).sort(),
      qualities: Array.from(qualities).sort(),
      classes: Array.from(classes).sort(),
      subclasses: Array.from(subclasses).sort(),
      levelRange: {
        min: Math.min(...this.items!.map(i => i.requiredLevel)),
        max: Math.max(...this.items!.map(i => i.requiredLevel))
      }
    };
  }
}

// Singleton instance
export const itemsService = new ItemsService();