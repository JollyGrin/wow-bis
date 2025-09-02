import { NextResponse } from 'next/server';
import { itemsService } from '@/app/lib/items-service';

export async function GET() {
  try {
    const metadata = await itemsService.getItemsMetadata();
    return NextResponse.json(metadata);
  } catch (error) {
    console.error('Error fetching items metadata:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metadata' },
      { status: 500 }
    );
  }
}