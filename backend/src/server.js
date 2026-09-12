require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const pool = require('./db');

const app = express();

app.use(cors());
app.use(express.json());


// TEST ROUTES

app.get('/api/test', (req, res) => {
    res.json({
        message: 'Cosplay Archive API is running!'
    });
});


app.get('/api/test-db', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');

        res.json({
            message: 'Database connected successfully!',
            time: result.rows[0].now
        });

    } catch (error) {
        console.error('Database error:', error);

        res.status(500).json({
            error: 'Database connection failed'
        });
    }
});


// SIGNUP / REGISTER

app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Check required fields
        if (!username || !password) {
            return res.status(400).json({
                error: 'Username and password are required.'
            });
        }

        const cleanUsername = username.trim();

        // Username validation
        if (cleanUsername.length < 3) {
            return res.status(400).json({
                error: 'Username must be at least 3 characters long.'
            });
        }

        if (cleanUsername.length > 50) {
            return res.status(400).json({
                error: 'Username cannot be longer than 50 characters.'
            });
        }

        // Password validation
        if (password.length < 8) {
            return res.status(400).json({
                error: 'Password must be at least 8 characters long.'
            });
        }

        // Check password complexity
        if (!/[A-Z]/.test(password)) {
            return res.status(400).json({
                error: 'Password must contain at least one uppercase letter.'
            });
        }

        if (!/[a-z]/.test(password)) {
            return res.status(400).json({
                error: 'Password must contain at least one lowercase letter.'
            });
        }

        if (!/[0-9]/.test(password)) {
            return res.status(400).json({
                error: 'Password must contain at least one number.'
            });
        }

        // Check if username already exists
        const existingUser = await pool.query(
            `
            SELECT id, username
            FROM users
            WHERE LOWER(username) = LOWER($1)
            `,
            [cleanUsername]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                error: 'Username is already taken.'
            });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // Create user
        const result = await pool.query(
            `
            INSERT INTO users (
                username,
                password_hash
            )
            VALUES ($1, $2)
            RETURNING id, username, created_at
            `,
            [
                cleanUsername,
                passwordHash
            ]
        );

        res.status(201).json({
            message: 'Account created successfully!',
            user: result.rows[0]
        });

    } catch (error) {
        console.error('Registration error:', error);

        res.status(500).json({
            error: 'Something went wrong while creating your account.'
        });
    }
});


// LOGIN

app.post('/api/auth/login', async (req, res) => {
    try {
        const { identifier, password } = req.body;

        // Check required fields
        if (!identifier || !password) {
            return res.status(400).json({
                error: 'Username and password are required.'
            });
        }

        const cleanUsername = identifier.trim().toLowerCase();

        // Find user by username only
        const result = await pool.query(
            `
            SELECT id, username, password_hash
            FROM users
            WHERE LOWER(username) = $1
            `,
            [cleanUsername]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                error: 'Invalid username or password.'
            });
        }

        const user = result.rows[0];

        // Compare password
        const passwordMatch = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatch) {
            return res.status(401).json({
                error: 'Invalid username or password.'
            });
        }

        // Create JWT
        const token = jwt.sign(
            {
                id: user.id,
                username: user.username
            },
            process.env.JWT_SECRET,
            {
                expiresIn: '7d'
            }
        );

        res.json({
            message: 'Login successful!',
            token,
            user: {
                id: user.id,
                username: user.username
            }
        });

    } catch (error) {
        console.error('Login error:', error);

        res.status(500).json({
            error: 'Something went wrong while logging in.'
        });
    }
});


// GET CURRENT USER

app.get('/api/auth/me', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Authentication required.'
            });
        }

        const token = authHeader.split(' ')[1];

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        const result = await pool.query(
            `
            SELECT id, username, created_at
            FROM users
            WHERE id = $1
            `,
            [decoded.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'User not found.'
            });
        }

        res.json({
            user: result.rows[0]
        });

    } catch (error) {
        console.error('Authentication error:', error);

        if (
            error.name === 'JsonWebTokenError' ||
            error.name === 'TokenExpiredError'
        ) {
            return res.status(401).json({
                error: 'Invalid or expired token.'
            });
        }

        res.status(500).json({
            error: 'Something went wrong.'
        });
    }
});


// START SERVER

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
    console.log(
        `Cosplay Archive API running on http://localhost:${PORT}`
    );
});