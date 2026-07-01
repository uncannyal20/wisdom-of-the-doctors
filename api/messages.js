const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const sbHeaders = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json'
};

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    const { session_id } = req.query;
    if (!session_id) return res.status(400).json({ error: 'session_id required' });
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/messages?session_id=eq.${session_id}&order=created_at.asc`,
      { headers: sbHeaders }
    );
    const data = await r.json();
    return res.status(r.ok ? 200 : r.status).json(data);
  }

  if (req.method === 'POST') {
    const { session_id, role, content } = req.body;
    if (!session_id || !role || !content) {
      return res.status(400).json({ error: 'session_id, role, content required' });
    }
    const r = await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
      method: 'POST',
      headers: { ...sbHeaders, 'Prefer': 'return=representation' },
      body: JSON.stringify({ session_id, role, content })
    });
    const data = await r.json();
    return res.status(r.ok ? 201 : r.status).json(Array.isArray(data) ? data[0] : data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
