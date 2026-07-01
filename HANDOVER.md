# HANDOVER.md — Wisdom of the Doctors

## Project Overview
An AI-powered spiritual guide app that synthesises wisdom from the Catholic Doctors of the Church. Users ask questions about life, morality, and prayer; the app responds with grounded, cited, pastoral guidance drawn from curated passages.

**Current state:** Deployed on Vercel. Single-file HTML frontend + Vercel serverless API functions + Supabase for chat session persistence.

---

## Tech Stack (current)
- **Frontend:** Single-file HTML + vanilla JS + CSS (no framework, no build step)
- **Fonts:** Cinzel (display) + EB Garamond (body) via Google Fonts
- **AI:** Anthropic API (`claude-sonnet-4-6`) — called server-side via `/api/chat`, streamed to client
- **Storage:** Supabase (Postgres) for chat sessions and messages
- **Corpus:** 36 hand-curated passages (12 per Doctor) embedded in the system prompt
- **Deployment:** Vercel (auto-deploys from GitHub on push)

## Infrastructure
- **GitHub:** https://github.com/uncannyal20/wisdom-of-the-doctors
- **Vercel:** Connected to GitHub repo, auto-deploys on push to `master`
- **Supabase:** Hosts `sessions` and `messages` tables

## Environment Variables (set in Vercel dashboard)
| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_API_KEY` | Anthropic API — auto-populated by Vercel integration |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon/public key |

---

## What's Built

### Phases Completed
- **Phase 1** — Vercel serverless proxy (`/api/chat`) moves Anthropic API key server-side
- **Phase 2** — Supabase session persistence (`/api/sessions`, `/api/messages`), streaming responses, mobile sidebar drawer, corpus expanded to 36 passages

### File Structure (current)
```
/
├── api/
│   ├── chat.js        ← proxies Anthropic API, streams SSE response
│   ├── sessions.js    ← GET list / POST create session
│   └── messages.js    ← GET by session_id / POST save message
├── wisdom-of-the-doctors.html  ← entire frontend, single file
├── vercel.json        ← routes / to wisdom-of-the-doctors.html
└── HANDOVER.md        ← this file
```

### Key Functions (in `wisdom-of-the-doctors.html`)
| Function | Purpose |
|----------|---------|
| `buildSystemPrompt(doctor)` | Builds system prompt with relevant corpus passages injected |
| `setDoctor(btn)` | Switches active Doctor, resets conversation |
| `sendMessage()` | Main handler — streams from `/api/chat`, renders word-by-word |
| `parseResponse(text)` | Extracts `SOURCE:` lines from raw AI response |
| `addAIMessage(raw)` | Renders AI response with citation block (used when loading history) |
| `ensureSession(firstMessage)` | Creates a Supabase session on first message |
| `saveMessage(role, content)` | Persists each message to Supabase |
| `loadSessions()` | Fetches and renders past sessions in sidebar |
| `loadSession(id, doctor)` | Loads a past session's messages into the chat |
| `newConversation()` | Resets state and shows welcome screen |
| `toggleSidebar() / closeSidebar()` | Mobile drawer open/close |

### Corpus (embedded in JS)
| Doctor | Key | Passages | Works cited |
|--------|-----|----------|-------------|
| St. Francis de Sales | `sales` | 12 | Introduction to the Devout Life, The Love of God, Consoling Thoughts, Letters of Spiritual Direction |
| St. Augustine | `augustine` | 12 | Confessions, City of God, Sermons on the Psalms, On Christian Doctrine, Sermons |
| St. Thérèse of Lisieux | `therese` | 12 | Story of a Soul, Last Conversations, Letters to Céline |

---

## Supabase Schema

```sql
create table sessions (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  doctor text not null default 'all',
  title text
);

create table messages (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamp with time zone default now()
);
```

---

## Design Rules (preserve these)

- **Palette:** `#1A1108` ink bg · `#F5E6C8` vellum text · `#C9A84C` gold accent · `#3D2B1F` walnut panels · `#6B3E26` earth (user bubbles)
- **Fonts:** Cinzel (headings, labels, UI chrome) · EB Garamond (body, chat, quotes)
- **Signature element:** Rose window SVG — keep it, don't replace with a generic icon
- **Tone:** Warm, pastoral, never academic or preachy — the AI should feel like a gentle spiritual director
- **Citations:** Always rendered, always below the main response, never inline
- **No harsh UI:** No red errors, no aggressive toasts — error messages stay in the same warm aesthetic

