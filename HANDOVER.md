# HANDOVER.md — Wisdom of the Doctors

## Project Overview
An AI-powered spiritual guide app that synthesizes wisdom from the Catholic Doctors of the Church. Users ask questions about life, morality, and prayer; the app responds with grounded, cited, pastoral guidance drawn from semantic vector search matching.

**Current State:** Fully deployed on Vercel. Single-file HTML frontend with dynamic side-navigation panels + Vercel serverless API functions + Supabase database with Google Auth, Row-Level Security, and symmetric database encryption.

---

## Tech Stack (Current)
*   **Frontend:** Single-file HTML + vanilla JS + CSS (no heavy frameworks, zero build step)
*   **Fonts:** Cinzel (display & headers) + EB Garamond (body, chat, quotes) via Google Fonts
*   **AI Backend:** Anthropic API (`claude-sonnet-4-6`) called server-side via `/api/query` and streamed via Server Sent Events (SSE).
*   **Vector Embeddings & RAG:** Gemini Embedding (`gemini-embedding-001`) embeds user queries client-side and triggers a vector similarity search (`RPC match_corpus`) in Supabase to inject context.
*   **Symmetric Database Encryption:** Sensitive user data (session titles, message content, saved insights, and reflection summaries) are encrypted transparently client-side via Node's `crypto` module (AES-256-CBC) before being saved to Supabase, and decrypted upon retrieval.
*   **Authentication:** Supabase Auth (Google OAuth login) protects the client with a full-screen welcome gate and secures database entries via PostgreSQL Row-Level Security (RLS) policies.
*   **Storage:** Supabase PostgreSQL hosts `sessions`, `messages`, `insights`, and `corpus` vector tables.

---

## Environment Variables (set in Vercel)
| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_API_KEY` | Claude generation key |
| `GEMINI_API_KEY` | Gemini embedding generation key |
| `SUPABASE_URL` | Supabase API domain |
| `SUPABASE_ANON_KEY` | Supabase public key |
| `ENCRYPTION_KEY` | 32-byte secret key used for AES-256 symmetric encryption |

---

## File Structure
```
/
├── api/
│   ├── query.js        ← executes Gemini embedding + Supabase RPC search + Anthropic prompt streaming
│   ├── config.js       ← exposes public Supabase URL & Key to client securely
│   ├── crypto.js       ← reusable AES-256-CBC encrypt/decrypt methods
│   ├── sessions.js     ← GET, POST, and DELETE endpoints for user conversations (encrypted titles)
│   ├── messages.js     ← GET and POST endpoints for conversation chat logs (encrypted content)
│   ├── insights.js     ← GET, POST, and DELETE endpoints for saved quotes (encrypted contents)
│   └── summarize.js    ← fetches logs and queries Claude for spiritual reflection summaries
├── wisdom-of-the-doctors.html  ← main frontend (chat interface, modal cards, custom markdown parsers)
├── vercel.json         ← routes API calls and configures SPA fallback
├── supabase_setup.sql  ← database tables, RPC matching, and RLS policies
└── HANDOVER.md         ← this file
```

---

## Supabase Schema

```sql
-- 1. Enable pgvector
create extension if not exists vector;

-- 2. Sessions table
create table sessions (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  doctor text not null default 'all',
  title text, -- AES-256 encrypted title
  summary text, -- AES-256 encrypted journey summary
  user_id uuid references auth.users(id) on delete cascade default auth.uid()
);

-- 3. Messages table
create table messages (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null, -- AES-256 encrypted content
  created_at timestamp with time zone default now()
);

-- 4. Insights table
create table insights (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  session_id uuid references sessions(id) on delete cascade,
  doctor text not null,
  content text not null, -- AES-256 encrypted content
  created_at timestamp with time zone default now()
);

-- 5. Semantic Corpus table (RAG matches)
create table corpus (
  id uuid default gen_random_uuid() primary key,
  doctor text not null,
  work text not null,
  chapter text,
  content text not null,
  embedding vector(768), -- Gemini embedding dimension
  created_at timestamp with time zone default now()
);
```

---

## Design Guidelines

*   **Palette:** `#1A1108` ink bg · `#F5E6C8` vellum text · `#C9A84C` gold accent · `#3D2B1F` walnut panels · `#6B3E26` user bubble.
*   **Fonts:** Cinzel (navigation links, badges, UI chrome) · EB Garamond (body paragraph, chat boxes, modals, quotes).
*   **Works Cited Location:** Positioned next to the dynamic mode label (`#mode-label` badge) in the top header Actions bar.
*   **Pinned Auth Section:** Pinned to the absolute bottom of the sidebar. The lists above scroll vertically under `.sidebar-content` while the sign-out panel remains stationary.
*   **AI Persona:** Gentle, wise spiritual director. No bullet points, numbered lists, or bolded headers. Brief direct quotes are woven into the narrative using italics (`*quote*`) in a warm gold color (`#C9A84C`).
*   **Citations:** citation containers (`.citation-block`) are hidden behind a toggle button `[Sources]` by default. Clicking the toggle expands the citation card cleanly.

