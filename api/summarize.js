const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const { decrypt } = require('./crypto');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { session_id, model } = req.body;
  if (!session_id) {
    return res.status(400).json({ error: 'session_id is required' });
  }

  const authHeader = req.headers['authorization'] || `Bearer ${SUPABASE_ANON_KEY}`;
  const sbHeaders = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': authHeader,
    'Content-Type': 'application/json'
  };

  try {
    // 1. Fetch messages
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/messages?session_id=eq.${session_id}&order=created_at.asc`,
      { headers: sbHeaders }
    );
    if (!r.ok) {
      const errText = await r.text();
      return res.status(r.status).json({ error: `Supabase error: ${errText}` });
    }
    const data = await r.json();
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(404).json({ error: 'No messages found for this session.' });
    }

    // 2. Decrypt messages and format transcript
    let transcript = '';
    data.forEach(m => {
      const decryptedContent = decrypt(m.content);
      const roleName = m.role === 'user' ? 'User' : 'AI Spiritual Guide';
      transcript += `${roleName}: ${decryptedContent}\n\n`;
    });

    // 3. Call Anthropic Claude to summarize
    const systemPrompt = `You are a wise and gentle spiritual director. Your task is to read the transcript of a conversation between a soul seeking guidance and the AI Spiritual Guide (which draws from the Catholic Saints and Doctors of the Church).

Summarize this conversation into a beautiful, cohesive, and deeply personal "takeaway card". 

Format your response in Markdown using the following exact structure:
### ☩ Theme of the Journey
[A short paragraph of 2-3 sentences summarizing the user's primary inquiry, spiritual struggle, or focus of prayer.]

### ☩ Timeless Wisdom
[A bulleted list of 2-3 key takeaways or teachings from the Saints that were shared in the conversation, translated into accessible, actionable guidance.]

### ☩ Daily Practice & Reflection
[A customized short spiritual exercise, a resolution, or a custom short prayer (2-3 sentences) tailored specifically to the user's situation to help them carry this grace into their day.]

Keep the tone extremely warm, encouraging, and consoling. Avoid academic jargon.`;

    const modelName = model || 'claude-sonnet-4-6';

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: modelName,
        max_tokens: 1000,
        system: systemPrompt,
        messages: [
          { role: 'user', content: `Here is the conversation transcript:\n\n${transcript}` }
        ]
      })
    });

    if (!upstream.ok) {
      const errData = await upstream.json();
      return res.status(upstream.status).json(errData);
    }

    const result = await upstream.json();
    const summaryText = result.content[0].text;

    return res.status(200).json({ summary: summaryText });

  } catch (err) {
    console.error('Error in /api/summarize handler:', err);
    return res.status(500).json({ error: err.message });
  }
};
