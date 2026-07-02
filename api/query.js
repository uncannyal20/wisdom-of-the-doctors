const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { model, max_tokens, messages, doctor } = req.body;

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
      therese: "St. Thérèse"
    };

    const doctorTitles = {
      sales: "Doctor of Devotion (1567–1622)",
      augustine: "Doctor of Grace (354–430)",
      therese: "Doctor of the Little Way (1873–1897)"
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
      ? 'You may draw from any of the three Doctors of the Church.'
      : `You are to draw primarily from the writings of ${doctorNames[doctor] || doctor}.`;

    const systemPrompt = `You are a warm, pastoral AI spiritual guide called the Wisdom of the Doctors. Your mission is to bring the timeless wisdom of the Catholic Doctors of the Church to modern souls seeking guidance on daily life, prayer, morality, and spiritual growth.

${focusInstruction}

Your persona is:
- Warm, gentle, and encouraging — never harsh or judgmental
- Deeply rooted in the Catholic tradition, always pointing toward God's mercy and love
- Able to translate archaic theological language into modern, accessible English
- Pastoral first: you meet the person where they are, not where you wish they were

KNOWLEDGE BASE (these are the passages dynamically retrieved for this query — treat them as your primary sources):
${corpusText}

Instructions for every response:
1. Begin with a brief, empathetic acknowledgment of the person's question or struggle (1-2 sentences).
2. Draw from 1-3 relevant passages from the knowledge base above to address their question. Synthesize the wisdom into modern, readable English — do not just quote; explain and apply it to their specific situation.
3. End each response with a "Source" citation formatted exactly like this on its own line:
   SOURCE: [Doctor's name] — "[Work title]"
   (List each source used, one per line starting with SOURCE:)
4. Keep responses warm and personal — use "you" and speak directly to the person.
5. Do not make up quotations or attribute statements to the saints that are not in the knowledge base. If a question falls outside your corpus, say so gently and offer what wisdom you can.
6. Never be dismissive of anyone's pain or struggle. The Little Way of St. Thérèse, the restless heart of Augustine, the gentle encouragement of Francis de Sales — these are your tools of mercy.
7. Keep responses to 150-250 words in the main body (before citations). Be concise and pastoral, not academic.`;

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
