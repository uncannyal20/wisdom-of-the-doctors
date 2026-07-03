const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load .env
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

async function testAll() {
  console.log("=== DIAGNOSTIC API TEST ===");
  console.log("SUPABASE_URL:", SUPABASE_URL);
  console.log("SUPABASE_ANON_KEY (length):", SUPABASE_ANON_KEY ? SUPABASE_ANON_KEY.length : 0);
  console.log("GEMINI_API_KEY (length):", GEMINI_API_KEY ? GEMINI_API_KEY.length : 0);
  console.log("ANTHROPIC_API_KEY (length):", ANTHROPIC_API_KEY ? ANTHROPIC_API_KEY.length : 0);

  // 1. Test Gemini Embedding
  try {
    const embedUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GEMINI_API_KEY}`;
    const embedResponse = await fetch(embedUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/gemini-embedding-001',
        content: { parts: [{ text: "Hello world" }] },
        outputDimensionality: 768
      })
    });
    
    if (!embedResponse.ok) {
      const err = await embedResponse.text();
      console.error("❌ Gemini Embedding Failed:", embedResponse.status, err);
    } else {
      const data = await embedResponse.json();
      console.log("✅ Gemini Embedding Successful! Vector size:", data.embedding?.values?.length);
    }
  } catch (e) {
    console.error("❌ Gemini Embedding Error:", e.message);
  }

  // 2. Test Supabase match_corpus RPC
  try {
    const fakeEmbedding = Array(768).fill(0.1);
    const sbHeaders = {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    };
    const rpcResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/match_corpus`, {
      method: 'POST',
      headers: sbHeaders,
      body: JSON.stringify({
        query_embedding: fakeEmbedding,
        match_threshold: 0.3,
        match_count: 1,
        filter_doctor: 'all'
      })
    });
    
    if (!rpcResponse.ok) {
      const err = await rpcResponse.text();
      console.error("❌ Supabase match_corpus RPC Failed:", rpcResponse.status, err);
    } else {
      const data = await rpcResponse.json();
      console.log("✅ Supabase RPC Successful! Matches retrieved:", data.length);
    }
  } catch (e) {
    console.error("❌ Supabase RPC Error:", e.message);
  }

  // 3. Test Anthropic API
  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Say hi' }]
      })
    });
    
    if (!upstream.ok) {
      const err = await upstream.text();
      console.error("❌ Anthropic Claude Failed:", upstream.status, err);
    } else {
      const data = await upstream.json();
      console.log("✅ Anthropic Claude Successful! Reply:", data.content?.[0]?.text);
    }
  } catch (e) {
    console.error("❌ Anthropic Claude Error:", e.message);
  }
}

testAll();
