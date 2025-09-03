import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // Reconstruct the full path
    const path = params.path.join('/');
    const targetUrl = `https://wow.zamimg.com/${path}`;
    
    // Get query parameters from the original request
    const searchParams = request.nextUrl.searchParams;
    const queryString = searchParams.toString();
    const fullUrl = queryString ? `${targetUrl}?${queryString}` : targetUrl;
    
    console.log('Proxying request to:', fullUrl);
    
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
        path: params.path.join('/') 
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