# Project Overview

The **Duty Scheduling System (值班排班系统)** is a lightweight, internal tool designed for small teams (5-10 people) to manage duty rotations. It features automatic schedule generation, manual adjustments via drag-and-drop, comprehensive audit logging, and a REST API for third-party integration.

## Key Technologies

- **Frontend:** [Next.js 16](https://nextjs.org/) (App Router), [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/), [Base UI](https://base-ui.com/react/components/getting-started/introduction)
- **Database:** [SQLite](https://sqlite.org/) via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) (using synchronous API)
- **Authentication:** [iron-session](https://github.com/vvo/iron-session) (Session-based, Admin/User roles)
- **State & Interactions:** [@dnd-kit](https://dndkit.com/) (Drag-and-drop), [date-fns](https://date-fns.org/) (Date manipulation)
- **Excel/Data:** [ExcelJS](https://github.com/exceljs/exceljs) (XLSX/CSV/JSON export/import)
- **Testing:** [Playwright](https://playwright.dev/) (E2E), [node:test](https://nodejs.org/api/test.html) (Unit/Integration)

# Getting Started

## Building and Running

Ensure you have Node.js 20+ installed.

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

Default access: `http://localhost:3000`. Initial admin credentials: `admin` / `123456` (if first-time initialization).

## Testing

The project uses both Playwright for E2E tests and `node:test` for logic tests.

```bash
# Run Playwright E2E tests
npx playwright test

# Run Node.js unit/integration tests
node --test tests/*.test.mjs
```

# Architecture

## Core Directory Structure

```text
src/
├── app/
│   ├── actions/        # Server Actions (All data mutations)
│   ├── api/            # REST API (Bearer Token protected)
│   ├── dashboard/      # Authenticated dashboard pages
│   └── register/       # User registration (Admin controlled)
├── components/
│   ├── ui/             # Reusable UI components (shadcn/ui style)
│   └── *.tsx           # Domain-specific business components
├── lib/
│   ├── db.ts           # SQLite connection and migration orchestrator
│   ├── db/             # Migrations and seeding logic
│   ├── auth.ts         # Authentication and RBAC logic
│   ├── schedules.ts    # Schedule generation and management
│   ├── users.ts        # Duty personnel management
│   └── logs.ts         # Audit log recording
└── types/index.ts      # Global TypeScript definitions
```

## Database Schema (`data/scheduling.db`)

- `accounts`: System user credentials and roles (`admin`, `user`).
- `users`: Duty personnel profiles (names, categories, active status).
- `schedules`: Daily duty records (maps dates to duty personnel).
- `logs`: Comprehensive audit trail (operator, action, before/after values).
- `api_tokens`: Bearer tokens for external API access.
- `config`: Global system settings (e.g., registration toggle).

# Development Conventions

1.  **Synchronous DB Access:** Since `better-sqlite3` is synchronous, database operations in `src/lib/` do not use `async/await`. However, Server Actions and API routes are typically `async` due to Next.js requirements.
2.  **Server Actions for Mutations:** All data-modifying operations (POST/PATCH/DELETE) should be implemented as Server Actions in `src/app/actions/`.
3.  **Audit Everything:** Any data modification must be logged using the `recordLog` utility in `src/lib/logs.ts`.
4.  **Date Handling:** Always use `date-fns` for date calculations and format dates as `YYYY-MM-DD` strings when storing in the database.
5.  **Role-Based Access:** Check user roles (`admin` vs `user`) in layouts or actions to restrict sensitive operations.
6.  **Surgical Edits:** When modifying code, maintain consistency with the existing shadcn-like UI patterns and Tailwind v4 conventions.
7.  **Migrations:** Add new schema changes to `src/lib/db/migrations.ts` rather than modifying existing tables directly.
