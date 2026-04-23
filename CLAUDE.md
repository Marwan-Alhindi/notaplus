# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # dev server on http://localhost:3000 (falls back to 3001 if taken)
npm run build      # next build — compiles, type-checks, collects page data
npm start          # next start — production server, used by Render
npm run lint       # next lint
```

No test suite is configured. `package.json` scripts: `dev`, `build`, `start`, `lint`.

## Architecture — read this before touching API/LLM code

This is a **Next.js 15 Pages Router** app. The Pages Router does **not** honor the `"use server"` directive — any file under `src/pages/api/*` that is imported by a client component gets bundled into the browser. That's why earlier versions of this repo shipped the OpenAI key into the client bundle.

The current layout enforces a hard client/server boundary:

- **`src/server/`** — server-only modules. Safe to `import` here: OpenAI/LangChain clients, embeddings, Supabase queries. Must NEVER be imported from a file under `src/components/` or `src/pages/` (excluding `src/pages/api/*`).
  - `notesDb.ts` — all DB CRUD (documents, notebooks, writtenNotes) + `OpenAIEmbeddings` + `SupabaseVectorStore` + `retriever` + `retrieveRelevantNotes`
  - `llmConversation.ts` — RAG chat chain (`progressConversation`)
  - `llmHandlePdf.ts` — PDF→structured-notes chain (`processPDF`)

- **`src/pages/api/`** — thin dispatcher API routes. They import from `src/server/` and expose functionality over HTTP POST.
  - `vectorsDatabase.ts` — `POST { action, args }`. Actions are whitelisted in an `allowedActions` Set. **Add new server functions to the whitelist here** when exposing them to the client.
  - `llmConversation.ts` — `POST { question, userId }`
  - `llmHandlePdf.ts` — `POST { pdfData }`
  - `llmCreateQuiz.ts` — server endpoint exists but **no UI currently calls it**
  - `extractPdfText.ts` — entire file commented out (stale AWS Textract attempt; `tesseract.js` in deps is also unused)

- **`src/lib/clientApi.ts`** — fetch-based wrappers with the same function signatures as the old server module. Client components import from here, never directly from `src/pages/api/*` or `src/server/*`.

### Rule of thumb

When adding a feature that touches OpenAI/embeddings/DB:

1. Implement the logic in `src/server/` (add to `notesDb.ts` or a new file).
2. If the client needs it, add the action name to the `allowedActions` Set in `src/pages/api/vectorsDatabase.ts` (or create a new dispatcher route).
3. Add a thin fetch wrapper to `src/lib/clientApi.ts` with the same signature as the server function.
4. Client components import from `@/lib/clientApi`.

If you find yourself wanting to `import X from "@/pages/api/..."` in a client component, stop — that's the anti-pattern this structure exists to prevent.

## Data model

Three application tables, all in `public` schema, all scoped by `user_id` (UUID referencing `auth.users.id`):

- **`documents`** — markdown notes. One row per chunk (for vector search) plus one `full_note=true` row per note. Has `embedding` (pgvector), `note_id`, `is_deleted`, `is_quizable`, `notebook`, `tags`, `is_new`.
- **`notebooks`** — `{ name, user_id }`. Foreign key to `auth.users.id` blocks deleting users until notebooks are removed.
- **`writtenNotes`** — handwritten notes with `strokesData` (perfect-freehand vectors) and `noteContent`.

Vector similarity uses `SupabaseVectorStore` on `documents` with `queryName: 'match_documents'` — the SQL function must exist in the DB.

## Auth

- Supabase Auth via `@supabase/supabase-js` and `@supabase/ssr`.
- Login page is at **`/`** (root), not `/login`. Signup at `/signup`, password reset at `/forgot-password`.
- Protected pages use `src/utils/useAuth.ts` which calls `client.auth.getSession()` and redirects to `/` if none.
- After email confirmation, Supabase redirects to `Site URL + #access_token=...`. The fragment is parsed client-side by `supabase-js` (`detectSessionInUrl: true` is default).
- `is_quizable` on `documents` is just a toggle flag — there is no working quiz generator in the UI.

## Environment variables

Required at build time (because `NEXT_PUBLIC_*` vars are baked into the client bundle):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Required at runtime (server-only):

- `OPENAI_API_KEY`

Local dev: put them in `.env.local` (gitignored). Production (Render): set in the service's Environment tab.

Note: `next.config.ts` also re-exports these as non-prefixed `SUPABASE_URL` / `SUPABASE_ANON_KEY` via `env:`, but the code reads the `NEXT_PUBLIC_*` forms — the `env:` re-export is legacy and can be ignored.

## Database access (local)

Supabase's free tier makes the direct DB host (`db.<ref>.supabase.co`) **IPv6-only**, so from most home networks `psql` can't resolve it. Use the **Session pooler** instead:

```
psql -h aws-1-ap-southeast-2.pooler.supabase.com -p 5432 -U postgres.<project-ref> -d postgres
```

The pooler username is `postgres.<project-ref>` (not `postgres`).

## Deployment

- Hosted on **Render** as a Web Service. Public URL: https://notaplus-jnt3.onrender.com
- Build command: `npm install && npm run build`
- Start command: `npm start`
- Free tier spins down after ~15 min idle; first request after idle cold-starts (~30-60s).
- Supabase project is `rqlvbgugxotyylljwwyy` in `ap-southeast-2` (Sydney). Site URL / redirect URLs in Supabase Auth must include the Render domain for email confirmation and OAuth to work.
