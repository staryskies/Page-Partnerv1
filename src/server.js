require('dotenv').config();
const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const userController = require('./controllers/userController');

const app = express();

// Database Connection using Render's DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Render's PostgreSQL
  }
});

async function connectDB() {
  try {
    await pool.connect();
    console.log('Connected to Render database');
  } catch (err) {
    console.error('Database connection error:', err);
    throw err;
  }
}

async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        age INT NOT NULL,
        profile_picture TEXT,
        user_location VARCHAR(255),
        genres TEXT[] DEFAULT '{}',
        favorite_authors TEXT[] DEFAULT '{}',
        reading_pace INT,
        goals TEXT[] DEFAULT '{}',
        to_read_list TEXT[] DEFAULT '{}',
        book_length VARCHAR(50),
        currently_reading INT DEFAULT 0,
        completed_books INT DEFAULT 0,
        reading_streak INT DEFAULT 0,
        badges INT DEFAULT 0,
        points INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS books (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        genre VARCHAR(100) NOT NULL,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        excerpt TEXT,
        groups TEXT[] DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS circles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        book_id INT REFERENCES books(id) ON DELETE SET NULL,
        creator VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        members TEXT[] DEFAULT '{}',
        description TEXT,
        privacy VARCHAR(50) DEFAULT 'public',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        book_id INT REFERENCES books(id) ON DELETE CASCADE,
        group_name VARCHAR(255),
        message TEXT NOT NULL,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS achievements (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        icon VARCHAR(255),
        earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Database initialized');
  } catch (err) {
    console.error('Database initialization error:', err);
    throw err;
  }
}

const query = async (text, params) => {
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (err) {
    console.error('Query error:', err);
    throw err;
  }
};

// Input sanitization function
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.replace(/[<>'"%;]/g, '');
};

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Authentication Middleware
const requireLogin = async (req, res, next) => {
  const username = sanitizeInput(req.headers['x-username']);
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
app.post('/api/auth/logout', (req, res) => {
  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

// User Data
app.get('/api/user', requireLogin, async (req, res) => {
  const user = req.user;
  try {
    const circlesResult = await query('SELECT COUNT(*) FROM circles WHERE $1 = ANY(COALESCE(members, \'{}\'))', [user.username]);
    const achievementsResult = await query('SELECT COUNT(*) FROM achievements WHERE user_id = $1', [user.id]);
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
      goals: user.goals || [],
      recommendations: user.recommendations || []
    });
  } catch (err) {
    console.error('User Data Error:', err);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
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
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  
  try {
    const result = await query(
      'SELECT * FROM books WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [req.user.id, limit, offset]
    );
    const totalResult = await query('SELECT COUNT(*) FROM books WHERE user_id = $1', [req.user.id]);
    const totalBooks = parseInt(totalResult.rows[0].count);
    
    res.json({
      books: result.rows,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalBooks / limit),
        totalBooks: totalBooks,
        limit: limit
      }
    });
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
    const sanitizedTitle = sanitizeInput(title);
    const sanitizedGenre = sanitizeInput(genre);
    const sanitizedExcerpt = excerpt ? sanitizeInput(excerpt) : null;
    
    const result = await query(
      'INSERT INTO books (title, genre, user_id, excerpt) VALUES ($1, $2, $3, $4) RETURNING id',
      [sanitizedTitle, sanitizedGenre, req.user.id, sanitizedExcerpt]
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

// Circles Routes
app.get('/api/circles', requireLogin, async (req, res) => {
  try {
    const result = await query(`
      SELECT c.id, c.name, c.book_id, c.creator, c.status, c.members, c.description, c.privacy,
             b.genre AS bookGenre
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
  const { name, book_id, description, privacy } = req.body;
  if (!name || !book_id) {
    return res.status(400).json({ error: 'Name and book_id are required' });
  }
  const sanitizedName = sanitizeInput(name);
  if (sanitizedName.length > 50) {
    return res.status(400).json({ error: 'Circle name must be 50 characters or less' });
  }
  try {
    const bookCheck = await query('SELECT id FROM books WHERE id = $1', [book_id]);
    if (bookCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }
    const duplicateCheck = await query('SELECT id FROM circles WHERE name = $1 AND book_id = $2', [sanitizedName, book_id]);
    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Circle name already exists for this book' });
    }
    const result = await query(
      'INSERT INTO circles (name, book_id, creator, members, description, privacy) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [sanitizedName, book_id, req.user.username, [req.user.username], description || '', privacy || 'public']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create Circle Error:', err);
    res.status(500).json({ error: 'Failed to create circle' });
  }
});

app.post('/api/circles/:circleId/join', requireLogin, async (req, res) => {
  const { circleId } = req.params;
  try {
    const circleResult = await query('SELECT members FROM circles WHERE id = $1', [circleId]);
    if (circleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Circle not found' });
    }
    const members = circleResult.rows[0].members || [];
    if (!members.includes(req.user.username)) {
      members.push(req.user.username);
      await query('UPDATE circles SET members = $1 WHERE id = $2', [members, circleId]);
    }
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Join Circle Error:', err);
    res.status(500).json({ error: 'Failed to join circle' });
  }
});

// Comments Routes
app.get('/api/book/:bookId/group/:groupName/comments', requireLogin, async (req, res) => {
  const { bookId, groupName } = req.params;
  const sanitizedGroupName = sanitizeInput(groupName);
  try {
    const result = await query(
      'SELECT c.*, u.username FROM comments c JOIN users u ON c.user_id = u.id WHERE book_id = $1 AND group_name = $2 ORDER BY created_at',
      [bookId, sanitizedGroupName]
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
  const sanitizedGroupName = sanitizeInput(groupName);
  const sanitizedMessage = sanitizeInput(message);
  try {
    await query(
      'INSERT INTO comments (book_id, group_name, message, user_id) VALUES ($1, $2, $3, $4)',
      [bookId, sanitizedGroupName, sanitizedMessage, req.user.id]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Post Comment Error:', err);
    res.status(500).json({ error: 'Failed to post comment' });
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
      [req.user.id, sanitizeInput(name), sanitizeInput(description), sanitizeInput(icon)]
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
      [
        sanitizeInput(profile_picture) || null,
        sanitizeInput(user_location),
        genres || '{}',
        favorite_authors ? favorite_authors.split(/[,;\n]/).map(a => sanitizeInput(a.trim())) : '{}',
        parseInt(reading_pace, 10) || 0,
        goals || '{}',
        to_read_list ? to_read_list.split(/[,;\n]/).map(b => sanitizeInput(b.trim())) : '{}',
        sanitizeInput(book_length),
        req.user.id
      ]
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
    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`Server running on port ${port}`));
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

startServer();