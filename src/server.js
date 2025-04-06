const express = require('express');
const path = require('path');
const { connectDB, initDB, query } = require('./db');
const userController = require('./controllers/userController');

const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Authentication Middleware
const requireLogin = async (req, res, next) => {
  const username = req.headers['x-username'];
  if (!username) {
    return res.status(401).json({ error: 'Please log in first' });
  }
  try {
    const result = await query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }
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

// Authentication Routes
app.post('/api/auth/register', userController.signup);
app.post('/api/auth/login', userController.login);

// User Data
app.get('/api/user', requireLogin, async (req, res) => {
  const user = req.user;
  const circlesResult = await query('SELECT COUNT(*) FROM circles WHERE $1 = ANY(member_ids)', [user.id]);
  const achievementsResult = await query('SELECT COUNT(*) FROM achievements WHERE user_id = $1', [user.id]);
  res.json({
    isLoggedIn: true,
    displayName: user.username, // Adjusted to match table
    currentlyReading: user.currently_reading || 0,
    completedBooks: user.completed_books || 0,
    readingStreak: user.reading_streak || 0,
    badges: parseInt(achievementsResult.rows[0].count, 10),
    points: user.points || 0,
    goals: user.goals || [],
    recommendations: user.recommendations || []
  });
});

app.patch('/api/user', requireLogin, async (req, res) => {
  const { completedBooks, currentlyReading, points } = req.body;
  try {
    await query(
      'UPDATE users SET completed_books = COALESCE(completed_books, 0) + $1, currently_reading = COALESCE(currently_reading, 0) + $2, points = COALESCE(points, 0) + $3 WHERE id = $4',
      [completedBooks || 0, currentlyReading || 0, points || 0, req.user.id]
    );
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Update User Error:', err);
    res.status(500).json({ error: 'Failed to update user stats' });
  }
});

// Book Routes
app.get('/api/books', requireLogin, async (req, res) => {
  try {
    const result = await query('SELECT * FROM books WHERE user_id = $1', [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error('Get Books Error:', err);
    res.status(500).json({ error: 'Failed to fetch books' });
  }
});

app.post('/api/book', requireLogin, async (req, res) => {
  const { title, genre, excerpt } = req.body;
  if (!title || !genre) {
    return res.status(400).json({ error: 'Title and genre are required' });
  }
  try {
    const result = await query(
      'INSERT INTO books (title, genre, user_id, excerpt) VALUES ($1, $2, $3, $4) RETURNING id',
      [title, genre, req.user.id, excerpt || null]
    );
    await query('UPDATE users SET currently_reading = COALESCE(currently_reading, 0) + 1 WHERE id = $1', [req.user.id]);
    res.status(201).json({ success: true, bookId: result.rows[0].id });
  } catch (err) {
    console.error('Add Book Error:', err);
    res.status(500).json({ error: 'Failed to add book' });
  }
});

app.get('/api/book/:id', requireLogin, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query('SELECT * FROM books WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get Book Error:', err);
    res.status(500).json({ error: 'Failed to fetch book' });
  }
});

app.delete('/api/book/:id', requireLogin, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query('DELETE FROM books WHERE id = $1 AND user_id = $2 RETURNING id', [id, req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found or not owned by user' });
    }
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Delete Book Error:', err);
    res.status(500).json({ error: 'Failed to delete book' });
  }
});

// Group Routes
app.post('/api/book/:bookId/group', requireLogin, async (req, res) => {
  const { bookId } = req.params;
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Group name is required' });
  }
  try {
    const bookResult = await query('SELECT groups FROM books WHERE id = $1 AND user_id = $2', [bookId, req.user.id]);
    if (bookResult.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }
    const groups = bookResult.rows[0].groups || [];
    if (!groups.includes(name)) {
      groups.push(name);
      await query('UPDATE books SET groups = $1 WHERE id = $2', [groups, bookId]);
    }
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Add Group Error:', err);
    res.status(500).json({ error: 'Failed to add group' });
  }
});

