require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const pool = require('./db');

const app = express();

app.use(cors());
app.use(express.json());

// AUTHENTICATION MIDDLEWARE

function authenticateToken(req, res, next) {
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

        req.user = decoded;

        next();

    } catch (error) {
        console.error('Token authentication error:', error);

        if (
            error.name === 'JsonWebTokenError' ||
            error.name === 'TokenExpiredError'
        ) {
            return res.status(401).json({
                error: 'Invalid or expired token.'
            });
        }

        return res.status(500).json({
            error: 'Authentication failed.'
        });
    }
}

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

// CHARACTER ROUTES
// GET ALL CHARACTERS FOR LOGGED-IN USER

app.get('/api/characters', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await pool.query(
            `
            SELECT
                id,
                character_name AS "characterName",
                anime_name AS "animeName",
                image_url AS "imageUrl",
                status,
                difficulty,
                category,
                tags,
                notes,
                favorite,
                created_at AS "createdAt",
                updated_at AS "updatedAt"
            FROM characters
            WHERE user_id = $1
            ORDER BY created_at DESC
            `,
            [userId]
        );

        res.json({
            characters: result.rows
        });

    } catch (error) {
        console.error('Get characters error:', error);

        res.status(500).json({
            error: 'Something went wrong while loading characters.'
        });
    }
});


// ADD CHARACTER

app.post('/api/characters', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const {
            id,
            characterName,
            animeName,
            imageUrl,
            status,
            difficulty,
            category,
            tags,
            notes,
            favorite
        } = req.body;

        if (!characterName || !animeName || !imageUrl) {
            return res.status(400).json({
                error: 'Character name, anime name, and image URL are required.'
            });
        }

        const characterId =
            id ||
            'char-' +
            Date.now() +
            '-' +
            Math.random().toString(36).substring(2, 11);

        const cleanTags = Array.isArray(tags)
            ? tags
            : typeof tags === 'string'
                ? tags
                    .split(',')
                    .map(tag => tag.trim())
                    .filter(Boolean)
                : [];

        const result = await pool.query(
            `
            INSERT INTO characters (
                id,
                user_id,
                character_name,
                anime_name,
                image_url,
                status,
                difficulty,
                category,
                tags,
                notes,
                favorite
            )
            VALUES (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7,
                $8,
                $9,
                $10,
                $11
            )
            RETURNING
                id,
                character_name AS "characterName",
                anime_name AS "animeName",
                image_url AS "imageUrl",
                status,
                difficulty,
                category,
                tags,
                notes,
                favorite,
                created_at AS "createdAt",
                updated_at AS "updatedAt"
            `,
            [
                characterId,
                userId,
                characterName.trim(),
                animeName.trim(),
                imageUrl.trim(),
                status || 'want-to-cosplay',
                difficulty || 'easy',
                category || '',
                cleanTags,
                notes || '',
                favorite === true
            ]
        );

        res.status(201).json({
            message: 'Character added successfully.',
            character: result.rows[0]
        });

    } catch (error) {
        console.error('Add character error:', error);

        if (error.code === '23505') {
            return res.status(409).json({
                error: 'A character with this ID already exists.'
            });
        }

        res.status(500).json({
            error: 'Something went wrong while adding the character.'
        });
    }
});


// UPDATE CHARACTER

app.put('/api/characters/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const characterId = req.params.id;

        const {
            characterName,
            animeName,
            imageUrl,
            status,
            difficulty,
            category,
            tags,
            notes,
            favorite
        } = req.body;

        const cleanTags = Array.isArray(tags)
            ? tags
            : typeof tags === 'string'
                ? tags
                    .split(',')
                    .map(tag => tag.trim())
                    .filter(Boolean)
                : [];

        const result = await pool.query(
            `
            UPDATE characters
            SET
                character_name = $1,
                anime_name = $2,
                image_url = $3,
                status = $4,
                difficulty = $5,
                category = $6,
                tags = $7,
                notes = $8,
                favorite = $9,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $10
              AND user_id = $11
            RETURNING
                id,
                character_name AS "characterName",
                anime_name AS "animeName",
                image_url AS "imageUrl",
                status,
                difficulty,
                category,
                tags,
                notes,
                favorite,
                created_at AS "createdAt",
                updated_at AS "updatedAt"
            `,
            [
                characterName?.trim(),
                animeName?.trim(),
                imageUrl?.trim(),
                status,
                difficulty,
                category || '',
                cleanTags,
                notes || '',
                favorite === true,
                characterId,
                userId
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Character not found.'
            });
        }

        res.json({
            message: 'Character updated successfully.',
            character: result.rows[0]
        });

    } catch (error) {
        console.error('Update character error:', error);

        res.status(500).json({
            error: 'Something went wrong while updating the character.'
        });
    }
});


// DELETE ONE CHARACTER

app.delete('/api/characters/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const characterId = req.params.id;

        const result = await pool.query(
            `
            DELETE FROM characters
            WHERE id = $1
              AND user_id = $2
            RETURNING id
            `,
            [characterId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Character not found.'
            });
        }

        res.json({
            message: 'Character deleted successfully.'
        });

    } catch (error) {
        console.error('Delete character error:', error);

        res.status(500).json({
            error: 'Something went wrong while deleting the character.'
        });
    }
});


// DELETE ALL CHARACTERS FOR LOGGED-IN USER

app.delete('/api/characters', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await pool.query(
            `
            DELETE FROM characters
            WHERE user_id = $1
            `,
            [userId]
        );

        res.json({
            message: 'All characters deleted successfully.',
            deletedCount: result.rowCount
        });

    } catch (error) {
        console.error('Delete all characters error:', error);

        res.status(500).json({
            error: 'Something went wrong while deleting characters.'
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