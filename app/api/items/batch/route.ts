import { NextRequest, NextResponse } from 'next/server';
import { itemsService } from '@/app/lib/items-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { itemIds } = body;
    
    if (!Array.isArray(itemIds)) {
      return NextResponse.json(
        { error: 'itemIds must be an array' },
        { status: 400 }
      );
    }

    if (itemIds.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 items per request' },
        { status: 400 }
      );
    }

    const validIds = itemIds.filter(id => typeof id === 'number' && !isNaN(id));
    const items = await itemsService.getItemsByIds(validIds);
    
    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error fetching batch items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch items' },
      { status: 500 }
    );
  }
}