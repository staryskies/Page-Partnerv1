// controllers/userController.js
const { query } = require('../db'); // Assuming db.js from previous implementation
const bcrypt = require('bcrypt');

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

module.exports = {
  signup: async (req, res) => {
    const { username, email, name, age, password } = req.body;

    // Validation
    if (!username || !email || !name || !age || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    if (typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name must be a non-empty string' });
    }
    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum < 13) {
      return res.status(400).json({ error: 'Age must be a number and at least 13' });
    }

    try {
      // Check if username or email already exists
      const existingUser = await query(
        'SELECT username FROM users WHERE username = $1 OR email = $2',
        [username, email]
      );
      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: 'Username or email already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert new user
      const result = await query(
        'INSERT INTO users (username, email, password, name, age) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [username, email, hashedPassword, name, ageNum]
      );

      res.status(201).json({ success: true, username });
    } catch (err) {
      console.error('Signup Error:', err);
      res.status(500).json({ error: 'Failed to register user' });
    }
  },

  login: async (req, res) => {
    const { identifier, password } = req.body; // identifier can be username or email
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Identifier and password are required' });
    }

    try {
      // Determine if identifier is email or username
      const isEmail = emailRegex.test(identifier);
      const queryText = isEmail
        ? 'SELECT * FROM users WHERE email = $1'
        : 'SELECT * FROM users WHERE username = $1';
      
      const result = await query(queryText, [identifier]);
      
      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid username/email or password' });
      }

      const user = result.rows[0];
      
      // Verify password
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid username/email or password' });
      }

      res.json({ success: true, username: user.username });
    } catch (err) {
      console.error('Login Error:', err);
      res.status(500).json({ error: 'Failed to log in' });
    }
  },
};