// Comments Routes
app.get('/api/book/:bookId/group/:groupName/comments', requireLogin, async (req, res) => {
  const { bookId, groupName } = req.params;
  try {
    const result = await query(
      'SELECT c.*, u.username FROM comments c JOIN users u ON c.user_id = u.id WHERE book_id = $1 AND group_name = $2 ORDER BY created_at',
      [bookId, groupName]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get Comments Error:', err);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

app.post('/api/book/:bookId/group/:groupName/comments', requireLogin, async (req, res) => {
  const { bookId, groupName } = req.params;
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }
  try {
    await query(
      'INSERT INTO comments (book_id, group_name, message, user_id) VALUES ($1, $2, $3, $4)',
      [bookId, groupName, message, req.user.id]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Post Comment Error:', err);
    res.status(500).json({ error: 'Failed to post comment' });
  }
});

// Circles Routes
app.get('/api/circles', requireLogin, async (req, res) => {
  try {
    const result = await query('SELECT * FROM circles WHERE $1 = ANY(member_ids)', [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error('Get Circles Error:', err);
    res.status(500).json({ error: 'Failed to fetch circles' });
  }
});

app.post('/api/circles', requireLogin, async (req, res) => {
  const { name, bookId } = req.body;
  if (!name || !bookId) {
    return res.status(400).json({ error: 'Name and book ID are required' });
  }
  try {
    const result = await query(
      'INSERT INTO circles (name, book_id, member_ids) VALUES ($1, $2, $3) RETURNING id',
      [name, bookId, [req.user.id]]
    );
    res.status(201).json({ success: true, circleId: result.rows[0].id });
  } catch (err) {
    console.error('Create Circle Error:', err);
    res.status(500).json({ error: 'Failed to create circle' });
  }
});

// Achievements Routes
app.get('/api/achievements', requireLogin, async (req, res) => {
  try {
    const result = await query('SELECT * FROM achievements WHERE user_id = $1', [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error('Get Achievements Error:', err);
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
});

app.post('/api/achievements', requireLogin, async (req, res) => {
  const { name, description, icon } = req.body;
  try {
    const result = await query(
      'INSERT INTO achievements (user_id, name, description, icon) VALUES ($1, $2, $3, $4) RETURNING id',
      [req.user.id, name, description, icon]
    );
    res.status(201).json({ success: true, achievementId: result.rows[0].id });
  } catch (err) {
    console.error('Add Achievement Error:', err);
    res.status(500).json({ error: 'Failed to add achievement' });
  }
});

// Onboarding Route
app.post('/api/onboarding', requireLogin, async (req, res) => {
  const { profile_picture, user_location, genres, favorite_authors, reading_pace, goals, to_read_list, book_length } = req.body;
  try {
    const result = await query(
      `UPDATE users 
       SET profile_picture = $1, user_location = $2, genres = $3, favorite_authors = $4, 
           reading_pace = $5, goals = $6, to_read_list = $7, book_length = $8 
       WHERE id = $9 
       RETURNING id`,
      [profile_picture || null, user_location, genres, favorite_authors.split(/[,;\n]/).map(a => a.trim()), 
       parseInt(reading_pace, 10), goals, to_read_list.split(/[,;\n]/).map(b => b.trim()), book_length, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json({ success: true, message: 'Onboarding data saved' });
  } catch (err) {
    console.error('Onboarding Error:', err);
    res.status(500).json({ error: 'Failed to save onboarding data' });
  }
});

// Preview Generation Route
app.post('/api/generate-preview', requireLogin, async (req, res) => {
  const { excerpt } = req.body;
  if (!excerpt || excerpt.split(' ').length < 300) {
    return res.status(400).json({ error: 'Excerpt must be provided and at least 300 words' });
  }
  try {
    const response = await fetch('https://magicloops.dev/api/loop/cd17eed2-c28d-4960-bed5-087ab13ba3d5/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ excerpt }),
    });
    if (!response.ok) throw new Error(`MagicLoops API failed: ${response.status}`);
    const data = await response.json();
    res.json({ preview: data.preview || 'Preview not available' });
  } catch (err) {
    console.error('Preview Generation Error:', err);
    res.status(500).json({ error: 'Failed to generate preview' });
  }
});

// Error Handling
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  res.status(500).json({ error: 'Something went wrong on the server' });
});

// Start Server
const startServer = async () => {
  try {
    await connectDB();
    await initDB();

    await query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS profile_picture TEXT,
      ADD COLUMN IF NOT EXISTS user_location VARCHAR(255),
      ADD COLUMN IF NOT EXISTS genres TEXT[],
      ADD COLUMN IF NOT EXISTS favorite_authors TEXT[],
      ADD COLUMN IF NOT EXISTS reading_pace INT,
      ADD COLUMN IF NOT EXISTS goals TEXT[],
      ADD COLUMN IF NOT EXISTS to_read_list TEXT[],
      ADD COLUMN IF NOT EXISTS book_length VARCHAR(50),
      ADD COLUMN IF NOT EXISTS currently_reading INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS completed_books INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS reading_streak INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS badges INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS points INT DEFAULT 0
    `);

    await query(`
      ALTER TABLE books
      ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS excerpt TEXT
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS circles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        book_id INT REFERENCES books(id),
        member_ids INT[] DEFAULT '{}'
      )
    `);

    await query(`
      ALTER TABLE comments
      ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(id)
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS achievements (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        icon VARCHAR(255),
        earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Database schema updated');
    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`Server running on port ${port}`));
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

startServer();