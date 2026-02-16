
export const config = {
  runtime: 'edge',
  maxDuration: 60, // Allow up to 60s for AI verification
};

export default async function handler(req) {
  // Target: photo-verify backend on Vercel
  const PHOTO_VERIFY_URL = process.env.PHOTO_VERIFY_API_URL || 'https://salesmate-wl.vercel.app';
  const PHOTO_VERIFY_TOKEN = process.env.PHOTO_VERIFY_TOKEN || '';

  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    // Determine the sub-path: /api/photoVerify/verify → /api/verify
    const url = new URL(req.url);
    const subPath = url.pathname.replace(/^\/api\/photoVerify\/?/, '');
    const targetPath = subPath ? `/api/${subPath}` : '/api/verify';

    // Forward query params for GET requests
    const targetUrl = `${PHOTO_VERIFY_URL}${targetPath}${url.search}`;

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${PHOTO_VERIFY_TOKEN}`,
    };

    const fetchOptions = {
      method: req.method,
      headers,
    };

    // Forward body for POST/PUT
    if (req.method === 'POST' || req.method === 'PUT') {
      fetchOptions.body = await req.text();
    }

    const response = await fetch(targetUrl, fetchOptions);
    const data = await response.text();

    return new Response(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: { message: e.message } }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
