# Smith's Advice Builder

Internal document generation tool for Smith's Insurance & KiwiSaver. Generates Statement of Advice (SOA), Record of Advice (ROA), and Scope of Engagement (SOE) documents using AI-powered extraction and writing, rendered through customizable HTML templates and converted to pixel-perfect A4 PDFs.

## Features

- **LLM-powered document generation** via OpenAI (default) or Anthropic Claude
- **Two-step pipeline**: Extract structured data from transcripts/quotes, then write professional section content
- **Nunjucks HTML templates** stored in DB with versioning and rollback
- **Playwright Chromium PDF** generation with A4 print CSS
- **File upload support**: PDF, TXT, MD via drag-and-drop or paste
- **Existing cover logic**: Automatic comparison layout vs. new cover layout
- **Individual and Partner** case types
- **Cookie-based auth** with bcrypt password hashing (2 users)
- **Ephemeral by default**: Client data not permanently stored unless explicitly saved

## Tech Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4
- PostgreSQL + Prisma ORM
- Playwright (Chromium) for PDF generation
- Nunjucks for template rendering
- OpenAI SDK / Anthropic SDK
- Zod for runtime validation
- iron-session for auth

## Quick Start (Local Development)

### Prerequisites
- Node.js 20+
- PostgreSQL running locally (or use Docker Compose)
- OpenAI API key

### 1. Clone and install

```bash
git clone <repo-url>
cd smiths-advice-builder
npm install
npx playwright install chromium
```

### 2. Set up environment

```bash
cp .env.example .env
# Edit .env with your values (especially OPENAI_API_KEY, DATABASE_URL, SESSION_SECRET)
```

### 3. Set up database

```bash
npx prisma db push
npm run db:seed
```

### 4. Run dev server

```bash
npm run dev
```

Open http://localhost:3000 and sign in with the seeded credentials.

## Docker Deployment

### Using Docker Compose

```bash
# Set your env vars
export OPENAI_API_KEY=sk-...
export SESSION_SECRET=your-secret-at-least-32-chars

# Build and run
docker compose up -d
```

The app will be available at http://localhost:3000.

### Deploy to Render / Fly / Railway

1. Push to a Git repository
2. Connect to your hosting platform
3. Set environment variables (see `.env.example`)
4. Ensure the platform supports Docker builds
5. The Dockerfile handles Playwright Chromium installation

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | - | 32+ char secret for session encryption |
| `APP_BASE_URL` | No | http://localhost:3000 | Base URL for the app |
| `OPENAI_API_KEY` | Yes | - | OpenAI API key |
| `OPENAI_MODEL` | No | gpt-4.1 | OpenAI model to use |
| `ANTHROPIC_API_KEY` | No | - | Anthropic API key (if using Claude) |
| `LLM_PROVIDER` | No | openai | `openai` or `anthropic` |
| `DATA_DIR` | No | /data | Directory for PDF storage |
| `RETENTION_DAYS` | No | 7 | Days before saved cases are eligible for cleanup |
| `SEED_USER_1_EMAIL` | No | henry@smiths.net.nz | First user email |
| `SEED_USER_1_PASSWORD` | No | changeme123 | First user password |
| `SEED_USER_2_EMAIL` | No | craig@smiths.net.nz | Second user email |
| `SEED_USER_2_PASSWORD` | No | changeme123 | Second user password |

## Project Structure

```
src/
├── app/                    # Next.js pages and API routes
│   ├── api/               # REST API endpoints
│   ├── cases/[id]/        # Case workspace page
│   ├── login/             # Login page
│   └── templates/         # Template admin page
├── components/            # React UI components
├── lib/
│   ├── auth.ts            # Session management
│   ├── db.ts              # Prisma client
│   ├── generation/        # Full pipeline orchestration
│   ├── llm/               # LLM provider abstraction
│   ├── parsing/           # File text extraction
│   ├── pdf/               # Playwright PDF generation
│   └── templates/         # Nunjucks rendering + defaults
└── middleware.ts           # Auth protection
```

## Template System

Templates are stored in the database and editable via the `/templates` admin page. Each template is a Nunjucks HTML file that receives context variables like `{{ CLIENT_NAME }}`, `{{ HAS_EXISTING_COVER }}`, etc.

Templates support `{% if %}` blocks for conditional sections (e.g., existing cover comparison vs. new cover only layout).

The system ships with default templates that match the Smith's brand. Users can paste custom HTML templates via the admin interface.

## Cover Layout Logic

```
If client_type = individual:
   HAS_EXISTING_COVER = clientA_has_existing_cover

If client_type = partner:
   HAS_EXISTING_COVER = clientA_has_existing_cover OR clientB_has_existing_cover

NEW_COVER_ONLY = NOT HAS_EXISTING_COVER
```

If either partner has existing cover, the comparison layout is used for both. No mixed layouts.
