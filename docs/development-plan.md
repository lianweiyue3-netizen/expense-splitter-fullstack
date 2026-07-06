# Development Plan

This document keeps the original implementation direction in a compact project note. The current repository is a single Next.js full-stack application with clean boundaries between UI, API routes, domain logic, validators, and persistence.

## Implemented Milestones

- [x] Next.js App Router project with TypeScript
- [x] Tailwind CSS and reusable UI primitives
- [x] Prisma schema, migrations, and PostgreSQL setup
- [x] NextAuth credentials authentication
- [x] Protected app routes and middleware
- [x] Profile onboarding and settings
- [x] Group creation, settings, members, and invite links
- [x] Expense APIs with equal, custom amount, and percentage split modes
- [x] Multiple payer support for a single expense
- [x] Balance calculation and settlement suggestion domain logic
- [x] Settlement create, edit, and delete flow
- [x] Unit tests for split and balance logic
- [x] Playwright critical-flow test scaffold
- [x] GitHub Actions workflow for lint, typecheck, and tests

## Architecture Notes

- `src/app` owns the route surface: pages and API handlers.
- `src/components` is grouped by product area so the UI layer stays easy to navigate.
- `src/server/domain` contains pure calculation logic that can be tested without a database.
- `src/server/validators` centralizes request validation with Zod.
- `src/lib/prisma.ts` keeps a shared Prisma client for server-side data access.

## Future Improvements

- Add receipt image uploads and OCR-assisted expense entry.
- Add automatic exchange-rate conversion for international trips.
- Add richer activity filters and exportable group reports.
- Expand Playwright coverage around invite acceptance and settlement editing.
