# RAG Chat

A full-stack Retrieval-Augmented Generation (RAG) application. Upload documents, then chat with an AI assistant that answers strictly based on the content you've uploaded — with source citations and no hallucinated fallback to general knowledge.

Built as a portfolio project to demonstrate a complete, production-style RAG pipeline: document ingestion, chunking, embeddings, vector similarity search, and streaming chat.

## Tech Stack

- **Framework:** Next.js 15 (App Router), TypeScript
- **Database:** Neon (serverless Postgres) with the `pgvector` extension
- **ORM:** Prisma 7
- **AI:** OpenAI (`text-embedding-3-small` for embeddings, `gpt-4o-mini` for generation) via Vercel AI SDK
- **Validation:** Zod
- **Testing:** Vitest
- **CI/CD:** GitHub Actions, branch protection, dedicated CI test database (Neon branching)

## Architecture

The RAG pipeline works in two phases:

**Ingestion**

1. User uploads a document (title + text)
2. Text is split into overlapping chunks using a custom recursive character splitter
3. Each chunk is embedded via OpenAI's embedding model
4. Document, chunks, and their embeddings are stored in Postgres (chunks + embeddings written inside a single transaction)

**Retrieval & generation**

1. User's question is embedded
2. Cosine similarity search (`pgvector`) finds the most relevant chunks, filtered by a minimum similarity threshold
3. If no sufficiently relevant chunks are found, the model is **never called** — a deterministic fallback response is returned instead
4. Otherwise, retrieved chunks are injected into the system prompt, and the answer streams back with source citations attached as a structured data part

## Notable design decisions

- **Custom chunking instead of LangChain.** Recursive character splitting with configurable overlap was implemented from scratch rather than using `LangChain.js`'s `RecursiveCharacterTextSplitter`, to keep the dependency surface minimal and to be able to fully explain the chunking strategy.
- **Deterministic guardrail against hallucination.** Early versions relied on prompt instructions alone ("only answer from context") — this was not reliable enough in testing, since the model would sometimes still answer from general knowledge when no relevant context was found. The fix: retrieval results are checked in code, and the model is never invoked at all when no chunk clears the similarity threshold.
- **Similarity threshold tuning.** The minimum cosine similarity threshold (currently `0.5`) was tuned empirically against real queries. Lower thresholds let in weakly-related chunks that caused inconsistent behavior (sources shown, but the model still declining to answer). This is an inherent trade-off in embedding-based retrieval, not fully eliminable with a single numeric threshold.
- **Batched vector writes.** Chunk embeddings are written in a single batched `UPDATE` query (via `Prisma.sql`/`Prisma.join`) instead of one query per chunk, reducing database round-trips.

## Getting started

### Prerequisites

- Node.js 22+
- A [Neon](https://neon.tech) Postgres project with the `pgvector` extension
- An OpenAI API key with available credits

### Setup

```bash
git clone <repo-url>
cd rag-chat
npm install
```

Create a `.env` file based on `.env.example`:
DATABASE_URL="postgresql://...-pooler.../dbname?sslmode=require"
DIRECT_URL="postgresql://.../dbname?sslmode=require"
OPENAI_API_KEY="sk-..."

Run migrations and generate the Prisma client:

```bash
npx prisma migrate dev
npx prisma generate
```

Start the dev server:

```bash
npm run dev
```

- Upload documents at `/documents`
- Chat with them at `/chat`

### Running tests

```bash
npm test
```

## CI/CD

- GitHub Actions runs lint, typecheck, and tests on every PR
- `main` is protected: PRs require passing checks before merge
- Tests run against a dedicated, schema-only Neon branch, isolated from the development database

## Known limitations / future work

- **No persistent chat history.** Conversations live only in client-side React state and are lost on page reload. Adding persistence would require a `Conversation`/`Message` schema and, to scope history per user, authentication (e.g. Auth.js) — deliberately left out of the current scope.
- **Text/Markdown input only.** PDF upload is not yet supported.
- **No document management UI.** Uploaded documents can't currently be listed, viewed, or deleted from the interface.
- **Single-user.** There is no auth layer; all uploaded documents are globally shared.
