const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: '*',
    credentials: true,
}));
app.use(express.json());

// ✅ PostgreSQL connection
const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 5432,
});

pool.connect()
    .then(() => console.log('✅ PostgreSQL connected successfully!'))
    .catch((err) => console.error('❌ PostgreSQL connection failed:', err.message));

// ✅ Default route
app.get('/', (req, res) => {
    res.send('✅ RFID Race Logger Backend (PostgreSQL) is running!');
});

// ✅ Add a new student
app.post('/api/students', async (req, res) => {
    const { name, weight, contact, gender, race, academy, studentRole } = req.body;

    if (!name || !weight || !contact || !gender || !race || !academy) {
        return res.status(400).json({ error: "All fields are required." });
    }

    const query = `
        INSERT INTO students (name, weight, contact, gender, race, academy, studentRole)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
    `;

    try {
        const result = await pool.query(query, [name, weight, contact, gender, race, academy, studentRole]);
        res.status(201).json({
            message: "Student added successfully!",
            studentId: result.rows[0].id,
        });
    } catch (err) {
        console.error("DB Insert Error:", err.message);
        res.status(500).json({ error: "Failed to add student." });
    }
});

// ✅ Get all students
app.get('/api/students', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM students ORDER BY id DESC");
        res.json(result.rows);
    } catch (err) {
        res.status(500).send("❌ DB error during SELECT");
    }
});

// ✅ Handle RFID scans
app.post('/api/rfid', async (req, res) => {
    const { tag_id } = req.body;
    if (!tag_id) {
        return res.status(400).json({ error: "❌ tag_id is required in request body." });
    }

    const now = new Date();

    try {
        const result = await pool.query(
            "SELECT * FROM race_logs WHERE tag_id = $1 ORDER BY id DESC LIMIT 1",
            [tag_id]
        );

        if (result.rows.length === 0 || result.rows[0].end_time) {
            // Start new race
            await pool.query(
                "INSERT INTO race_logs (tag_id, start_time) VALUES ($1, $2)",
                [tag_id, now]
            );
            res.send("✅ Start time saved");
        } else {
            // End race
            const start = new Date(result.rows[0].start_time);
            const duration = Math.round((now - start) / 1000);

            await pool.query(
                "UPDATE race_logs SET end_time = $1, duration_seconds = $2 WHERE id = $3",
                [now, duration, result.rows[0].id]
            );
            res.send("✅ End time updated");
        }
    } catch (err) {
        console.error("RFID Handling Error:", err.message);
        res.status(500).send("❌ DB error during RFID handling");
    }
});

// ✅ Get all race logs
app.get('/api/rfid', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM race_logs ORDER BY id DESC");
        res.json(result.rows);
    } catch (err) {
        res.status(500).send("❌ DB error during SELECT");
    }
});

// ✅ Get race log by ID
app.get('/api/rfid/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query("SELECT * FROM race_logs WHERE id = $1", [id]);
        if (result.rows.length === 0) {
            return res.status(404).send("❌ Race log not found");
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).send("❌ DB error during SELECT");
    }
});

// ✅ Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
