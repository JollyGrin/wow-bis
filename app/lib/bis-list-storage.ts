import type { Item } from './items-service';

export interface BisList {
  id: string;
  name: string;
  items: Item[];
  createdAt: Date;
  updatedAt: Date;
}

export interface BisListSummary {
  id: string;
  name: string;
  itemCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const STORAGE_KEY = 'wow-bis-lists';
const ACTIVE_LIST_KEY = 'wow-bis-active-list';

export class BisListStorage {
  static saveBisList(list: Omit<BisList, 'id' | 'createdAt' | 'updatedAt'>): string {
    const lists = this.getAllLists();
    const id = Date.now().toString();
    const now = new Date();
    
    const newList: BisList = {
      id,
      ...list,
      createdAt: now,
      updatedAt: now,
    };
    
    lists[id] = newList;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
    return id;
  }

  static createNewList(name: string): string {
    const id = this.saveBisList({
      name,
      items: [],
    });
    this.setActiveList(id);
    return id;
  }
  
  static updateBisList(id: string, updates: Partial<Pick<BisList, 'name' | 'items'>>): boolean {
    const lists = this.getAllLists();
    const existingList = lists[id];
    
    if (!existingList) {
      return false;
    }
    
    lists[id] = {
      ...existingList,
      ...updates,
      updatedAt: new Date(),
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
    return true;
  }
  
  static getBisList(id: string): BisList | null {
    const lists = this.getAllLists();
    return lists[id] || null;
  }
  
  static deleteBisList(id: string): boolean {
    const lists = this.getAllLists();
    
    if (!lists[id]) {
      return false;
    }
    
    // If deleting the active list, clear the active list reference
    if (this.getActiveListId() === id) {
      this.clearActiveList();
    }
    
    delete lists[id];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
    return true;
  }

  static autoSaveCurrentList(items: Item[]): void {
    const activeId = this.getActiveListId();
    if (activeId) {
      this.updateBisList(activeId, { items });
    }
  }

  static getActiveListId(): string | null {
    try {
      return localStorage.getItem(ACTIVE_LIST_KEY);
    } catch {
      return null;
    }
  }

  static setActiveList(id: string): void {
    localStorage.setItem(ACTIVE_LIST_KEY, id);
  }

  static clearActiveList(): void {
    localStorage.removeItem(ACTIVE_LIST_KEY);
  }

  static getActiveList(): BisList | null {
    const activeId = this.getActiveListId();
    return activeId ? this.getBisList(activeId) : null;
  }

  static switchToList(id: string): BisList | null {
    const list = this.getBisList(id);
    if (list) {
      this.setActiveList(id);
      return list;
    }
    return null;
  }
  
  static getListSummaries(): BisListSummary[] {
    const lists = this.getAllLists();
    
    return Object.values(lists).map(list => ({
      id: list.id,
      name: list.name,
      itemCount: list.items.length,
      createdAt: list.createdAt,
      updatedAt: list.updatedAt,
    })).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }
  
  static clearAllLists(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
  
  private static getAllLists(): Record<string, BisList> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return {};
      
      const lists = JSON.parse(stored);
      
      Object.values(lists).forEach((list: any) => {
        list.createdAt = new Date(list.createdAt);
        list.updatedAt = new Date(list.updatedAt);
      });
      
      return lists;
    } catch {
      return {};
    }
  }
}

export class UrlSharingService {
  private static readonly URL_PARAM = 'bis';
  
  static shareBisList(items: Item[]): string {
    const itemIds = items.map(item => item.itemId);
    const compressed = btoa(JSON.stringify(itemIds));
    
    const url = new URL(window.location.href);
    url.searchParams.set(this.URL_PARAM, compressed);
    
    return url.toString();
  }
  
  static loadBisListFromUrl(): number[] | null {
    if (typeof window === 'undefined') return null;
    
    const params = new URLSearchParams(window.location.search);
    const bisParam = params.get(this.URL_PARAM);
    
    if (!bisParam) return null;
    
    try {
      const decompressed = atob(bisParam);
      const itemIds = JSON.parse(decompressed);
      
      if (Array.isArray(itemIds) && itemIds.every(id => typeof id === 'number')) {
        return itemIds;
      }
      
      return null;
    } catch {
      return null;
    }
  }
  
  static clearUrlParams(): void {
    if (typeof window === 'undefined') return;
    
    const url = new URL(window.location.href);
    url.searchParams.delete(this.URL_PARAM);
    
    window.history.replaceState({}, document.title, url.toString());
  }
}