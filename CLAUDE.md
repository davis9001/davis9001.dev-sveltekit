# CLAUDE.md - Instructions for Claude Code and AI Assistants

## Database Migrations - MANDATORY RULES

**NEVER modify migration files that have already been committed to `main`.**

Migration files in `migrations/` are immutable once applied. Cloudflare D1 tracks applied migrations by filename in a `d1_migrations` table. Editing an applied migration will cause checksum mismatches, deployment failures, and potential data loss.

### When you need to change the database schema:

1. Find the highest-numbered migration in `migrations/`
2. Create a NEW file: `migrations/NNNN_description.sql` (next number in sequence)
3. Use `ALTER TABLE` to modify existing tables
4. Test with `npm run db:migrate:local`

### Never do this:

- Edit `migrations/0001_initial_schema.sql` or any other existing migration
- Delete or rename migration files
- Reorder migrations
- Drop tables without explicit user approval

See `migrations/README.md` for the full migration guide.

## Code Coverage - MANDATORY RULES

**Code coverage must NEVER drop below 95%. This is a hard floor.**

- Before completing any task, run `npm run test:coverage` and confirm overall coverage is ≥ 95%
- If your changes reduce coverage below 95%, you MUST write additional tests before finishing
- 100% coverage is required on critical paths (auth, payments, data mutations)
- Every new feature, bug fix, or refactor must include tests sufficient to maintain this threshold
- Do NOT skip tests to save time — untested code is incomplete code

### Verification command:

```bash
npm run test:coverage
```

Check the summary output. If any category (Statements, Branches, Functions, Lines) falls below 95%, add tests until the threshold is met.
