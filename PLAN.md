# Splitter MVP Implementation Plan

## Architecture Decision

- Single Next.js app (App Router + route handlers) at repo root.
- Reason: simplest deploy/run path for beginner workflows while preserving clean layers (`domain`, `services`, `api`).

## Milestones Checklist

### PR1: Foundation

- [ ] Scaffold Next.js + TypeScript project structure
- [ ] Add TailwindCSS + shadcn/ui baseline
- [ ] Add Prisma + PostgreSQL datasource + auth-ready models
- [ ] Add Docker Compose (`app`, `db`)
- [ ] Add `.env.example`
- [ ] Add ESLint + Prettier + Husky + lint-staged + Vitest
- [ ] Add CI workflow for lint + typecheck + unit tests
- [ ] Add health endpoint
- [ ] Update README with setup/run/test docs

### PR2: Auth + Protected App

- [ ] NextAuth credentials setup
- [ ] Registration endpoint with password hashing
- [ ] Protected pages and middleware guards
- [ ] Onboarding and profile settings page
- [ ] Basic login rate limiting

### PR3: Groups + Membership + Invites

- [ ] Group/member/invite schema
- [ ] Group CRUD APIs
- [ ] Invite create/accept flow
- [ ] Role-based group access checks
- [ ] Dashboard/group pages for members + invites

### PR4: Expenses + Splits + Balances

- [ ] Expense and split schema
- [ ] Expense APIs with equal/custom/percentage modes
- [ ] Balance engine in pure domain layer
- [ ] Balance UI and group expense UI
- [ ] Unit tests for split + balance logic

### PR5: Settlements + Activity + E2E

- [ ] Settlement + activity schema and APIs
- [ ] Settle up flow + activity feed UI
- [ ] Playwright flow: create expense -> settle up
- [ ] Final README deployment notes
