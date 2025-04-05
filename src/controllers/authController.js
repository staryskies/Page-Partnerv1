const db = require('../db');
const bcrypt = require('bcryptjs'); // Use bcryptjs instead of bcrypt

module.exports = {
  registerUser: async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10); // Use hashSync
    try {
      await db.query(
        'INSERT INTO users (username, password) VALUES ($1, $2)',
        [username, hashedPassword]
      );
      res.status(201).json({ success: true });
    } catch (err) {
      res.status(400).json({ error: 'Username already exists' });
    }
  },

  loginUser: async (req, res) => {
    const { username, password } = req.body;
    try {
      const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      const user = result.rows[0];
      const isValidPassword = bcrypt.compareSync(password, user.password); // Use compareSync
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      res.status(200).json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};