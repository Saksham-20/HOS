# TruckLog Pro – Backend API

Node.js + Express + PostgreSQL backend for the HOS (Hours of Service) trucking app. Runs on **macOS (Intel & Apple Silicon)** with minimal setup.

---

## Quick start (3 commands)

With **Node** and **PostgreSQL** installed on your Mac:

```bash
cd backend
createdb trucklog_pro
npm run setup && npm run dev
```

Then open **http://localhost:3000/health**.  
Seed users: driver `testdriver` / `123456789`, admin `admin` / `admin123`.

---

## Prerequisites

- **Node.js** 18+ (LTS 20 recommended). Use [nvm](https://github.com/nvm-sh/nvm): `nvm use` (reads `.nvmrc`).
- **PostgreSQL** 14+ (local install or Docker).
- **Xcode Command Line Tools** (optional, for some native deps): `xcode-select --install`.

### Install PostgreSQL on macOS

```bash
# Homebrew (Apple Silicon & Intel)
brew install postgresql@16
brew services start postgresql@16

# Or use Postgres.app: https://postgresapp.com/
```

Create the database:

```bash
createdb trucklog_pro
```

---

## Quick start (local)

**One command (recommended):**

```bash
cd backend
npm run setup
```

This will: install dependencies, copy `.env.example` → `.env` if missing, run migrations, and seed the DB. Then start the server:

```bash
npm run dev
```

**Manual steps:**

```bash
cd backend
npm install
cp .env.example .env
# Edit .env: set JWT_SECRET and DB_* (or DATABASE_URL)
npm run migrate
npm run seed
npm run dev
```

- **API:** http://localhost:3000  
- **Health:** http://localhost:3000/health  
- **Docs:** http://localhost:3000/api/docs  

---

## Quick start (Docker)

No local Node or Postgres needed:

```bash
cd backend
docker compose up
```

- Backend: http://localhost:3000  
- Postgres: exposed on localhost:5432 (user `postgres`, password `postgres`, DB `trucklog_pro`).  
- Migrations run automatically on first start. To seed:  
  `docker compose exec backend npx knex seed:run`

Build only:

```bash
docker compose up --build
```

---

## Environment variables

| Variable        | Required | Default        | Description                    |
|----------------|----------|----------------|--------------------------------|
| `JWT_SECRET`   | Yes      | —              | Secret for JWT signing         |
| `DB_HOST`      | No       | `localhost`    | PostgreSQL host                |
| `DB_PORT`      | No       | `5432`         | PostgreSQL port               |
| `DB_USER`      | No       | `postgres`     | DB user                        |
| `DB_PASSWORD`  | No       | `postgres`     | DB password                    |
| `DB_NAME`      | No       | `trucklog_pro` | Database name                  |
| `DATABASE_URL` | No       | —              | Overrides individual DB vars   |
| `PORT`         | No       | `3000`         | Server port                    |
| `HOST`         | No       | `0.0.0.0`      | Server bind address            |
| `NODE_ENV`     | No       | `development`  | Environment                    |
| `CORS_ORIGINS` | No       | (see code)     | Comma-separated CORS origins   |

Copy `.env.example` to `.env` and set at least `JWT_SECRET`. Never commit `.env`.

---

## Migration commands

| Command            | Description                    |
|--------------------|--------------------------------|
| `npm run migrate`  | Run latest migrations          |
| `npm run migrate:dev`  | Same, with NODE_ENV=development |
| `npm run migrate:prod` | Same, with NODE_ENV=production  |
| `npm run migrate:rollback` | Rollback last migration   |
| `npm run seed`     | Run seed files                 |

Database can be recreated from scratch with:

```bash
dropdb trucklog_pro && createdb trucklog_pro
npm run migrate
npm run seed
```

---

## Scripts

| Script        | Description                          |
|---------------|--------------------------------------|
| `npm run setup` | Install, .env from example, migrate, seed |
| `npm start`   | Run server (production)              |
| `npm run dev` | Run with nodemon (development)       |

No global dependencies required.

---

## Health check

- **GET /health** — Returns `{ success, message, timestamp, version, database }`.  
  - `database: "connected"` when DB is reachable.  
  - Status **503** if DB is disconnected.  
- **GET /api/health** — Same response.

The server **fails fast at startup** if the database is unreachable after retries (by default 5 attempts, 2s apart).

---

## Troubleshooting (macOS)

**"Database unreachable at startup"**

- Ensure Postgres is running: `brew services list` or `pg_isready -U postgres`.
- Check host/port: default `localhost:5432`. If using a socket, ensure `DB_HOST` is correct.
- Create DB: `createdb trucklog_pro`.

**"ECONNREFUSED 127.0.0.1:5432"**

- Start Postgres: `brew services start postgresql@16` (or your version).
- On Apple Silicon, Postgres from Homebrew runs on port 5432 by default.

**"Connection terminated unexpectedly" or "Using environment: production"**

- The fix in code: setup now runs migrations with `NODE_ENV=development` so local Postgres (no SSL) works. Run `npm run setup` again.
- If you have `NODE_ENV=production` in your `.env`, that’s for the app; migrations during setup are forced to development.

**"SSL/TLS required"**

- Your Postgres server requires SSL. If you use **DATABASE_URL** (e.g. Render), the app now uses SSL by default.
- For **local** Postgres that requires SSL, add to `.env`: `DB_SSL=true`. To disable SSL: `DB_SSL=false`.

**"relation does not exist"**

- Run migrations: `npm run migrate`.

**Port 3000 already in use**

- Set another port: `PORT=3001 npm run dev`.

**nvm: command not found**

- Install [nvm](https://github.com/nvm-sh/nvm), then `nvm install` and `nvm use` in the backend directory.

---

## Project layout

```
backend/
├── config/           # DB config (Postgres default), env validation
├── knex/             # Knex migrations and seeds
├── scripts/          # setup.js, docker-entrypoint.sh
├── server.js         # Main entry (fail-fast DB, then listen)
├── Dockerfile
├── docker-compose.yml
├── knexfile.js
├── .env.example
├── .nvmrc            # Node 20
└── package.json      # engines.node >= 18
```

API routes live under `/api/*` (auth, drivers, logs, inspections, violations, admin). See **GET /api/docs** for the full list.

---

## Project audit (summary)

| Item | This project |
|------|----------------|
| **Framework** | Express |
| **Database** | PostgreSQL (default), optional MySQL via `DB_DRIVER=mysql` |
| **Migrations** | Knex (no ORM; raw SQL in app) |
| **Env** | `dotenv` + validation in `config/env.js` |
| **Health** | GET `/health` (server + DB status) |
| **Setup** | `npm run setup` → install, .env, migrate, seed |

---

## Exact commands for a fresh Mac

Run these in order (from the repo root or `backend` directory):

```bash
# 1. Go to backend
cd backend

# 2. Create PostgreSQL database (once per machine)
createdb trucklog_pro

# 3. One-command setup (install deps, create .env if missing, migrate, seed)
npm run setup

# 4. Start the server
npm run dev
```

Then:

- **Health:** http://localhost:3000/health  
- **API docs:** http://localhost:3000/api/docs  
- **Driver login:** POST `/api/auth/login` with `{ "username": "testdriver", "password": "123456789" }`  
- **Admin login:** POST `/api/admin/login` with `{ "username": "admin", "password": "admin123" }`

---

## If setup fails: do this step by step (simple version)

Do these in order. Each step is one thing.

**Step 1 – Open Terminal**  
You’re already there if you see something like `nishantpuri@Nishants-MacBook-Air backend %`.

**Step 2 – Go to the backend folder**
```bash
cd /Users/nishantpuri/Desktop/HOS/HOS/backend
```
(Or wherever your project is. Use `cd` until you’re inside the `backend` folder.)

**Step 3 – Check if PostgreSQL is running**  
PostgreSQL is a separate program that must be running before the app can talk to it.
```bash
pg_isready -h 127.0.0.1 -p 5432 -U postgres
```
- If it says **accepting connections**: Postgres is running. Go to Step 4.
- If it says **no response** or an error: start Postgres:
  ```bash
  brew services start postgresql@16
  ```
  (If you have a different version, try `brew services start postgresql`.)  
  Wait a few seconds, then run the `pg_isready` command again.

**Step 4 – Create the database (one time)**  
The app needs a “room” for its data. That room is the database.
```bash
createdb trucklog_pro
```
- If it says **createdb: database "trucklog_pro" already exists**: that’s fine, the room is already there. Go to Step 5.
- If you get “command not found: createdb”, Postgres might not be in your PATH; use the full path or fix your PATH (often after `brew install postgresql@16` you need to add it to your shell).

**Step 5 – Run setup again**
```bash
npm run setup
```
This installs packages, uses your `.env`, and runs migrations (now with development settings so it won’t try SSL on your Mac).  
If this still fails, run the connection test:

**Step 6 – Test the connection (optional)**
```bash
npm run test-db
```
- If it says **Connection successful**: the database is reachable. Then run `npm run dev` to start the server.
- If it fails, the message should tell you what’s wrong (e.g. Postgres not running, wrong password, or database missing).
