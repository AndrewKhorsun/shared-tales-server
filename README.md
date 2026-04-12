# Shared Tales — Backend API

Backend for a collaborative AI-powered book writing application. Built with Express + TypeScript + LangGraph (Anthropic Claude).

## Tech Stack

| Layer          | Technology                               |
| -------------- | ---------------------------------------- |
| HTTP           | Express 4, TypeScript 5                  |
| AI Agents      | LangGraph, @langchain/anthropic (Claude) |
| Database       | PostgreSQL (raw `pg`)                    |
| Authentication | JWT + bcryptjs                           |
| Validation     | Zod                                      |
| Dev tools      | tsx, ESLint, Prettier                    |

## Project Structure

```
backend/
├── server.ts                        # Express app entry point
├── db/
│   ├── index.ts                     # PostgreSQL connection pool
│   └── migrations/                  # SQL migration files (8 files)
├── src/
│   ├── agents/
│   │   ├── shared-tales/
│   │   │   ├── state.ts             # LangGraph state definitions
│   │   │   ├── graph.ts             # Workflow graph
│   │   │   ├── index.ts             # Public agent API
│   │   │   ├── llm.ts               # LLM instances (Haiku + Sonnet)
│   │   │   ├── utils.ts
│   │   │   └── nodes/               # planner, writer, editor, summarizer
│   │   └── checkpointer.ts          # PostgreSQL-backed state persistence
│   ├── routes/                      # Express route handlers
│   ├── middleware/                  # auth, error, validate
│   ├── services/                    # Business logic layer
│   ├── validators/                  # Zod schemas (DTOs)
│   ├── socket.ts                    # WebSocket setup
│   └── config.ts
└── types/                           # TypeScript type definitions
```

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Environment Variables

```bash
cp .env.example .env
```

Fill in `.env`:

```env
PORT=3000
JWT_SECRET=your-super-secret-key

DB_HOST=localhost
DB_PORT=5433
DB_NAME=sharedtails
DB_USER=postgres
DB_PASSWORD=your-password

ANTHROPIC_API_KEY=your-anthropic-key
```

### 3. Start

```bash
# Development (auto-reload)
pnpm run dev

# Production
pnpm run build && pnpm start
```

Server starts at `http://localhost:3000`

---

## API Endpoints

### Health Check

```bash
GET /health
```

```json
{ "status": "ok", "database": "connected", "timestamp": "..." }
```

---

### Auth

| Method | Path                 | Description            |
| ------ | -------------------- | ---------------------- |
| POST   | `/api/auth/register` | Register new user      |
| POST   | `/api/auth/login`    | Login, returns JWT     |
| GET    | `/api/auth/me`       | Current user info (🔒) |

#### Register

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "john", "password": "pass123"}'
```

#### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "john", "password": "pass123"}'
```

```json
{
  "message": "Login successful",
  "token": "eyJhbGci...",
  "user": { "id": 1, "username": "john" }
}
```

All protected endpoints require:

```
Authorization: Bearer YOUR_TOKEN
```

---

### Books (🔒 requires token)

| Method | Path             | Description        |
| ------ | ---------------- | ------------------ |
| GET    | `/api/books`     | Get all user books |
| GET    | `/api/books/:id` | Get single book    |
| POST   | `/api/books`     | Create book        |
| PUT    | `/api/books/:id` | Update book        |
| DELETE | `/api/books/:id` | Delete book        |

#### Create Book

```bash
curl -X POST http://localhost:3000/api/books \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "My First Book",
    "description": "A story about adventures"
  }'
```

---

### Chapters (🔒 requires token)

| Method | Path                              | Description        |
| ------ | --------------------------------- | ------------------ |
| GET    | `/api/books/:bookId/chapters`     | Get all chapters   |
| GET    | `/api/books/:bookId/chapters/:id` | Get single chapter |
| POST   | `/api/books/:bookId/chapters`     | Create chapter     |
| PUT    | `/api/books/:bookId/chapters/:id` | Update chapter     |
| DELETE | `/api/books/:bookId/chapters/:id` | Delete chapter     |

#### AI Generation

| Method | Path                                       | Description                  |
| ------ | ------------------------------------------ | ---------------------------- |
| POST   | `/api/books/:bookId/chapters/:id/generate` | Start AI chapter generation  |
| POST   | `/api/books/:bookId/chapters/:id/feedback` | Approve/reject plan or draft |
| GET    | `/api/books/:bookId/chapters/:id/state`    | Get current generation state |

