import os
import json
import urllib.request
import urllib.error

def load_env():
    env = {}
    env_path = os.path.join(os.path.dirname(__file__), '../.env')
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    key_val = line.split('=', 1)
                    if len(key_val) == 2:
                        env[key_val[0].strip()] = key_val[1].strip()
    return env

def test_query_flow():
    env = load_env()
    supabase_url = env.get('SUPABASE_URL')
    supabase_anon_key = env.get('SUPABASE_ANON_KEY')
    gemini_key = env.get('GEMINI_API_KEY')
    anthropic_key = env.get('ANTHROPIC_API_KEY')

    print("=== TESTING COMPLETE /api/query FLOW ===")
    user_query = "How do I find peace when life is chaotic?"

    # 1. Get embedding
    print("1. Generating Gemini embedding...")
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key={gemini_key}"
        payload = {
            "model": "models/gemini-embedding-001",
            "content": {
                "parts": [{"text": user_query}]
            },
            "outputDimensionality": 768
        }
        req = urllib.request.Request(
            url, 
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        with urllib.request.urlopen(req) as res:
            data = json.loads(res.read().decode('utf-8'))
            embedding = data.get('embedding', {}).get('values', [])
            print("   ✅ Gemini Embedding size:", len(embedding))
    except Exception as e:
        print("   ❌ Gemini Embedding failed:", str(e))
        return

    # 2. Query Supabase
    print("2. Querying Supabase match_corpus RPC...")
    matches = []
    try:
        url = f"{supabase_url}/rest/v1/rpc/match_corpus"
        payload = {
            "query_embedding": embedding,
            "match_threshold": 0.3,
            "match_count": 6,
            "filter_doctor": "all"
        }
        headers = {
            'apikey': supabase_anon_key,
            'Authorization': f"Bearer {supabase_anon_key}",
            'Content-Type': 'application/json'
        }
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode('utf-8'),
            headers=headers,
            method='POST'
        )
        with urllib.request.urlopen(req) as res:
            matches = json.loads(res.read().decode('utf-8'))
            print("   ✅ Supabase Matches found:", len(matches))
    except urllib.error.HTTPError as e:
        print("   ❌ Supabase RPC HTTP Error:", e.code, e.read().decode('utf-8'))
    except Exception as e:
        print("   ❌ Supabase RPC failed:", str(e))

    # 3. Call Anthropic Claude
    print("3. Calling Anthropic Claude API...")
    doctor_names = {
      "sales": "St. Francis de Sales",
      "augustine": "St. Augustine",
      "therese": "St. Thérèse",
      "aquinas": "St. Thomas Aquinas",
      "liguori": "St. Alphonsus Liguori",
      "benedict": "St. Benedict",
      "more": "St. Thomas More",
      "teresa": "St. Teresa of Ávila",
      "montfort": "St. Louis de Montfort"
    }
    
    doctor_titles = {
      "sales": "Doctor of Devotion (1567–1622)",
      "augustine": "Doctor of Grace (354–430)",
      "therese": "Doctor of the Little Way (1873–1897)",
      "aquinas": "Doctor Angelicus (1225–1274)",
      "liguori": "Doctor Zelantissimus (1696–1787)",
      "benedict": "Father of Western Monasticism (480–547)",
      "more": "Martyr and Patron of Statesmen (1478–1535)",
      "teresa": "Doctor of Prayer (1515–1582)",
      "montfort": "Apostle of Mary (1673–1716)"
    }

    corpus_text = ""
    for idx, m in enumerate(matches):
        doc_name = doctor_names.get(m.get('doctor'), m.get('doctor'))
        doc_title = doctor_titles.get(m.get('doctor'), '')
        corpus_text += f'\n[RESULT-{idx+1}] From "{m.get("work")}" by {doc_name} ({doc_title}): "{m.get("content")}"\n'

    if not corpus_text:
        corpus_text = "\n(No specific passages retrieved from the knowledge base for this query. Offer generic spiritual guidance matching the Doctor's charism.)\n"

    system_prompt = f"""You are a warm, pastoral AI spiritual guide called the Wisdom of the Doctors. Your mission is to bring the timeless wisdom of the Catholic Doctors of the Church to modern souls seeking guidance on daily life, prayer, morality, and spiritual growth.

You may draw from any of the saints or Doctors of the Church in the knowledge base.

Your persona is:
- Warm, gentle, and encouraging — never harsh or judgmental
- Deeply rooted in the Catholic tradition, always pointing toward God's mercy and love
- Able to translate archaic theological language into modern, accessible English
- Pastoral first: you meet the person where they are, not where you wish they were

KNOWLEDGE BASE (these are the passages dynamically retrieved for this query — treat them as your primary sources):
{corpus_text}

Instructions for every response:
1. Begin with a brief, empathetic acknowledgment of the person's question or struggle (1-2 sentences).
2. Draw from 1-3 relevant passages from the knowledge base above to address their question. Synthesize the wisdom into modern, readable English — do not just quote; explain and apply it to their specific situation. If you use direct quotes from the saints, format them in bold (e.g., **"direct quote"**) for added emphasis.
3. End each response with a "Source" citation formatted exactly like this on its own line:
   SOURCE: [Doctor's name] — "[Work title]"
   (List each source used, one per line starting with SOURCE:)
4. Keep responses warm and personal — use "you" and speak directly to the person.
5. Do not make up quotations or attribute statements to the saints that are not in the knowledge base. If a question falls outside your corpus, say so gently and offer what wisdom you can.
6. Never be dismissive of anyone's pain or struggle. The Little Way of St. Thérèse, the restless heart of Augustine, the gentle encouragement of Francis de Sales — these are your tools of mercy.
7. Keep responses to 150-250 words in the main body (before citations). Use short paragraphs (no more than 3-4 sentences each) and bullet points or numbered lists when giving practical advice to keep it visually digestible and easy to read. Be concise and pastoral, not academic."""

    try:
        url = "https://api.anthropic.com/v1/messages"
        payload = {
            "model": "claude-sonnet-4-6",
            "max_tokens": 1000,
            "system": system_prompt,
            "messages": [{"role": "user", "content": user_query}]
        }
        headers = {
            'Content-Type': 'application/json',
            'x-api-key': anthropic_key,
            'anthropic-version': '2023-06-01'
        }
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode('utf-8'),
            headers=headers,
            method='POST'
        )
        with urllib.request.urlopen(req) as res:
            data = json.loads(res.read().decode('utf-8'))
            print("   ✅ Anthropic Claude Successful!")
            print("   Reply preview:", data.get('content', [{}])[0].get('text')[:200])
    except urllib.error.HTTPError as e:
        print("   ❌ Anthropic Claude HTTP Error:", e.code, e.read().decode('utf-8'))
    except Exception as e:
        print("   ❌ Anthropic Claude failed:", str(e))

if __name__ == "__main__":
    test_query_flow()
