require('dotenv').config();
const express = require('express');
const path = require('path');
const db = require('./db');
const userController = require('./controllers/userController');
const bookController = require('./controllers/bookController');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Authentication Middleware
const requireLogin = async (req, res, next) => {
  const username = req.headers['x-username'] ? req.headers['x-username'].replace(/[<>'"%;]/g, '') : null;
  if (!username) return res.status(401).json({ error: 'Please log in first' });
  try {
    const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'User not found' });
    req.user = result.rows[0];
    next();
  } catch (err) {
    console.error('Auth Error:', err);
    res.status(500).json({ error: 'Authentication error' });
  }
};

// Routes
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'homepage.html')));
app.get('/index.html', requireLogin, (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/circles.html', requireLogin, (req, res) => res.sendFile(path.join(__dirname, 'public', 'circles.html')));
app.get('/add-book.html', requireLogin, (req, res) => res.sendFile(path.join(__dirname, 'public', 'add-book.html')));
app.get('/achievements.html', requireLogin, (req, res) => res.sendFile(path.join(__dirname, 'public', 'achievements.html')));
app.get('/read.html', requireLogin, (req, res) => res.sendFile(path.join(__dirname, 'public', 'read.html')));
app.get('/discover.html', requireLogin, (req, res) => res.sendFile(path.join(__dirname, 'public', 'discover.html')));


app.post('/api/auth/register', userController.signup);
app.post('/api/auth/login', userController.login);
app.post('/api/auth/logout', (req, res) => res.status(200).json({ success: true, message: 'Logged out successfully' }));

// User Data
app.get('/api/user', requireLogin, async (req, res) => {
  const user = req.user;
  try {
    const circlesResult = await db.query('SELECT COUNT(*) FROM circles WHERE $1 = ANY(COALESCE(members, \'{}\'))', [user.username]);
    const achievementsResult = await db.query('SELECT COUNT(*) FROM achievements WHERE user_id = $1', [user.id]);
    res.json({
      isLoggedIn: true,
      displayName: user.username,
      email: user.email,
      name: user.name,
      age: user.age,
      currentlyReading: user.currently_reading || 0,
      completedBooks: user.completed_books || 0,
      readingStreak: user.reading_streak || 0,
      badges: parseInt(achievementsResult.rows[0].count, 10),
      points: user.points || 0,
      goals: user.goals || []
    });
  } catch (err) {
    console.error('User Data Error:', err);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

// Book Routes
app.get('/api/books', requireLogin, bookController.getBooks);
app.post('/api/book', requireLogin, bookController.createBook);
app.get('/api/book/:bookId', requireLogin, bookController.getBookDetails);

// Circles Routes
app.get('/api/circles', requireLogin, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT c.id, c.name, c.book_id AS "bookId", c.creator, c.status, c.members, c.description, c.privacy,
             b.genre AS "bookGenre"
      FROM circles c
      LEFT JOIN books b ON c.book_id = b.id
      WHERE c.privacy = 'public' OR c.creator = $1 OR $1 = ANY(COALESCE(c.members, '{}'))
    `, [req.user.username]);
    res.json(result.rows);
  } catch (err) {
    console.error('Get Circles Error:', err);
    res.status(500).json({ error: 'Failed to fetch circles' });
  }
});

app.post('/api/circles', requireLogin, async (req, res) => {
  const { name, bookId, description, privacy } = req.body;
  if (!name || !bookId) return res.status(400).json({ error: 'Name and bookId are required' });
  try {
    const bookCheck = await db.query('SELECT id FROM books WHERE id = $1', [bookId]);
    if (bookCheck.rows.length === 0) return res.status(404).json({ error: 'Book not found' });
    const result = await db.query(
      'INSERT INTO circles (name, book_id, creator, members, description, privacy) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, book_id AS "bookId", creator, status, members, description, privacy',
      [name, bookId, req.user.username, [req.user.username], description || '', privacy || 'public']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create Circle Error:', err);
    res.status(500).json({ error: 'Failed to create circle' });
  }
});

// Circle Suggestion Endpoint
app.get('/api/suggest-circles/:genre', requireLogin, async (req, res) => {
  const genre = req.params.genre;
  try {
    const result = await db.query(`
      SELECT c.id, c.name, c.book_id AS "bookId", c.creator, c.status, c.members, c.description, c.privacy,
             b.genre AS "bookGenre", b.title AS "bookTitle", b.author AS "bookAuthor"
      FROM circles c
      JOIN books b ON c.book_id = b.id
      WHERE b.genre = $1 AND c.privacy = 'public'
      ORDER BY random()
      LIMIT 3
    `, [genre]);
    res.json(result.rows);
  } catch (err) {
    console.error('Circle Suggestion Error:', err);
    res.status(500).json({ error: 'Failed to suggest circles' });
  }
});

// Delete Circle Endpoint
app.delete('/api/circles/:id', requireLogin, async (req, res) => {
  const circleId = req.params.id;
  try {
    const checkResult = await db.query('SELECT creator FROM circles WHERE id = $1', [circleId]);
    if (checkResult.rows.length === 0) return res.status(404).json({ error: 'Circle not found' });
    if (checkResult.rows[0].creator !== req.user.username) {
      return res.status(403).json({ error: 'Only the creator can delete a circle' });
    }
    await db.query('DELETE FROM circles WHERE id = $1', [circleId]);
    res.json({ success: true, message: 'Circle deleted successfully' });
  } catch (err) {
    console.error('Delete Circle Error:', err);
    res.status(500).json({ error: 'Failed to delete circle' });
  }
});

// Migration Logic for Circles Table
const migrateCirclesTable = async () => {
  try {
    const columnCheck = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'circles' AND column_name = 'member_ids'
    `);
    
    if (columnCheck.rows.length > 0) {
      console.log('Migrating circles table...');
      await db.query(`
        ALTER TABLE circles
        ADD COLUMN IF NOT EXISTS creator VARCHAR(255),
        ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active',
        ADD COLUMN IF NOT EXISTS members TEXT[] DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS description TEXT,
        ADD COLUMN IF NOT EXISTS privacy VARCHAR(50) DEFAULT 'public'
      `);
      await db.query(`
        UPDATE circles 
        SET members = ARRAY(SELECT unnest(member_ids)::text),
            creator = (SELECT username FROM users WHERE id = (SELECT user_id FROM books WHERE id = circles.book_id LIMIT 1))
        WHERE member_ids IS NOT NULL
      `);
      await db.query('ALTER TABLE circles DROP COLUMN IF EXISTS member_ids');
      console.log('Circles table migration completed');
    }
  } catch (err) {
    console.error('Migration Error:', err);
    throw err;
  }
};

// Error Handling
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  res.status(500).json({ error: 'Something went wrong on the server' });
});

// Start Server
const startServer = async () => {
  try {
    await db.connectDB();
    await db.initDB();
    await migrateCirclesTable();
    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`Server running on port ${port}`));
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

startServer();