const { createUser, findUser } = require('../models/user');

module.exports = {
  signup: async (req, res) => {
    const { username, password } = req.body;
    try {
      await createUser(username, password);
      res.status(201).json({ success: true, username });
    } catch (err) {
      console.error('Signup Error:', err);
      res.status(400).json({ error: 'Username already exists' });
    }
  },
  login: async (req, res) => {
    const { username, password } = req.body;
    const user = await findUser(username, password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    res.json({ success: true, username });
  },
};