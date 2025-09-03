import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // Reconstruct the path
    const path = params.path.join('/');
    const url = `https://wow.zamimg.com/modelviewer/live/${path}`;
    
    console.log('Proxying request to:', url);
    
    // Forward the request to Wowhead
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.wowhead.com/',
      },
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      // Try to get error details
      const errorText = await response.text();
      console.error('Proxy error response:', errorText);
      
      return NextResponse.json(
        { error: 'Failed to fetch resource', details: errorText },
        { status: response.status }
      );
    }

    // Get the content type
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    
    // Handle JSON responses
    if (contentType.includes('application/json')) {
      const data = await response.json();
      return NextResponse.json(data, {
        headers: {
          'Cache-Control': 'public, max-age=3600',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    
    // Handle other types (images, etc)
    const data = await response.arrayBuffer();
    
    // Return the response with appropriate headers
    return new NextResponse(data, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}