# rago-web

React frontend for [rago](https://github.com/bondhan/rago) — a local RAG (Retrieval-Augmented Generation) application. Upload PDF and TXT files into a knowledge base, then chat with your documents using a locally-running LLM via LM Studio.

---

## Features

- **Drag-and-drop file upload** — supports `.pdf` and `.txt` files, multiple at once
- **Upload history** — shows the last 5 ingested files with size and timestamp; paginated "Show more" for older entries
- **Grounded chat** — ask questions and get answers sourced directly from your documents, with source citations and similarity scores
- **Knowledge base reset** — clear all ingested data with one click
- **Debug logging** — configurable log level via environment variable

---

## Prerequisites

- [Node.js 18+](https://nodejs.org/)
- The [rago](../rago) Go backend running on `http://localhost:8080`

---

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

The Vite dev server proxies all `/v1/*` requests to `http://localhost:8080`, so the backend must be running before you use the app.

---

## Environment variables

Create a `.env.local` file in the project root (never committed) to override defaults:

| Variable | Default | Description |
|---|---|---|
| `VITE_LOG_LEVEL` | `WARN` | Console log level: `DEBUG`, `INFO`, `WARN`, `ERROR`, or `SILENT` |

`.env` (committed) contains the development defaults. `.env.local` overrides them locally.

Example — enable verbose logging during development:

```bash
# .env.local
VITE_LOG_LEVEL=DEBUG
```

---

## Available scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server with hot reload |
| `npm run build` | TypeScript check + production bundle |
| `npm run preview` | Preview the production build locally |
| `npm test` | Run all tests once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with v8 coverage report |

---

## Production build

```bash
npm run build
```

Output goes to `dist/`. Serve the static files from any web server and point your server's `/v1` reverse proxy to the rago backend.

Example — nginx:

```nginx
location /v1/ {
    proxy_pass http://localhost:8080;
}
location / {
    root /srv/rago-web/dist;
    try_files $uri /index.html;
}
```

---

## Application layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  rago                                           [Reset Knowledge Base]│
├──────────────────────────┬──────────────────────────────────────────┤
│  Upload Documents        │  Chat                                    │
│  ┌────────────────────┐  │  ┌──────────────────────────────────────┐│
│  │  drag & drop area  │  │  │  Ask a question about your documents ││
│  │  or click to browse│  │  │                                      ││
│  └────────────────────┘  │  │  [user message bubble]               ││
│                          │  │  [assistant answer + sources]        ││
│  Upload History (N files)│  │                                      ││
│  ┌────────────────────┐  │  └──────────────────────────────────────┘│
│  │ file.pdf  2.0 KB   │  │  ┌──────────────────────────────────────┐│
│  │ notes.txt 512 B    │  │  │  Type a message...          [Send]   ││
│  │ ...                │  │  └──────────────────────────────────────┘│
│  │ [Show more (3 rem)]│  │                                          │
│  └────────────────────┘  │                                          │
└──────────────────────────┴──────────────────────────────────────────┘
```

---

## Component overview

### `App`

Top-level layout. Owns `uploadCount` state — incremented on each successful upload — and passes it as `refreshKey` to `UploadHistory` so the list resets and reloads when a new file is added. Also owns the Reset button with a `window.confirm` guard.

### `FileUpload`

Handles drag-and-drop and click-to-browse file selection. Filters client-side to `.pdf` and `.txt` only. On submit, calls `POST /v1/upload` with a `FormData` payload containing all selected files. Shows per-file status (pending → uploading → done / error) and a summary line ("X chunks ingested from Y files"). Calls `onUploaded()` after a successful upload so the parent can refresh the history.

### `Chat`

Message exchange with the RAG backend. Sends `POST /v1/chat` with the user's question and renders the response as a chat bubble. Each assistant message includes a collapsible source list showing filename, cosine similarity score, and a 200-character chunk preview. Enter sends; Shift+Enter inserts a newline. Auto-scrolls to the latest message.

### `UploadHistory`

Paginated file history. Fetches `GET /v1/uploads?page=1&limit=5` on mount and whenever `refreshKey` changes, replacing (not appending) the list on a fresh load. The "Show more (N remaining)" button fetches the next page and appends results. Formats file sizes (B / KB / MB) and ingestion timestamps.

---

## API client (`src/api/client.ts`)

Thin fetch wrappers around the rago REST API. All functions throw an `Error` with the server's response text on non-2xx responses.

| Function | Method | Path | Description |
|---|---|---|---|
| `uploadFiles(files)` | POST | `/v1/upload` | Upload files (multipart) |
| `chat(message, k?)` | POST | `/v1/chat` | RAG chat — returns answer + sources |
| `query(q, k?)` | POST | `/v1/query` | Semantic search — returns ranked chunks |
| `listUploads(page?, limit?)` | GET | `/v1/uploads` | Paginated upload history |
| `resetDB()` | DELETE | `/v1/reset` | Clear all ingested data |

Default `k` is `5` for both `chat` and `query`.

---

## Logging

All API calls are traced through a lightweight logger in `src/logger.ts`. The active level is read from `import.meta.env.VITE_LOG_LEVEL` on each call, so changing the `.env` file and restarting the dev server takes effect without any code change.

```
DEBUG  — request params for every API call
INFO   — upload and reset actions
WARN   — (default) — nothing logged in normal operation
ERROR  — server error messages on non-ok responses
SILENT — suppress all output
```

---

## Project structure

```
rago-web/
├── src/
│   ├── App.tsx                   # Layout, reset button, uploadCount state
│   ├── main.tsx                  # React entry point
│   ├── logger.ts                 # Levelled console logger
│   ├── vite-env.d.ts             # Vite env type declarations
│   ├── api/
│   │   └── client.ts             # Fetch wrappers for all rago API endpoints
│   ├── components/
│   │   ├── FileUpload.tsx        # Drag-drop upload with status display
│   │   ├── Chat.tsx              # Chat UI with source citations
│   │   └── UploadHistory.tsx     # Paginated ingestion history
│   └── test/
│       ├── setup.ts              # @testing-library/jest-dom + jsdom patches
│       ├── App.test.tsx
│       ├── logger.test.ts
│       ├── api/
│       │   └── client.test.ts
│       └── components/
│           ├── FileUpload.test.tsx
│           ├── Chat.test.tsx
│           └── UploadHistory.test.tsx
├── .env                          # Default env vars (committed)
├── index.html
├── vite.config.ts                # Dev server + /v1 proxy
├── vitest.config.ts              # Test runner + v8 coverage
├── tsconfig.json
└── package.json
```

---

## Running tests

```bash
npm test                  # single run
npm run test:watch        # watch mode
npm run test:coverage     # with coverage report (threshold: 80%)
```

Tests use [Vitest](https://vitest.dev/) + [@testing-library/react](https://testing-library.com/docs/react-testing-library/intro/) + [jsdom](https://github.com/jsdom/jsdom). All API calls are mocked — no backend required to run the test suite.

Coverage is enforced at 80% across statements, branches, functions, and lines.
