
export const config = {
  runtime: 'edge',
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

const REPO = 'danielgomez-02/salesmate-wl';
const FILE_PATH = 'public/brands.json';
const BRANCH = 'main';

/** Decode base64 → UTF-8 string (atob only handles Latin-1) */
function base64ToUtf8(base64) {
  const raw = atob(base64);
  const bytes = Uint8Array.from(raw, c => c.charCodeAt(0));
  return new TextDecoder('utf-8').decode(bytes);
}

/** Encode UTF-8 string → base64 */
function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

/** Fetch brands.json content + SHA from GitHub */
async function fetchBrandsFile(token) {
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`,
    {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'salesmate-wl-api',
      },
    }
  );
  if (!res.ok) throw new Error(`GitHub GET failed: ${res.status}`);
  const data = await res.json();
  const content = JSON.parse(base64ToUtf8(data.content));
  return { content, sha: data.sha };
}

/** Write brands.json back to GitHub */
async function writeBrandsFile(token, brands, sha, message) {
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'salesmate-wl-api',
      },
      body: JSON.stringify({
        message,
        content: utf8ToBase64(JSON.stringify(brands, null, 2) + '\n'),
        sha,
        branch: BRANCH,
      }),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub PUT failed: ${res.status} — ${err}`);
  }
  return res.json();
}

export default async function handler(req) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const GITHUB_TOKEN = process.env.GITHUB_PAT;
  if (!GITHUB_TOKEN) {
    return new Response(
      JSON.stringify({ error: 'GITHUB_PAT not configured' }),
      { status: 500, headers: CORS_HEADERS }
    );
  }

  try {
    // ─── GET: return all brands ───
    if (req.method === 'GET') {
      const { content } = await fetchBrandsFile(GITHUB_TOKEN);
      return new Response(JSON.stringify(content), {
        status: 200,
        headers: { ...CORS_HEADERS, 'Cache-Control': 'no-cache' },
      });
    }

    // ─── POST: save / update a single brand ───
    if (req.method === 'POST') {
      const { id, brand } = await req.json();
      if (!id || !brand) {
        return new Response(
          JSON.stringify({ error: 'Missing id or brand in body' }),
          { status: 400, headers: CORS_HEADERS }
        );
      }

      const { content: brands, sha } = await fetchBrandsFile(GITHUB_TOKEN);
      brands[id] = { ...brand, id };

      await writeBrandsFile(
        GITHUB_TOKEN,
        brands,
        sha,
        `[api] Save brand: ${id}`
      );

      return new Response(
        JSON.stringify({ ok: true, brands }),
        { status: 200, headers: CORS_HEADERS }
      );
    }

    // ─── DELETE: remove a brand ───
    if (req.method === 'DELETE') {
      const { id } = await req.json();
      if (!id) {
        return new Response(
          JSON.stringify({ error: 'Missing id in body' }),
          { status: 400, headers: CORS_HEADERS }
        );
      }

      const { content: brands, sha } = await fetchBrandsFile(GITHUB_TOKEN);
      if (!brands[id]) {
        return new Response(
          JSON.stringify({ error: `Brand "${id}" not found` }),
          { status: 404, headers: CORS_HEADERS }
        );
      }

      delete brands[id];

      await writeBrandsFile(
        GITHUB_TOKEN,
        brands,
        sha,
        `[api] Delete brand: ${id}`
      );

      return new Response(
        JSON.stringify({ ok: true, brands }),
        { status: 200, headers: CORS_HEADERS }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: CORS_HEADERS }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message, success: false }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
