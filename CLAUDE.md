# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"Wisdom of the Doctors" is an AI-powered spiritual guide app that synthesizes wisdom from the Catholic Doctors of the Church. Users ask questions about life, morality, and prayer; the app responds with grounded, cited, pastoral guidance drawn from semantic vector search (RAG) over a corpus of saints' writings. See `HANDOVER.md` for the full running log of completed features and design decisions — read it before making UI/UX changes, since it documents non-obvious styling and interaction conventions already in place.

There is no build step and no `package.json`. The frontend is a single static HTML file and the backend is a set of Vercel serverless functions that use only Node built-ins and the global `fetch`.

## Tech Stack

- **Frontend:** `wisdom-of-the-doctors.html` — single-file HTML + vanilla JS + CSS, zero build step. Loads the Supabase JS client from a CDN `<script>` tag.
- **Backend:** Vercel serverless functions in `api/*.js` (CommonJS, `module.exports = async function handler(req, res) {...}`), calling upstream APIs directly via `fetch` — no npm dependencies.
- **AI generation:** Anthropic API (`claude-sonnet-4-6`), called server-side, streamed to the client via SSE.
- **RAG embeddings:** Gemini Embedding (`gemini-embedding-001`, 768 dims) embeds the user's query server-side, then queries Supabase via the `match_corpus` Postgres RPC (pgvector cosine similarity).
- **Database/Auth:** Supabase Postgres (`sessions`, `messages`, `insights`, `corpus` tables) with Google OAuth and Row-Level Security.
- **Encryption:** Sensitive fields (session titles/summaries, message content, saved insights) are AES-256-CBC encrypted server-side (`api/crypto.js`) before writing to Supabase, and decrypted server-side on read. The `corpus` table is public and unencrypted (RLS: public read-only).
- **PWA:** `manifest.json` + `sw.js` service worker cache the static shell for installability/offline.

## Running / Deploying

This is deployed on Vercel with zero local build tooling.

