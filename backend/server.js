require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const apiRoutes = require('./src/routes/api');
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Backend is running' });
});

app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);

    // Optional: Test database connection on startup
    if (process.env.DB_HOST) {
        const db = require('./src/config/database');
        await db.testConnection();
    } else {
        console.log('[DB] ⏭️  No DB_HOST configured — skipping database connection.');
    }
});
