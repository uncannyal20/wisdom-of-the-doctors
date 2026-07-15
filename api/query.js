const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { model, max_tokens, messages, doctor, spiritual_profile, past_sessions_context } = req.body;

  if (!model || !messages) {
    return res.status(400).json({ error: 'Missing required fields: model, messages' });
  }

  try {
    // 1. Get embedding for the user's latest query
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUserMessage) {
      return res.status(400).json({ error: 'No user message found to query RAG' });
    }

    console.log(`Generating Gemini embedding for user query: "${lastUserMessage.content.substring(0, 50)}..."`);
    const embedUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GEMINI_API_KEY}`;
    
    const embedResponse = await fetch(embedUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'models/gemini-embedding-001',
        content: {
          parts: [
            { text: lastUserMessage.content }
          ]
        },
        outputDimensionality: 768
      })
    });

    if (!embedResponse.ok) {
      const errData = await embedResponse.json().catch(() => ({}));
      throw new Error(`Gemini Embedding API error: ${embedResponse.status} - ${JSON.stringify(errData.error || errData)}`);
    }

    const embedResult = await embedResponse.json();
    if (!embedResult.embedding || !embedResult.embedding.values) {
      throw new Error(`Gemini Embedding API returned invalid response: ${JSON.stringify(embedResult)}`);
    }
    const embedding = embedResult.embedding.values;

    // 2. Query Supabase vector similarity matching (matches dimensions: 768)
    console.log(`Querying Supabase match_corpus RPC for doctor filter: ${doctor || 'all'}...`);
    const sbHeaders = {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    };

    const rpcResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/match_corpus`, {
      method: 'POST',
      headers: sbHeaders,
      body: JSON.stringify({
        query_embedding: embedding,
        match_threshold: 0.3, // Lower threshold to ensure we get matching passages
        match_count: 6,
        filter_doctor: doctor || 'all'
      })
    });

    if (!rpcResponse.ok) {
      const errText = await rpcResponse.text();
      console.warn(`Supabase RPC error, proceeding without RAG matching: ${errText}`);
    }

    const matches = rpcResponse.ok ? await rpcResponse.json() : [];
    console.log(`Retrieved ${matches.length} matching passages from Supabase.`);

    // 3. Dynamically construct system prompt
    const doctorNames = {
      sales: "St. Francis de Sales",
      augustine: "St. Augustine",
      therese: "St. Thérèse",
      aquinas: "St. Thomas Aquinas",
      liguori: "St. Alphonsus Liguori",
      benedict: "St. Benedict",
      more: "St. Thomas More",
      teresa: "St. Teresa of Ávila",
      montfort: "St. Louis de Montfort"
    };

    const doctorTitles = {
      sales: "Doctor of Devotion (1567–1622)",
      augustine: "Doctor of Grace (354–430)",
      therese: "Doctor of the Little Way (1873–1897)",
      aquinas: "Doctor Angelicus (1225–1274)",
      liguori: "Doctor Zelantissimus (1696–1787)",
      benedict: "Father of Western Monasticism (480–547)",
      more: "Martyr and Patron of Statesmen (1478–1535)",
      teresa: "Doctor of Prayer (1515–1582)",
      montfort: "Apostle of Mary (1673–1716)"
    };

    let corpusText = '';
    if (Array.isArray(matches) && matches.length > 0) {
      matches.forEach((m, i) => {
        const docName = doctorNames[m.doctor] || m.doctor;
        const docTitle = doctorTitles[m.doctor] || '';
        corpusText += `\n[RESULT-${i+1}] From "${m.work}" by ${docName} (${docTitle}): "${m.content}"\n`;
      });
    } else {
      corpusText = '\n(No specific passages retrieved from the knowledge base for this query. Offer generic spiritual guidance matching the Doctor\'s charism.)\n';
    }

    const focusInstruction = doctor === 'all'
      ? 'You may draw from any of the saints or Doctors of the Church in the knowledge base.'
      : `You are to draw primarily from the writings of ${doctorNames[doctor] || doctor}.`;

    const systemPrompt = `You are a gentle, wise spiritual director. You have access to relevant wisdom from the Doctors of the Church.

${focusInstruction}

KNOWLEDGE BASE (these are the passages dynamically retrieved for this query — treat them as your primary sources):
${corpusText}

SPIRITUAL PROFILE OF THIS SOUL (use only to inform tone and continuity — do not quote or reference it clinically):
${spiritual_profile || '(no profile yet — treat this as an early relationship)'}

HISTORY OF THE JOURNEY (past reflections from this soul's earlier conversations, most recent first — for continuity, not citation):
${past_sessions_context || '(no prior journey recorded yet)'}

Core Behavioral Rules:
- Synthesize, Do Not List: You are a companion, not a search engine. Weave core truths from the provided passages into a single, seamless, and deeply personal reflection. Absolutely no bullet points, numbered lists, or bolded headers.
- Embed the Wisdom: Naturally integrate brief, powerful excerpts from the retrieved passages into your reflection. Do not preface them with 'St. X said:'. Instead, let the wisdom flow as part of your own sentences. Use italics for the quotes (wrap them in single asterisks, e.g. *quote*) to distinguish them from your voice.
- Voice & Tone: Write with the intimacy of a letter. Use a slow, rhythmic cadence. Use transitional phrases ('Consider,' 'In this light,' 'It is worth remembering...') to build a narrative arc.
- Empathy First: Acknowledge the user's emotion or question directly before introducing wisdom.
- Continuity, Not Callbacks: Let the spiritual profile and journey history shape your warmth and familiarity naturally. Never explicitly announce that you are drawing on stored history (e.g. no "I see from your profile that…" or "as you mentioned last time…") — the continuity should feel like memory, not record-keeping.
- Formatting: Use standard paragraphs. Keep the body text clean and uninterrupted by references.

Citation Policy:
- Do not include citations within the main body of your response.
- If citations are required, append them as a metadata block at the very end of your response, formatted so the frontend can handle their display (or concealment) via the UI.
- Format each citation exactly like this at the very end of your message on a new line:
  SOURCE: [Doctor's name] — "[Work title]"`;

    // 4. Stream response from Anthropic Claude API
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens,
        system: systemPrompt,
        messages,
        stream: true
      })
    });

    if (!upstream.ok) {
      const data = await upstream.json();
      return res.status(upstream.status).json(data);
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value, { stream: true }));
    }
    res.end();

  } catch (err) {
    console.error('Error in /api/query handler:', err);
    try {
      res.status(500).json({ error: err.message });
    } catch (e) {
      res.end();
    }
  }
};
