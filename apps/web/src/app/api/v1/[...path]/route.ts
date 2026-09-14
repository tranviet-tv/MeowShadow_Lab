import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

async function forwardRequest(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  const path = resolvedParams.path.join('/');
  const targetHost =
    process.env.INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:8000';

  const query = req.nextUrl.search;
  const targetUrl = `${targetHost.replace(/\/$/, '')}/api/v1/${path}${query}`;

  const forwardHeaders = new Headers();
  req.headers.forEach((value, key) => {
    // Avoid forwarding hop-by-hop host header
    if (key.toLowerCase() !== 'host') {
      forwardHeaders.set(key, value);
    }
  });

  const init: RequestInit = {
    method: req.method,
    headers: forwardHeaders,
    cache: 'no-store',
  };

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = req.body;
    // @ts-expect-error - duplex needed for streaming request body in Node.js fetch
    init.duplex = 'half';
  }

  try {
    const upstreamRes = await fetch(targetUrl, init);

    const resHeaders = new Headers();
    upstreamRes.headers.forEach((value, key) => {
      resHeaders.set(key, value);
    });

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      statusText: upstreamRes.statusText,
      headers: resHeaders,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to proxy request to Gateway Core',
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 502 }
    );
  }
}

export const GET = forwardRequest;
export const POST = forwardRequest;
export const PUT = forwardRequest;
export const DELETE = forwardRequest;
export const HEAD = forwardRequest;
export const PATCH = forwardRequest;
