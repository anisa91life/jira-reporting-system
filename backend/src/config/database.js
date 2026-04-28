const { Pool } = require('pg');

/**
 * PostgreSQL Connection Pool
 * 
 * Uses environment variables for all configuration.
 * The pool manages connections automatically — acquire, reuse, and release.
 * 
 * Usage:
 *   const db = require('./config/database');
 *   const result = await db.query('SELECT * FROM my_table WHERE id = $1', [id]);
 */

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    database: process.env.DB_NAME || 'jira_reporting',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    max: 10,              // Maximum number of connections in the pool
    idleTimeoutMillis: 30000,  // Close idle connections after 30 seconds
    connectionTimeoutMillis: 5000  // Fail if connection takes more than 5 seconds
});

// Log connection errors (does not crash the app)
pool.on('error', (err) => {
    console.error('[DB] Unexpected error on idle client:', err.message);
});

/**
 * Test the database connection.
 * Call this during server startup to verify connectivity.
 * Returns true if connected, false otherwise.
 */
const testConnection = async () => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW() AS current_time');
        client.release();
        console.log(`[DB] ✅ Connected to PostgreSQL | Server time: ${result.rows[0].current_time}`);
        return true;
    } catch (err) {
        console.error(`[DB] ❌ Connection failed: ${err.message}`);
        console.error(`[DB]    Code: ${err.code || 'N/A'}`);
        console.error(`[DB]    Host: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}`);
        console.error(`[DB]    Database: ${process.env.DB_NAME || 'jira_reporting'}`);
        console.error(`[DB]    User: ${process.env.DB_USER || 'postgres'}`);
        if (err.code === 'ECONNREFUSED') console.error(`[DB]    💡 PostgreSQL is not running. Start it with: brew services start postgresql`);
        if (err.code === '3D000') console.error(`[DB]    💡 Database does not exist. Create it with: createdb ${process.env.DB_NAME || 'jira_reporting'}`);
        if (err.code === '28P01') console.error(`[DB]    💡 Password authentication failed. Check DB_PASSWORD in .env`);
        if (err.code === '28000') console.error(`[DB]    💡 Role/user does not exist. Check DB_USER in .env`);
        return false;
    }
};

module.exports = {
    pool,
    query: (text, params) => pool.query(text, params),
    testConnection
};
