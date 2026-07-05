# Wisdom of the Doctors — Enhancements & Upgrades Tracker

This document tracks planned feature enhancements, architectural changes, and future milestones for the *Wisdom of the Doctors* spiritual guide web application.

---

## 1. Feature: In-Memory Past-Conversation Recall

### Overview
Enable the AI Spiritual Guide to reference past chat sessions dynamically. This allows the guide to provide a continuous, contextually aware companion experience across multiple separate conversations (e.g., recalling past struggles, resolutions, or preferred Saints).

### Approved Architecture (Hybrid Option A + Option B)
We will combine **Client-Side Summary Injection** with a **Lightweight Spiritual Profile**:

```
[ Supabase (Encrypted At Rest) ]
  ├── Sessions Table (Contains encrypted summaries of last 30 sessions)
  └── User Profile Table (Contains encrypted "Spiritual Profile" card)
               │
               ▼ (Client-Side Fetch & Decrypt)
[ Browser Memory (Local State) ]
  ├── Decrypted Past Summaries (Option A)
  └── Decrypted User Spiritual Profile (Option B)
               │
               ▼ (HTTPS payload with current message thread)
    [ /api/query (Vercel Serverless) ] ──> [ Claude LLM API ]
```

1.  **Client-Side Context Injection (Option A)**:
    *   The browser already fetches and decrypts past session summaries for the sidebar.
    *   When sending a user query, the frontend will append these decrypted summaries (from the last $N$ sessions) into the `messages` history or payload.
2.  **Encrypted Spiritual Profile (Option B)**:
    *   We will store a single, encrypted `spiritual_profile` text block in the database.
    *   At the end of a session (or during summarization), Claude will incrementally update this profile (e.g., summarizing core themes, favored saints, and active practice goals).
    *   This profile will be decrypted client-side at startup and passed alongside the query context.

### Security & Privacy Constraints
*   **Zero Server-Side Plaintext / Vector Leakage**: All raw messages and profiles remain encrypted via `crypto.js` before saving to Supabase.
*   **Client-Side Decryption Only**: Decryption is strictly handled client-side. The API routes will handle plaintext only during transit to the LLM over secure HTTPS.
*   **No server-side vector databases** will be used on user chat histories to prevent semantic leakage.

---

## Future Enhancements
*   *Corpus Expansion*: Ingest remaining Doctors of Church.
*   *Suggested Follow-up Questions*: Generate context-aware prompts dynamically.
*   *Daily Devotional Push*: Add a morning reflection generator card.