---

## Known Issues / Watch Out For
- `localStorage` saved insights are still saved to localStorage but no longer shown in the sidebar (sidebar now shows sessions). Either wire up a journal view or remove the save button in a future pass.
- Switching Doctor mid-conversation resets the session ID but does not clear the chat visually — the next message creates a new session correctly, but old messages remain on screen.
- No rate limiting or auth — fine for personal use, add before any public launch.
- Session titles are the first 60 chars of the first user message — not always meaningful. Could improve with a title-generation step.

---

## Phase 3 — Real RAG (action plan)

### What it achieves
Replace the 36 hardcoded passages with semantic search over a much larger corpus. The app will find the most relevant passages for each specific question rather than always injecting the same fixed set.

### Step 1 — Enable pgvector in Supabase
In the Supabase SQL editor, run:
```sql
create extension if not exists vector;
```

### Step 2 — Create the corpus table
```sql
create table corpus (
  id uuid default gen_random_uuid() primary key,
  doctor text not null,           -- 'sales' | 'augustine' | 'therese' | etc.
  work text not null,             -- e.g. 'Introduction to the Devout Life'
  chapter text,                   -- optional
  content text not null,          -- the passage text
  embedding vector(1536),         -- OpenAI text-embedding-3-small dimension
  created_at timestamp with time zone default now()
);

-- Index for fast similarity search
create index on corpus using ivfflat (embedding vector_cosine_ops) with (lists = 100);
```

### Step 3 — Choose an embedding model
Anthropic does not provide an embedding model. Two options:

| Option | Model | Cost | Notes |
|--------|-------|------|-------|
| **OpenAI** (recommended) | `text-embedding-3-small` | ~$0.02 per 1M tokens | Best quality, needs OpenAI API key |
| **Supabase AI** | `gte-small` (built-in) | Free | Lower quality, no extra API key needed |

Add `OPENAI_API_KEY` to Vercel environment variables if using OpenAI.

### Step 4 — Source the corpus texts
Download full public-domain works from:
- **CCEL** (ccel.org) — Introduction to the Devout Life, Confessions, Story of a Soul
- **Project Gutenberg** (gutenberg.org) — additional works

Target texts per Doctor:
- St. Francis de Sales: Introduction to the Devout Life, The Love of God, Letters
- St. Augustine: Confessions, City of God, On Christian Doctrine, Sermons
- St. Thérèse: Story of a Soul, Letters, Last Conversations

### Step 5 — Build the ingestion script
Create `scripts/ingest.js` (runs once locally, not deployed):

```javascript
// Pseudocode — flesh out per chosen embedding provider
// 1. Read source text files
// 2. Chunk into ~300-word segments with overlap
// 3. For each chunk:
//    a. Call embedding API to get vector
//    b. Insert into Supabase corpus table (doctor, work, chapter, content, embedding)
// 4. Log progress
```

Run with: `node scripts/ingest.js`

### Step 6 — Create `/api/query.js` (replaces `/api/chat.js` logic)
New flow:
1. Receive user question + doctor filter + conversation history
2. Embed the user question using the same embedding model
3. Query Supabase for top 5–8 most similar corpus chunks:
   ```sql
   select content, work, doctor
   from corpus
   where doctor = $1  -- or omit for 'all'
   order by embedding <=> $2  -- cosine similarity
   limit 8;
   ```
4. Build system prompt injecting only those top-k passages
5. Call Anthropic Claude with streaming (same as current `/api/chat.js`)
6. Stream response back to client

### Step 7 — Update the frontend
- Change `fetch('/api/chat', ...)` → `fetch('/api/query', ...)`
- Remove the hardcoded `CORPUS` object from the HTML (no longer needed)
- No other UI changes required — citations and streaming already work

### Step 8 — Add remaining Doctors (Phase 4 prep)
Once RAG is in place, adding a new Doctor is just:
1. Ingest their texts into the corpus table with the correct `doctor` key
2. Add a button to the sidebar Doctor selector
3. Add their name to `DOCTOR_LABELS`

No prompt or code changes needed — the search handles it.

---

## Phase 4 — Scaling (future)
- Add remaining 34 Doctors of the Church (easy once RAG is live)
- Doctor profile pages (bio, key works, spiritual charism)
- Suggested follow-up questions after each response
- Weekly reflection feature — curated passage of the day
- Auth (Supabase Auth) so sessions are tied to a user account
- Reflection journal — dedicated view for saved insights
