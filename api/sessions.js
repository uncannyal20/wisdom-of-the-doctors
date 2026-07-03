const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const { encrypt, decrypt } = require('./crypto');

module.exports = async function handler(req, res) {
  const authHeader = req.headers['authorization'] || `Bearer ${SUPABASE_ANON_KEY}`;
  const sbHeaders = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': authHeader,
    'Content-Type': 'application/json'
  };

  if (req.method === 'GET') {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/sessions?order=created_at.desc&limit=30`,
      { headers: sbHeaders }
    );
    const data = await r.json();
    const decryptedData = Array.isArray(data) ? data.map(s => ({
      ...s,
      title: decrypt(s.title)
    })) : data;
    return res.status(r.ok ? 200 : r.status).json(decryptedData);
  }

  if (req.method === 'POST') {
    const { doctor, title } = req.body;
    const encryptedTitle = encrypt(title);
    const r = await fetch(`${SUPABASE_URL}/rest/v1/sessions`, {
      method: 'POST',
      headers: { ...sbHeaders, 'Prefer': 'return=representation' },
      body: JSON.stringify({ doctor: doctor || 'all', title: encryptedTitle || null })
    });
    const data = await r.json();
    const returnedData = Array.isArray(data) ? data[0] : data;
    if (returnedData && returnedData.title) {
      returnedData.title = decrypt(returnedData.title);
    }
    return res.status(r.ok ? 201 : r.status).json(returnedData);
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: 'id required' });
    }
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/sessions?id=eq.${id}`, {
        method: 'DELETE',
        headers: sbHeaders
      });
      if (!r.ok) {
        const errText = await r.text();
        return res.status(r.status).json({ error: `Supabase error: ${errText}` });
      }
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
