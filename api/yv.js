// Vercel serverless function: forwards Bible requests to the YouVersion Platform.
// Running on the server avoids browser (CORS) restrictions and lets the key live in
// Vercel's Environment Variables (YVP_APP_KEY) instead of in the app itself.

// A Bible, a whole chapter (JHN.3), a verse (JHN.3.16) or a range of verses (JHN.3.16-18).
const PATH = /^bibles\/\d+(\/passages\/[1-3A-Z]{3}\.\d{1,3}(\.\d{1,3}(-\d{1,3})?)?)?$/;

// YVP_APP_KEY is the documented name, but accept close variants (YVP_KEY, VITE_YVP_APP_KEY,
// YOUVERSION_KEY…) so a small naming slip in Vercel doesn't silently switch the NIV off.
function findServerKey() {
  if (process.env.YVP_APP_KEY?.trim()) return { name: 'YVP_APP_KEY', value: process.env.YVP_APP_KEY.trim() };
  const match = Object.entries(process.env).find(([name, value]) => /YVP|YOUVERSION/i.test(name) && String(value || '').trim());
  return match ? { name: match[0], value: String(match[1]).trim() } : null;
}

export default async function handler(req, res) {
  const path = String(req.query.path || '');
  const found = findServerKey();
  const serverKey = found?.value || '';

  if (path === 'status') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(JSON.stringify({ serverKey: Boolean(serverKey), variable: found?.name || null }));
  }
  if (!PATH.test(path)) {
    return res.status(400).json({ error: 'Unsupported path' });
  }
  const key = req.headers['x-yvp-app-key'] || serverKey;
  if (!key) return res.status(401).json({ error: 'No YouVersion key' });

  const format = req.query.format === 'html' ? 'html' : 'text';
  try {
    const upstream = await fetch(`https://api.youversion.com/v1/${path}?format=${format}`, {
      headers: { 'X-YVP-App-Key': String(key), Accept: 'application/json' },
    });
    const body = await upstream.text();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', upstream.ok ? 'private, max-age=86400' : 'no-store');
    return res.status(upstream.status).send(body || '{}');
  } catch {
    return res.status(502).json({ error: 'Could not reach YouVersion' });
  }
}