---

## Key Features Built & Completed

1.  **Google OAuth Login Welcome Gate:** Added full-screen welcome overlay `#login-overlay` that blocks guests and initializes Supabase Client safely with localized warning diagnostics.
2.  **Symmetric Encryption Layer:** Built `api/crypto.js` to cryptographically secure session titles, message bodies, saved insights, and reflection summaries on the database.
3.  **Collapsible Sidebar:** A border-aligned triangular toggle button collapses the sidebar to `0px` width smoothly on desktop. On mobile, it is controlled by an elegant, vertically centered pull-handle (`▶` to open, `◀` to close) pinned directly to the left edge of the screen, removing header clutter and making drawer transitions highly intuitive.
4.  **Journey Takeaway Summaries:** A "Summarize Journey" button located in the sidebar beneath the Saved Insights list triggers Claude via `api/summarize.js` to compile the chat logs and return a reflection card, which can be saved to Supabase (instantly cached for future views) and regenerated. Conversations with a saved reflection show a custom gold scroll icon (📜) in the sidebar's Past Sessions list for quick access.
5.  **Sidebar Past Conversations List:** Users can delete past chats directly by clicking a hover-triggered `×` delete button.
6.  **Sidebar Saved Insights List:** Users can view saved insights in a scrollable list, delete them directly with a hover-triggered `×` delete button, or click to view the full text inside an overlay card.
7.  **Doctor Profiles Page ("Doctor Who?"):** Integrates a dynamic profile explorer screen displaying saints' biographies, custom tags (`Doctor of the Church` vs. `Close Friend of the Doctors`), and dynamic photo queries matching Wikipedia's PageImages API at launch.
8.  **Font Sizing & Scale Accessibility:** Refactored the text-size tool into an elegant vertical floating side-panel that stays hidden when not in use. Tapping a floating circular "A" button expands the "A+" and "A-" adjustment controls, which automatically auto-close after 4 seconds of inactivity or when clicking outside. Scaling dynamically adjusts primary layout components (chat feed, inputs, profile panels, works cited cards, and modals) between `80%` and `160%` and is persisted in `localStorage`.
9.  **Universal Hash-Based SPA Routing & Back Swipe:** Migrated client transitions (`sources`, `doctors`, `menu` drawer, and summary modals) to URL hashes (`#/sources`, `#/doctors`, `#/menu`, `#/modal`). Swiping right or pressing back on mobile devices natively dismisses overlays or returns users to the primary chat panel.
10. **Scrollable Header Auto-Hide:** Implemented scroll-spy on the chat feed to automatically slide the top header out of layout (via `-60px` margins) when scrolling down, and instantly restore it when scrolling up or tapping a 12px touch handle at the top edge.
11. **Complete Corpus RAG Ingestion & Database RLS Lockdown:** Uploaded all seed files (36 seed passages + 6 custom files) in `corpus/` with Gemini embeddings, then locked down the Supabase `corpus` table with a public read-only RLS policy.
12. **Installable PWA Support (Chrome/Safari):** Configured full Web App Manifest, registered a standard Service Worker with offline assets caching, and generated high-resolution 192x192 and 512x512 PNG icons from the original SVG vector to trigger native mobile install prompts (e.g. Chrome's "Add to Home Screen").
13. **Randomized Saint Welcome Quotes:** Implemented a selection of 10 curated, authentic spiritual quotes from St. Augustine, St. Teresa of Ávila, St. Francis de Sales, St. Alphonsus Liguori, and St. Louis de Montfort. The landing page welcome screen dynamically randomizes the active quote on app startup and whenever a new conversation session is initialized.
14. **Draggable Preference Panel:** Refactored the text-size floating panel into a draggable overlay. Users can click-and-drag or touch-and-drag the circular **A** handle to position it anywhere on their screen. The position is bound to the viewport and saved in `localStorage` to persist across reloads, preventing it from obstructing input elements or text.
15. **Light Parchment Theme Switcher:** Implemented a new, high-contrast light vellum theme reversing the CSS custom properties to present a warm, paper-like background with dark walnut-brown typography and soft sepia highlights. The toggle button (`🌓`) is integrated inside the expanded preferences panel and saved to `localStorage`.

---

## Future Scope / Scaling

*   **Corpus Expansion:** Ingest more of the 34 remaining Doctors of the Church into the Supabase `corpus` table.
*   **Suggested follow-up questions:** Generate dynamic spiritual reflection prompts based on the current context.
*   **Daily Devotion Push:** Add a daily passage generator providing a reflection card every morning.
