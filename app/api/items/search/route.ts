import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface Item {
  itemId: number;
  name: string;
  icon: string;
  class: string;
  subclass: string;
  quality: string;
  itemLevel: number;
  requiredLevel: number;
  slot: string;
  tooltip: Array<{ label: string; format?: string }>;
  contentPhase: number;
  source: any;
  uniqueName: string;
}

let itemsCache: Item[] | null = null;

function loadItems(): Item[] {
  if (itemsCache) {
    return itemsCache;
  }

  try {
    const itemsPath = path.join(process.cwd(), 'public', 'items.json');
    const itemsData = fs.readFileSync(itemsPath, 'utf8');
    itemsCache = JSON.parse(itemsData);
    console.log(`📦 Loaded ${itemsCache!.length} items from items.json`);
    return itemsCache!;
  } catch (error) {
    console.error('Failed to load items.json:', error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q')?.toLowerCase() || '';
    const slot = searchParams.get('slot')?.toLowerCase() || '';
    const itemClass = searchParams.get('class')?.toLowerCase() || '';
    const limit = parseInt(searchParams.get('limit') || '50');
    
    console.log(`🔍 Item search: q="${query}", slot="${slot}", class="${itemClass}", limit=${limit}`);

    const items = loadItems();
    
    let filteredItems = items;

    // Filter by search query (name or item ID)
    if (query) {
      const isNumeric = /^\d+$/.test(query);
      
      filteredItems = filteredItems.filter(item => {
        if (isNumeric) {
          // Search by item ID
          return item.itemId.toString().includes(query);
        } else {
          // Search by name
          return item.name.toLowerCase().includes(query) ||
                 item.uniqueName.includes(query);
        }
      });
    }

    // Filter by slot
    if (slot) {
      filteredItems = filteredItems.filter(item => 
        item.slot?.toLowerCase().includes(slot)
      );
    }

    // Filter by class (Weapon, Armor, etc.)
    if (itemClass) {
      filteredItems = filteredItems.filter(item => 
        item.class?.toLowerCase().includes(itemClass)
      );
    }

    // Sort by item level (descending) and then by name
    filteredItems.sort((a, b) => {
      if (b.itemLevel !== a.itemLevel) {
        return b.itemLevel - a.itemLevel;
      }
      return a.name.localeCompare(b.name);
    });

    // Limit results
    const results = filteredItems.slice(0, limit);
    
    console.log(`✅ Found ${results.length} items (filtered from ${filteredItems.length})`);

    return NextResponse.json({
      query: { q: query, slot, class: itemClass, limit },
      total: filteredItems.length,
      results: results.map(item => ({
        itemId: item.itemId,
        name: item.name,
        icon: item.icon,
        slot: item.slot,
        class: item.class,
        subclass: item.subclass,
        quality: item.quality,
        itemLevel: item.itemLevel,
        requiredLevel: item.requiredLevel,
        contentPhase: item.contentPhase,
      }))
    });

  } catch (error) {
    console.error('Item search API error:', error);
    
    return new NextResponse(
      JSON.stringify({ 
        error: 'Item search failed', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }), 
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}