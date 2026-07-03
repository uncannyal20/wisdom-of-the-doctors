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
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/insights?order=created_at.desc`,
        { headers: sbHeaders }
      );
      if (!r.ok) {
        const errText = await r.text();
        return res.status(r.status).json({ error: `Supabase error: ${errText}` });
      }
      const data = await r.json();
      const decryptedData = Array.isArray(data) ? data.map(ins => ({
        ...ins,
        content: decrypt(ins.content)
      })) : data;
      return res.status(200).json(decryptedData);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    const { session_id, doctor, content } = req.body;
    if (!doctor || !content) {
      return res.status(400).json({ error: 'doctor and content required' });
    }
    try {
      const encryptedContent = encrypt(content);
      const r = await fetch(`${SUPABASE_URL}/rest/v1/insights`, {
        method: 'POST',
        headers: { ...sbHeaders, 'Prefer': 'return=representation' },
        body: JSON.stringify({
          session_id: session_id || null,
          doctor,
          content: encryptedContent
        })
      });
      if (!r.ok) {
        const errText = await r.text();
        return res.status(r.status).json({ error: `Supabase error: ${errText}` });
      }
      const data = await r.json();
      const returnedData = Array.isArray(data) ? data[0] : data;
      if (returnedData && returnedData.content) {
        returnedData.content = decrypt(returnedData.content);
      }
      return res.status(201).json(returnedData);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: 'id required' });
    }
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/insights?id=eq.${id}`, {
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
