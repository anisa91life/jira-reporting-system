# Database Migrations

This folder contains SQL migration files for the Jira Reporting System database.

## Naming Convention

Use sequential numbering with a descriptive name:

```
001_create_migrations_table.sql
002_create_manual_risks.sql
003_add_ai_history.sql
```

## How to Apply Migrations

### Option A: Manual (Recommended for now)
Connect to your PostgreSQL database and run migrations in order:

```bash
psql -h localhost -U postgres -d jira_reporting -f src/migrations/001_create_migrations_table.sql
```

### Option B: Using the migrate script
```bash
node src/migrations/migrate.js
```

## How to Add a New Migration

1. Create a new `.sql` file with the next sequence number
2. Write your SQL (CREATE TABLE, ALTER TABLE, etc.)
3. Apply it using one of the methods above
4. The migration will be tracked in the `migrations` table

## Rules

- **Never modify** an existing migration file after it has been applied
- **Always add new files** for schema changes
- **Use IF NOT EXISTS** where possible for safety
- **Include rollback comments** so changes can be reversed if needed
