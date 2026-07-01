const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const sbHeaders = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json'
};

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/sessions?order=created_at.desc&limit=30`,
      { headers: sbHeaders }
    );
    const data = await r.json();
    return res.status(r.ok ? 200 : r.status).json(data);
  }

  if (req.method === 'POST') {
    const { doctor, title } = req.body;
    const r = await fetch(`${SUPABASE_URL}/rest/v1/sessions`, {
      method: 'POST',
      headers: { ...sbHeaders, 'Prefer': 'return=representation' },
      body: JSON.stringify({ doctor: doctor || 'all', title: title || null })
    });
    const data = await r.json();
    return res.status(r.ok ? 201 : r.status).json(Array.isArray(data) ? data[0] : data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
