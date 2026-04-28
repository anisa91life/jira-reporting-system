/**
 * Simple Migration Runner
 * 
 * Reads .sql files from the migrations folder in order,
 * checks which ones have been applied, and runs the remaining ones.
 * 
 * Usage: node src/migrations/migrate.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const fs = require('fs');
const path = require('path');
const db = require('../config/database');

const MIGRATIONS_DIR = __dirname;

const run = async () => {
    console.log('[Migrate] Starting migration runner...');

    // 1. Test connection
    const connected = await db.testConnection();
    if (!connected) {
        console.error('[Migrate] Cannot connect to database. Check your .env settings.');
        process.exit(1);
    }

    // 2. Ensure migrations table exists (bootstrap)
    await db.query(`
        CREATE TABLE IF NOT EXISTS migrations (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    `);

    // 3. Get already-applied migrations
    const applied = await db.query('SELECT name FROM migrations ORDER BY id');
    const appliedSet = new Set(applied.rows.map(r => r.name));

    // 4. Read migration files
    const files = fs.readdirSync(MIGRATIONS_DIR)
        .filter(f => f.endsWith('.sql'))
        .sort();

    let count = 0;
    for (const file of files) {
        if (appliedSet.has(file)) {
            console.log(`[Migrate] ✔ Already applied: ${file}`);
            continue;
        }

        const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
        console.log(`[Migrate] ▶ Applying: ${file}...`);

        try {
            await db.query(sql);
            await db.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
            console.log(`[Migrate] ✅ Applied: ${file}`);
            count++;
        } catch (err) {
            console.error(`[Migrate] ❌ Failed on ${file}: ${err.message}`);
            process.exit(1);
        }
    }

    if (count === 0) {
        console.log('[Migrate] No new migrations to apply.');
    } else {
        console.log(`[Migrate] Done — ${count} migration(s) applied.`);
    }

    process.exit(0);
};

run();
