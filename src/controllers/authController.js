
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { query } = require('../db/db');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

const mockLogin = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required.' });
    }

    try {
        let user;

        // 1. Try to find user
        let result = await query('SELECT user_id, password_hash FROM users WHERE username = $1', [username]);
        
        if (result.rows.length === 0) {
            // 2. If user doesn't exist, create mock user (sign-up implicitly)
            // Use a hardcoded hash or hash the provided mock password for consistency
            const salt = await bcrypt.genSalt(10);
            const password_hash = await bcrypt.hash(password, salt);
            
            result = await query('INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING user_id', [username, password_hash]);
            user = result.rows[0];
            console.log(`New mock user created: ${username}`);
        } else {
            // 3. If user exists, mock password check (always passes for mock auth)
            user = result.rows[0];
        }

        // 4. Generate JWT
        const token = jwt.sign(
            { user_id: user.user_id, username: username }, 
            JWT_SECRET, 
            { expiresIn: JWT_EXPIRES_IN }
        );

        return res.json({ 
            message: 'Mock login successful.',
            token: token,
            user_id: user.user_id
        });

    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ message: 'Internal server error during authentication.' });
    }
};

module.exports = { mockLogin };
