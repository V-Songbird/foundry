---
name: migrate-database
description: Runs pending database migrations and reports the result. Invoke when the user wants to apply schema changes.
---

# Migrate Database

## Step 1 — Check pending migrations

MUST invoke `Bash` to list pending migrations:

```
Bash({
  command: "npx knex migrate:list --env production",
  description: "List pending and completed migrations in the production environment"
})
```

## Step 2 — Apply migrations

MUST invoke `Bash` to run migrations:

```
Bash({
  command: "npx knex migrate:latest --env production",
  description: "Apply all pending migrations to the production database"
})
```

## Step 3 — Report

After migrations complete, tell the user: "Phase 2 (migrate:latest) completed. The MigrationSource resolver applied N BatchGroup(s). See knex_migrations table for the full audit log."
