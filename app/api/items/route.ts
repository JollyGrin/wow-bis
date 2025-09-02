import { NextRequest, NextResponse } from 'next/server';
import { itemsService } from '@/app/lib/items-service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Parse query parameters
    const params = {
      query: searchParams.get('q') || undefined,
      slot: searchParams.get('slot') || undefined,
      quality: searchParams.get('quality') || undefined,
      minLevel: searchParams.get('minLevel') ? parseInt(searchParams.get('minLevel')!) : undefined,
      maxLevel: searchParams.get('maxLevel') ? parseInt(searchParams.get('maxLevel')!) : undefined,
      class: searchParams.get('class') || undefined,
      subclass: searchParams.get('subclass') || undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20
    };

    const result = await itemsService.searchItems(params);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error searching items:', error);
    return NextResponse.json(
      { error: 'Failed to search items' },
      { status: 500 }
    );
  }
}