#### Create Chapter

```bash
curl -X POST http://localhost:3000/api/books/1/chapters \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Chapter 1: The Beginning",
    "order_index": 1
  }'
```

#### Generate Chapter (AI)

```bash
# 1. Start generation
curl -X POST http://localhost:3000/api/books/1/chapters/1/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"hint": "Focus on the protagonist arriving at the castle"}'

# 2. Approve the plan
curl -X POST http://localhost:3000/api/books/1/chapters/1/feedback \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"approved": true}'

# 2b. Or reject with feedback
curl -X POST http://localhost:3000/api/books/1/chapters/1/feedback \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"approved": false, "feedback": "Add more dialogue"}'

# 3. Check state at any time
curl http://localhost:3000/api/books/1/chapters/1/state \
  -H "Authorization: Bearer $TOKEN"
```

---

### Book Plans (🔒 requires token)

| Method | Path                      | Description   |
| ------ | ------------------------- | ------------- |
| GET    | `/api/books/:bookId/plan` | Get book plan |
| POST   | `/api/books/:bookId/plan` | Create plan   |
| PUT    | `/api/books/:bookId/plan` | Update plan   |

#### Create Book Plan

```bash
curl -X POST http://localhost:3000/api/books/1/plan \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "genre": "fantasy",
    "target_audience": "adults",
    "writing_style": "epic",
    "language": "English",
    "generation_settings": {
      "characters": [
        { "name": "Aria", "role": "protagonist", "description": "A young mage", "traits": ["brave", "curious"] }
      ],
      "setting": {
        "world": "Medieval fantasy kingdom",
        "atmosphere": "Dark and mysterious"
      },
      "plot_arc": {
        "premise": "A young mage discovers an ancient prophecy",
        "conflict": "Dark forces seek to destroy the kingdom",
        "resolution": "Hero unites the factions to defeat evil"
      }
    }
  }'
```

---

## AI Agents — LangGraph

### Architecture

Chapter generation is implemented as a LangGraph state machine:

```
START → planner → writer → editor ↻ (up to 3 attempts)
                              ↓
                          summarizer → END
```

| Node       | Model         | Role                                                   |
| ---------- | ------------- | ------------------------------------------------------ |
| planner    | Claude Haiku  | Creates chapter plan, waits for user approval          |
| writer     | Claude Sonnet | Writes chapter text (1000–1500 words)                  |
| editor     | Claude Haiku  | Reviews quality, approves or sends back for revision   |
| summarizer | Claude Haiku  | Creates a brief summary for context in future chapters |

### Checkpointing

State is persisted in PostgreSQL. Thread ID format: `book-{bookId}-chapter-{chapterId}`.
This allows pausing and resuming generation between requests.

### Public API (`src/agents/shared-tales/index.ts`)

```typescript
runChapterGeneration(bookId, chapterId, hint?)     // start generation
sendFeedback(bookId, chapterId, isApprove, text?)  // approve/reject plan
getChapterState(bookId, chapterId)                 // get current state
```

---

## Scripts

```bash
pnpm run dev        # Development with auto-reload
pnpm run build      # Compile TypeScript
pnpm start          # Start production server
pnpm run typecheck  # Type check without compilation
pnpm run lint       # Run ESLint
pnpm run lint:fix   # Auto-fix ESLint errors
pnpm run format     # Format with Prettier
pnpm run check      # typecheck + lint + format check
```

---

## Deployment

```bash
# On server
git pull origin main
pnpm install
pnpm run build
pm2 restart shared-tales
```

---

## Roadmap

- [x] PostgreSQL integration
- [x] TypeScript strict mode
- [x] JWT authentication
- [x] CRUD for books, chapters, book plans
- [x] LangGraph AI agents for chapter generation
- [x] PostgreSQL checkpointing for agents
- [ ] Testing infrastructure (Vitest + Supertest)
- [ ] Repository Layer
- [ ] Service Layer
- [ ] Authorization Policy
- [ ] Structured logging (Pino)
- [ ] Rate limiting
- [ ] Security hardening (JWT, params validation)
- [ ] Agent improvements (model selection, timeouts, error handling)
- [ ] Agent response streaming (SSE)

## License

ISC
