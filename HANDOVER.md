# HANDOVER.md — Wisdom of the Doctors

## Project Overview
An AI-powered spiritual guide app that synthesises wisdom from the Catholic Doctors of the Church. Users ask questions about life, morality, and prayer; the app responds with grounded, cited, pastoral guidance drawn from curated passages.

**Current state:** Working single-file HTML proof of concept (`wisdom-of-the-doctors.html`). Live, deployable, no build step.

---

## Tech Stack (current)
- **Frontend:** Single-file HTML + vanilla JS + CSS (no framework, no build step)
- **Fonts:** Cinzel (display) + EB Garamond (body) via Google Fonts
- **AI:** Anthropic API (`claude-sonnet-4-6`) called client-side
- **Storage:** `localStorage` for saved insights (session-scoped)
- **Corpus:** 18 hand-curated passages (6 per Doctor) embedded directly in the system prompt

## Target Stack (next phase)
- **Frontend:** Same single-file HTML, or migrate to Next.js if backend is added
- **Backend:** Supabase (Postgres + pgvector) for real RAG
- **Deployment:** Vercel or GitHub Pages
- **Auth:** Optional — keep open for now

---

## What's Already Built

### UI / UX
- Three-panel layout: sidebar (Doctor selector + saved insights), chat, input area
- Dark parchment aesthetic — near-black background (`#1A1108`), aged vellum text (`#F5E6C8`), illuminated gold accents (`#C9A84C`)
- Fonts: Cinzel for headings/labels, EB Garamond for body
- Gothic rose window SVG motif — pulses while AI is thinking
- Welcome screen with 6 prompt chips
- Doctor selector (All / St. Francis de Sales / St. Augustine / St. Thérèse of Lisieux)
- Typing indicator (3-dot animated)
- Citation block rendered below each AI response
- Save insight → persists to localStorage, appears in sidebar
- Multi-turn conversation history within session
- Responsive: sidebar hidden on mobile

### AI / Prompt
- System prompt built dynamically based on selected Doctor
- Corpus injected as `[KEY-N]` passage references (e.g. `[SALES-0]`, `[AUG-2]`)
- AI instructed to: acknowledge empathetically → synthesise 1–3 passages → cite sources
- `SOURCE:` lines parsed from response and rendered separately in the citation block
- Conversation history sent on every request (full multi-turn context)

### Corpus (embedded in JS)
| Doctor | Key | Passages | Works cited |
|--------|-----|----------|-------------|
| St. Francis de Sales | `sales` | 6 | Introduction to the Devout Life, The Love of God, Consoling Thoughts |
| St. Augustine | `augustine` | 6 | Confessions, City of God, Sermons on the Psalms |
| St. Thérèse of Lisieux | `therese` | 6 | Story of a Soul, Last Conversations |

---

## Key Functions (in `wisdom-of-the-doctors.html`)

| Function | Purpose |
|----------|---------|
| `buildSystemPrompt(doctor)` | Builds system prompt with relevant corpus passages injected |
| `setDoctor(btn)` | Switches active Doctor, resets conversation history |
| `sendMessage()` | Main handler — calls Anthropic API, manages history |
| `parseResponse(text)` | Extracts `SOURCE:` lines from raw AI response |
| `addAIMessage(raw)` | Renders AI response with citation block |
| `saveInsight(text, doctor)` | Saves to localStorage, re-renders sidebar |
| `renderSaved()` | Renders saved insights list in sidebar |

---

## Roadmap / What To Build Next

### Phase 2 — Refinement (priority)
- [ ] **Expand corpus** — add more passages per Doctor (aim for 20+ each)
- [ ] **Improve citation rendering** — link citations to full work titles with optional "read more" context
- [ ] **Reflection journal** — saved insights should be viewable in a dedicated journal view, not just the sidebar
- [ ] **Mobile layout** — re-introduce sidebar as a bottom sheet or modal on small screens
- [ ] **Streaming responses** — switch to SSE streaming so text appears word-by-word

### Phase 3 — Real RAG (Supabase + pgvector)
- [ ] **Corpus ingestion pipeline** — chunk full texts from public domain sources (CCEL, Project Gutenberg), embed with `text-embedding-3-small`, store in Supabase `pgvector`
- [ ] **Backend API route** — `/api/query` endpoint that: takes user question → generates embedding → semantic search against corpus → injects top-k passages into system prompt → calls Claude
- [ ] **Move API key server-side** — never expose Anthropic key in client JS
- [ ] **Source metadata** — store `doctor`, `work`, `chapter`, `paragraph` per chunk so citations are precise

### Phase 4 — Scaling
- [ ] Add remaining 34 Doctors of the Church
- [ ] Doctor profile pages (bio, key works, spiritual charism)
- [ ] Suggested follow-up questions after each response
- [ ] Weekly reflection feature — pushes a curated passage daily

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
- API key is currently called **client-side** — fine for local/personal use, must move server-side before any public deployment
- `localStorage` saved insights are **not synced** across devices — acceptable for Phase 1
- Switching Doctor resets conversation — this is intentional (clean persona boundary), but consider adding a confirmation prompt if the conversation is long
- No rate limiting — add if deploying publicly

---

## File Structure (current)
```
wisdom-of-the-doctors.html   ← entire app, single file
HANDOVER.md                  ← this file
```

## File Structure (target, Phase 3+)
```
/
├── app/
│   ├── page.tsx             ← main UI
│   └── api/query/route.ts   ← backend RAG endpoint
├── lib/
│   ├── corpus.ts            ← passage types and metadata
│   └── supabase.ts          ← db client
├── public/
│   └── fonts/
├── supabase/
│   └── migrations/          ← pgvector setup
└── HANDOVER.md
```
