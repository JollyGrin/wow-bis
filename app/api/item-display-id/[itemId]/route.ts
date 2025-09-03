import { NextRequest, NextResponse } from 'next/server';

// Cache for display IDs to avoid repeated Wowhead requests
const displayIdCache = new Map<number, number>();

// Known working display IDs (our verified mappings)
const knownDisplayIds: Record<number, number> = {
  16963: 34215, // Helm of Wrath
  16905: 33650, // Bloodfang Chestpiece
  19019: 30606, // Thunderfury
  
  // Additional Classic items - these can be verified via Wowhead XML API
  // Warrior T2 Set (Wrath)
  16961: 34214, // Pauldrons of Wrath  
  16966: 34211, // Breastplate of Wrath
  16962: 34212, // Legplates of Wrath
  16965: 34216, // Sabatons of Wrath
  16964: 34213, // Gauntlets of Wrath
  16960: 34210, // Waistband of Wrath
  16959: 34209, // Bracelets of Wrath
  
  // Common leveling items - fallback to item ID for now
  // These will be looked up via Wowhead XML API if needed
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const resolvedParams = await params;
    const itemId = parseInt(resolvedParams.itemId);
    
    if (!itemId) {
      return new NextResponse('Invalid item ID', { status: 400 });
    }

    console.log(`🔍 Getting display ID for item ${itemId}`);

    // Check if we have a known mapping first
    if (knownDisplayIds[itemId]) {
      const displayId = knownDisplayIds[itemId];
      console.log(`✅ Found known display ID for item ${itemId}: ${displayId}`);
      return NextResponse.json({ 
        itemId, 
        displayId, 
        source: 'known_mapping',
        cached: false 
      });
    }

    // Check cache
    if (displayIdCache.has(itemId)) {
      const displayId = displayIdCache.get(itemId)!;
      console.log(`💾 Found cached display ID for item ${itemId}: ${displayId}`);
      return NextResponse.json({ 
        itemId, 
        displayId, 
        source: 'cache',
        cached: true 
      });
    }

    // Fetch from Wowhead XML API
    console.log(`🌐 Fetching display ID from Wowhead for item ${itemId}`);
    
    try {
      const wowheadUrl = `https://www.wowhead.com/item=${itemId}&xml`;
      const response = await fetch(wowheadUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ClassicModelViewer/1.0)',
        },
      });

      if (!response.ok) {
        throw new Error(`Wowhead request failed: ${response.status}`);
      }

      const xmlText = await response.text();
      
      // Extract display ID from XML
      // Look for displayId="XXXXX" in the XML
      const displayIdMatch = xmlText.match(/displayid="(\d+)"/i);
      
      if (displayIdMatch && displayIdMatch[1]) {
        const displayId = parseInt(displayIdMatch[1]);
        
        // Cache the result
        displayIdCache.set(itemId, displayId);
        
        console.log(`✅ Found display ID for item ${itemId}: ${displayId}`);
        
        return NextResponse.json({ 
          itemId, 
          displayId, 
          source: 'wowhead_xml',
          cached: false 
        });
      } else {
        console.warn(`❌ No display ID found in Wowhead XML for item ${itemId}`);
        
        // Fallback: use item ID as display ID (sometimes works for Classic)
        const fallbackDisplayId = itemId;
        displayIdCache.set(itemId, fallbackDisplayId);
        
        return NextResponse.json({ 
          itemId, 
          displayId: fallbackDisplayId, 
          source: 'fallback',
          cached: false,
          warning: 'No display ID found in XML, using item ID as fallback'
        });
      }
      
    } catch (wowheadError) {
      console.error(`Failed to fetch from Wowhead for item ${itemId}:`, wowheadError);
      
      // Fallback: use item ID as display ID
      const fallbackDisplayId = itemId;
      displayIdCache.set(itemId, fallbackDisplayId);
      
      return NextResponse.json({ 
        itemId, 
        displayId: fallbackDisplayId, 
        source: 'fallback',
        cached: false,
        error: 'Failed to fetch from Wowhead, using item ID as fallback'
      });
    }

  } catch (error) {
    console.error('Display ID API error:', error);
    
    const resolvedParams = await params;
    return new NextResponse(
      JSON.stringify({ 
        error: 'Failed to get display ID', 
        details: error instanceof Error ? error.message : 'Unknown error',
        itemId: resolvedParams.itemId
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