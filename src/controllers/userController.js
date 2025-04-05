const { createUser, findUserByUsername, findUserByEmail } = require('../models/user');

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
      await createUser(username, email, name, ageNum, password);
      res.status(201).json({ success: true, username });
    } catch (err) {
      console.error('Signup Error:', err);
      res.status(400).json({ error: 'Username or email already exists' });
    }
  },
  login: async (req, res) => {
    const { identifier, password } = req.body; // identifier can be username or email
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Identifier and password are required' });
    }

    try {
      let user;
      // Check if identifier is an email
      if (emailRegex.test(identifier)) {
        user = await findUserByEmail(identifier, password);
      } else {
        user = await findUserByUsername(identifier, password);
      }

      if (!user) {
        return res.status(401).json({ error: 'Invalid username/email or password' });
      }
      res.json({ success: true, username: user.username });
    } catch (err) {
      console.error('Login Error:', err);
      res.status(500).json({ error: 'Failed to log in' });
    }
  },
};