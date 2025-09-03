import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    // Await params to fix Next.js warning
    const resolvedParams = await params;
    // Reconstruct the full path
    const path = resolvedParams.path.join('/');
    const targetUrl = `https://wow.zamimg.com/${path}`;
    
    // Get query parameters from the original request
    const searchParams = request.nextUrl.searchParams;
    const queryString = searchParams.toString();
    const fullUrl = queryString ? `${targetUrl}?${queryString}` : targetUrl;
    
    console.log('Proxying request to:', fullUrl);
    
    // Log metadata requests specifically for debugging
    if (path.includes('/meta/') && path.endsWith('.json')) {
      console.log('📦 Metadata request detected:', {
        path: path,
        targetUrl: targetUrl,
        isArmorMeta: path.includes('/meta/armor/'),
        isWeaponMeta: path.includes('/meta/weapon/'),
        isItemMeta: path.includes('/meta/item/')
      });
    }
    
    // Forward the request to Wowhead with appropriate headers
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.wowhead.com/',
        'Origin': 'https://www.wowhead.com',
        'Sec-Fetch-Dest': 'script',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'cross-site',
      },
      // Don't follow redirects automatically, let the client handle them
      redirect: 'manual',
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok && response.status !== 304) {
      const errorText = await response.text();
      console.error('Proxy error response:', response.status, errorText);
      
      // Check if this is a request for item metadata that returned 404
      if (response.status === 404 && path.includes('/meta/') && path.endsWith('.json')) {
        console.log('Providing fallback metadata for item:', path);
        
        // Extract the item ID and type from the path
        const pathParts = path.split('/');
        const itemId = pathParts[pathParts.length - 1].replace('.json', '');
        const itemType = pathParts.includes('armor') ? 'armor' : 
                        pathParts.includes('weapon') ? 'weapon' :
                        pathParts.includes('item') ? 'item' : 'unknown';
        const slot = itemType === 'armor' ? parseInt(pathParts[pathParts.length - 2]) || 1 : 0;
        
        // Provide a comprehensive fallback metadata structure based on item type
        const fallbackMetadata = {
          id: parseInt(itemId),
          displayid: parseInt(itemId), // Use item ID as display ID fallback
          type: itemType,
          slot: slot,
          name: `${itemType.charAt(0).toUpperCase() + itemType.slice(1)} ${itemId}`,
          description: `Fallback metadata for ${itemType} ${itemId}`,
          
          // Type-specific properties
          ...(itemType === 'armor' && {
            armor: {
              value: 100,
              type: 'plate' // Default armor type
            },
            resistances: {
              fire: 0,
              nature: 0,
              frost: 0,
              shadow: 0,
              arcane: 0
            }
          }),
          
          ...(itemType === 'weapon' && {
            damage: {
              min: 10,
              max: 20,
              type: 'physical'
            },
            speed: 2.0,
            dps: 15.0
          }),
          
          // Common properties for all items
          quality: 2, // Green quality as default
          level: 60, // Default level
          requiredLevel: 1,
          
          // Texture/model information - using item ID as fallback
          textures: {
            icon: `inv_misc_questionmark`,
            model: parseInt(itemId)
          },
          
          // Basic stats that might be expected
          stats: {},
          
          // Model viewer specific data
          modelViewer: {
            hasModel: true,
            displayId: parseInt(itemId),
            slot: slot
          },
          
          // Meta information about this fallback
          meta: {
            generatedFallback: true,
            originalPath: path,
            itemType: itemType,
            timestamp: new Date().toISOString(),
            note: 'This is automatically generated fallback metadata to prevent 404 errors'
          }
        };
        
        return new NextResponse(JSON.stringify(fallbackMetadata), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
            'X-Fallback-Generated': 'true', // Custom header to indicate this is fallback data
          },
        });
      }
      
      return new NextResponse(errorText, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // Get the content type from the original response
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    
    // Handle different content types appropriately
    let responseData;
    let responseHeaders: Record<string, string> = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Type': contentType,
    };

    // Copy cache-related headers if they exist
    const cacheControl = response.headers.get('cache-control');
    const etag = response.headers.get('etag');
    const lastModified = response.headers.get('last-modified');
    const expires = response.headers.get('expires');

    if (cacheControl) responseHeaders['Cache-Control'] = cacheControl;
    if (etag) responseHeaders['ETag'] = etag;
    if (lastModified) responseHeaders['Last-Modified'] = lastModified;
    if (expires) responseHeaders['Expires'] = expires;

    // Handle JSON responses
    if (contentType.includes('application/json')) {
      responseData = await response.text();
      return new NextResponse(responseData, {
        status: response.status,
        headers: responseHeaders,
      });
    }
    
    // Handle JavaScript files
    if (contentType.includes('javascript') || contentType.includes('text/plain') || path.endsWith('.js')) {
      responseData = await response.text();
      responseHeaders['Content-Type'] = 'application/javascript';
      return new NextResponse(responseData, {
        status: response.status,
        headers: responseHeaders,
      });
    }

    // Handle binary data (images, etc.)
    responseData = await response.arrayBuffer();
    return new NextResponse(responseData, {
      status: response.status,
      headers: responseHeaders,
    });

  } catch (error) {
    console.error('Proxy error:', error);
    
    return new NextResponse(
      JSON.stringify({ 
        error: 'Proxy request failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        path: resolvedParams.path.join('/') 
      }), 
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    );
  }
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}