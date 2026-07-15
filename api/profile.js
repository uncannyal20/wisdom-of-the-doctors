const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
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
        `${SUPABASE_URL}/rest/v1/spiritual_profiles?select=profile`,
        { headers: sbHeaders }
      );
      if (!r.ok) {
        const errText = await r.text();
        return res.status(r.status).json({ error: `Supabase error: ${errText}` });
      }
      const data = await r.json();
      const row = Array.isArray(data) ? data[0] : null;
      return res.status(200).json({ profile: row && row.profile ? decrypt(row.profile) : null });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    const { session_summary } = req.body;
    if (!session_summary) {
      return res.status(400).json({ error: 'session_summary required' });
    }
    try {
      // 1. Fetch existing profile
      const existingRes = await fetch(
        `${SUPABASE_URL}/rest/v1/spiritual_profiles?select=profile`,
        { headers: sbHeaders }
      );
      if (!existingRes.ok) {
        const errText = await existingRes.text();
        return res.status(existingRes.status).json({ error: `Supabase error: ${errText}` });
      }
      const existingData = await existingRes.json();
      const existingRow = Array.isArray(existingData) ? existingData[0] : null;
      const existingProfile = existingRow && existingRow.profile ? decrypt(existingRow.profile) : null;

      // 2. Ask Claude to fold the new reflection into an updated profile
      const systemPrompt = `You maintain a concise, private "spiritual profile" for a soul under pastoral care. Given their existing profile (if any) and their latest journey reflection, produce an updated profile capturing durable, lasting themes: ongoing struggles or graces, and any saints or Doctors of the Church they resonate with. Do not include specific dates or one-off details — focus on enduring patterns only. Keep it under 120 words. Output only the updated profile text, nothing else — no preamble, no headers.`;

      const upstream = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 400,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: `EXISTING PROFILE:\n${existingProfile || '(none yet — this is a new soul)'}\n\nLATEST REFLECTION:\n${session_summary}`
            }
          ]
        })
      });

      if (!upstream.ok) {
        const errData = await upstream.json();
        return res.status(upstream.status).json(errData);
      }

      const result = await upstream.json();
      const updatedProfile = result.content[0].text.trim();

      // 3. Encrypt and upsert
      const encryptedProfile = encrypt(updatedProfile);
      const upsertRes = await fetch(
        `${SUPABASE_URL}/rest/v1/spiritual_profiles?on_conflict=user_id`,
        {
          method: 'POST',
          headers: { ...sbHeaders, 'Prefer': 'resolution=merge-duplicates,return=representation' },
          body: JSON.stringify({ profile: encryptedProfile, updated_at: new Date().toISOString() })
        }
      );
      if (!upsertRes.ok) {
        const errText = await upsertRes.text();
        return res.status(upsertRes.status).json({ error: `Supabase error: ${errText}` });
      }

      return res.status(200).json({ profile: updatedProfile });
    } catch (err) {
      console.error('Error in /api/profile handler:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
