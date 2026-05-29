# Comp2100-Website

Backend foundation for a code knowledge base platform. It provides an Express server, environment-based configuration, PostgreSQL wiring, authenticated browsing, search, imports, documentation, and management tools.

## Tech Stack

- Node.js
- Express
- PostgreSQL
- dotenv

## Project Structure

```text
code-knowledge-base/
├── src/
│   ├── app.js
│   ├── server.js
│   ├── config/
│   │   └── env.js
│   ├── db/
│   │   ├── index.js
│   │   ├── pool.js
│   │   ├── setupDatabase.js
│   │   └── runMigrations.js
│   ├── routes/
│   │   └── healthRoutes.js
│   ├── controllers/
│   │   ├── healthController.js
│   │   ├── searchController.js
│   │   └── topicController.js
│   ├── services/
│   │   ├── categoryService.js
│   │   ├── contentService.js
│   │   └── topicService.js
│   └── repositories/
│       ├── categoryRepository.js
│       ├── contentRepository.js
│       └── topicRepository.js
├── migrations/
│   ├── 001_initial_schema.sql
│   └── 002_slug_generation.sql
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Installation

1. Ensure you have Node.js 18+ and PostgreSQL installed.
2. Install dependencies:

```bash
npm install
```

## Configuration

1. Copy the example environment file:

```bash
cp .env.example .env
```

2. Update `.env` with your local values:

```env
PORT=3000
DATABASE_URL=postgresql://<username>@localhost:5432/code_knowledge_db
```

Replace `<username>` with your local PostgreSQL role. On many Mac setups using Homebrew Postgres, this is your macOS username. You can check it with:

```bash
whoami
```

Example for a user named `kennywong`:

```env
DATABASE_URL=postgresql://kennywong@localhost:5432/code_knowledge_db
```

The application, migration runner, and DB setup script all read `DATABASE_URL` from `.env`.

## Database Setup

Create the database if it does not already exist, apply migrations, and verify the required tables with:

```bash
npm run db:setup
```

This command:

- connects using the user from `DATABASE_URL`
- creates the `code_knowledge_db` database if it is missing
- runs all migrations in `migrations/`
- confirms that `categories`, `topics`, and `contents` exist
- prints a success message when setup is complete

If you need to reset the local database during development, do it manually. This project does not drop tables automatically. One common local reset flow is:

```bash
dropdb code_knowledge_db
npm run db:setup
```

## Database Migrations

Run the initial PostgreSQL schema migration with:

```bash
npm run migrate
```

This creates:

- `categories`
- `topics`
- `contents`
- `schema_migrations`

The migration runner applies `.sql` files in the `migrations/` directory in filename order, logs which migrations are applied or skipped, and records applied files in `schema_migrations`.

If PostgreSQL is not running, the database does not exist, or the role in `DATABASE_URL` is invalid, the scripts now print a clear error message explaining what to fix.

To apply a schema change, run:

```bash
npm run migrate
```

After the migration completes, restart the server:

```bash
npm start
```

The second migration adds database-side slug generation triggers for `categories.slug` and `topics.slug`, and the service layer also generates slugs before insert so callers do not need to provide them manually.

## Insert Examples

Create a category:

```bash
curl -X POST http://localhost:3000/categories \
  -H "Content-Type: application/json" \
  -d '{"name":"Data Structures"}'
```

Create a topic:

```bash
curl -X POST http://localhost:3000/topics \
  -H "Content-Type: application/json" \
  -d '{"title":"AVL Tree","categoryId":1}'
```

Test search:

```bash
curl "http://localhost:3000/search?q=AVL%20Tree"
```

Search for a topic that may not exist:

```bash
curl "http://localhost:3000/search?q=Binary%20Search%20Tree%20Insertion%20in%20Java"
```

## Running The App

Start in development mode with automatic reload:

```bash
npm run dev
```

Start normally:

```bash
npm start
```

The server starts on `http://localhost:3000` by default.

## Importing The COMP2100 MiniLab Codebase

Place the Java codebase under `imports/app`, then run:

```text
imports/app/
├── src/
├── test/
└── lib/
    ├── junit-4.13.jar
    └── hamcrest-core-1.3.jar
```

```bash
npm run import:codebase
```

Preview without writing to the database:

```bash
npm run import:codebase:dry
```

Enrich existing imported Java files with deterministic local documentation:

```bash
npm run enrich:codebase
```

This enrichment parses Java source locally to update explanations, complexity notes, and Mermaid `classDiagram` UML stored on the content rows.

The importer creates this category hierarchy with `parent_id` links:

```text
Code Bases
COMP2100 MiniLab
src / test
subdirectories under src and test
```

Only `.java` files under `imports/app/src` and `imports/app/test` become source topics, including normal MiniLab source packages such as `src/censor`. Files under `imports/app/lib`, including `*.jar` dependencies such as JUnit and Hamcrest, are documented in a single `MiniLab Test Dependencies` topic but are not parsed as Java source and do not receive source UML. Re-running the importer is idempotent: existing categories are reused by name and parent, existing topics are reused by filename and category, and the existing content row is updated instead of duplicated. Non-Java files, `.jar`, `.class`, `.DS_Store`, `__MACOSX`, build output directories, and `._*` files are ignored by the Java source importer.

You can also run the same importer from the hidden manager dashboard, or by calling the admin endpoint with an authenticated session cookie:

```bash
curl -c /tmp/akb-admin-cookie.txt \
  -X POST http://localhost:3000/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"zach","password":"hcx1114"}'

curl -X POST http://localhost:3000/admin/import-codebase \
  -b /tmp/akb-admin-cookie.txt \
  -H "Content-Type: application/json" \
  -d '{"path":"imports/app","name":"COMP2100 MiniLab"}'
```

## Health Check

Request:

```http
GET /health
```

Response:

```json
{ "status": "ok" }
```
# Comp2100-Website
