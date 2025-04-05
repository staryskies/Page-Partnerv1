const express = require('express');
const path = require('path');
const bookRoutes = require('./routes/book');
const { connectDB, initDB } = require('./db');
const authRoutes = require('./routes/auth');

const app = express();
app.use(express.json());

// Serve static files from the public folder
app.use(express.static(path.join(__dirname, '../public')));

// API routes
app.use('/api', bookRoutes);

// Add auth routes
app.use('/api/auth', authRoutes);

// Serve index.html for the root URL
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Initialize DB and start server
connectDB()
  .then(() => initDB())
  .then(() => {
    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`Server running on port ${port}`));
  })
  .catch(err => console.error('Failed to start server:', err));

// filepath: c:\Users\Yichen zuo\Downloads\Artemis-main\Page-Partnerv1\src\routes\auth.js
const express = require('express');
const { registerUser, loginUser } = require('../controllers/authController');
const router = express.Router();

// Route for user registration
router.post('/register', registerUser);

// Route for user login
router.post('/login', loginUser);

module.exports = router;

// filepath: c:\Users\Yichen zuo\Downloads\Artemis-main\Page-Partnerv1\src\controllers\authController.js
const db = require('../db');
const bcrypt = require('bcryptjs');

module.exports = {
  registerUser: async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);
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
      const isValidPassword = bcrypt.compareSync(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      res.status(200).json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};