- Local dev: serve the repo root with any static server and let Vercel's dev runtime handle `/api/*` (e.g. `vercel dev`), or deploy directly — there's no bundler to run.
- Env vars (set in Vercel, and optionally in a local `.env` for scripts): `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `ENCRYPTION_KEY`. See `.env.example`.
- `vercel.json` rewrites `/` to `/wisdom-of-the-doctors.html` (SPA-style single entry point).
- **PWA cache busting:** whenever the frontend (`wisdom-of-the-doctors.html`) or any statically-cached asset changes, bump the `CACHE` version string at the top of `sw.js` (e.g. `wisdom-v22` → `wisdom-v23`), or returning users will keep getting the stale cached shell.

## Corpus ingestion

There's no automated test suite. The closest thing to tooling is the corpus ingestion pipeline:

- `scripts/ingest.py` / `scripts/ingest.js` (parallel Python/Node implementations, pick either): 
  - `python3 scripts/ingest.py --seed` — embeds and uploads the ~36 built-in seed passages.
  - `python3 scripts/ingest.py <file_path> <doctor> <work> [chapter]` — chunks a text file (~300 words, 50-word overlap), embeds each chunk with Gemini, and upserts to the Supabase `corpus` table.
- `scripts/ingest_all.py` — orchestrates `--seed` plus ingestion of all files under `corpus/*.txt` for the currently-supported doctors.
- To add a new Doctor of the Church: add a `.txt` source file to `corpus/`, add an entry to `ingest_all.py`'s file list, run ingestion, and add matching entries to the `doctorNames`/`doctorTitles` maps in `api/query.js` (these must stay in sync with the `doctor` filter values used in the frontend's doctor picker).
- `supabase_setup.sql` is the source of truth for the DB schema, the `match_corpus` RPC, and RLS policies — apply it manually in the Supabase SQL editor when standing up a new environment.

`scratch/` contains ad hoc, non-authoritative Python/JS verification scripts and screenshots from prior manual testing sessions — not a maintained test suite.

## Architecture

### Request flow for a chat message

1. Frontend (`wisdom-of-the-doctors.html`, `sendMessage()`) posts the message history + selected `doctor` filter to `POST /api/query`.
2. `api/query.js`:
   - Embeds the latest user message via Gemini (`gemini-embedding-001`, 768 dims).
   - Calls the Supabase `match_corpus` RPC to fetch the top matching passages (filtered by `doctor` unless `'all'`).
   - Builds a system prompt that injects the retrieved passages and strict persona/formatting rules (no bullet points/headers, quotes woven in as italicized prose, citations appended as a `SOURCE:` block at the very end rather than inline).
   - Streams the Claude response back to the client as SSE by piping the upstream Anthropic response body directly through.
3. Frontend parses the streamed text, splits body text from trailing `SOURCE:` lines (`parseResponse()`), and renders citations behind a collapsible `[Sources]` toggle.

Note: `api/chat.js` is a simpler non-RAG passthrough to Anthropic (no embedding/corpus step) and is not currently called by the frontend — `api/query.js` is the one actually wired up.

### Session/message/insight persistence

`api/sessions.js`, `api/messages.js`, `api/insights.js` are thin REST proxies in front of Supabase's PostgREST API (`${SUPABASE_URL}/rest/v1/...`), forwarding the caller's `Authorization` header (or falling back to the anon key) so Supabase RLS applies per-user. Each of these encrypts sensitive text fields on write and decrypts on read using `api/crypto.js`, which is a shared AES-256-CBC helper (key derived from `ENCRYPTION_KEY` via `scryptSync`). `api/summarize.js` fetches and decrypts a session's messages, then asks Claude to produce a structured Markdown "takeaway card" (fixed three-section format), which the frontend can save back onto the session's `summary` field via `PATCH /api/sessions?id=...`.

`api/config.js` exposes the public Supabase URL/anon key to the client at runtime (so they don't need to be hardcoded into the static HTML).

### Frontend structure (`wisdom-of-the-doctors.html`)

Single file, no framework: `<style>` block (~lines 16–998), Supabase CDN script tag, then one large `<script>` block (~lines 1353–2807) holding all app logic. Key functional areas within that script, in rough order:
- Doctor profile explorer ("Doctor Who?") + Wikipedia PageImages lookups (`loadDoctorImages`, `renderDoctorProfiles`).
- Hash-based SPA routing for overlays/panels (`showPage`, hash values like `#/sources`, `#/doctors`, `#/menu`, `#/modal`) so mobile back-swipe/back-button dismisses overlays naturally.
- Font-size and light/dark theme preference panel, draggable, persisted to `localStorage` (`changeFontSize`, `toggleTheme`, `makeDraggable`).
- Supabase auth lifecycle (`initAuth`, `handleSessionChange`, `signInWithGoogle`, `signOut`) gating a full-screen login overlay.
- Sidebar: past sessions list, saved insights list, delete handlers, collapsible drawer (`toggleSidebar`).
- Core chat flow: `sendMessage` (calls `/api/query`, streams and renders SSE), `parseResponse`/`buildCitationsHtml` (splits body vs. citations), `addAIMessage`/`addUserMessage`.
- Journey summary modal: `generateSummary`/`saveReflection`/`regenerateSummary` (calls `/api/summarize`).

Design tokens/persona rules worth preserving when editing (see `HANDOVER.md` for the complete list): ink/vellum/gold/walnut color palette, Cinzel for UI chrome vs. EB Garamond for body/chat text, AI responses must stay free of bullet points/numbered lists/bold headers with quotes rendered in italic gold, and citations must stay hidden behind the `[Sources]` toggle rather than inline.

## Session wrap-up convention

`.agents/AGENTS.md` defines a custom trigger: when the user says `agy-off`, it means wrap up the session — update `HANDOVER.md` with the latest changes/schema/milestones, commit, and push to `master`. Only do this when the user actually invokes it (or explicitly asks for the equivalent); don't do it unprompted.
