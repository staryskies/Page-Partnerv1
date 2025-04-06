// server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const db = require('./db');

const app = express();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.replace(/[<>'"%;]/g, '');
};

const requireLogin = async (req, res, next) => {
  const username = sanitizeInput(req.headers['x-username']);
  if (!username) {
    return res.status(401).json({ error: 'Please log in first' });
  }
  try {
    const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
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

// Authentication Routes
app.post('/api/auth/register', async (req, res) => {
  const { username, email, name, age, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.query(
      'INSERT INTO users (username, email, name, age, password) VALUES ($1, $2, $3, $4, $5) RETURNING username',
      [username, email, name, age, hashedPassword]
    );
    res.status(201).json({ username: result.rows[0].username });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { identifier, password } = req.body;
  try {
    const result = await db.query('SELECT * FROM users WHERE username = $1 OR email = $1', [identifier]);
    if (result.rows.length === 0 || !(await bcrypt.compare(password, result.rows[0].password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    res.json({ username: result.rows[0].username });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Book Routes
app.get('/api/books', requireLogin, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM books WHERE user_id = $1', [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch books' });
  }
});

app.post('/api/book', requireLogin, async (req, res) => {
  const { title, genre } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO books (title, genre, user_id) VALUES ($1, $2, $3) RETURNING id',
      [sanitizeInput(title), sanitizeInput(genre), req.user.id]
    );
    res.status(201).json({ success: true, bookId: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add book' });
  }
});

// Review Routes
app.get('/api/reviews', requireLogin, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const filter = sanitizeInput(req.query.filter) || 'all';
  const search = sanitizeInput(req.query.search || '');

  try {
    let queryText = `
      SELECT r.*, b.title AS book_title, b.genre AS book_genre
      FROM reviews r
      JOIN books b ON r.book_id = b.id
      WHERE r.user_id = $1
    `;
    const params = [req.user.id];

    if (search) {
      queryText += ` AND (r.review_title ILIKE $2 OR r.review_text ILIKE $2 OR b.title ILIKE $2)`;
      params.push(`%${search}%`);
    }

    if (filter !== 'all' && filter !== 'helpful') {
      queryText += ` AND r.rating = $${params.length + 1}`;
      params.push(parseInt(filter));
    } else if (filter === 'helpful') {
      queryText += ` AND r.helpful_votes > 0`;
    }

    queryText += ` ORDER BY r.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.query(queryText, params);
    const totalResult = await db.query('SELECT COUNT(*) FROM reviews WHERE user_id = $1', [req.user.id]);
    const totalReviews = parseInt(totalResult.rows[0].count);

    res.json({
      reviews: result.rows,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalReviews / limit),
        totalReviews,
        limit
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

app.get('/api/reviews/community', requireLogin, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const filter = sanitizeInput(req.query.filter) || 'recent';
  const search = sanitizeInput(req.query.search || '');

  try {
    let queryText = `
      SELECT r.*, u.username, b.title AS book_title, b.genre AS book_genre
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      JOIN books b ON r.book_id = b.id
      WHERE r.status = 'approved' AND r.user_id != $1
    `;
    const params = [req.user.id];

    if (search) {
      queryText += ` AND (r.review_title ILIKE $2 OR r.review_text ILIKE $2 OR b.title ILIKE $2 OR u.username ILIKE $2)`;
      params.push(`%${search}%`);
    }

    if (filter === 'top') {
      queryText += ` ORDER BY r.rating DESC, r.helpful_votes DESC`;
    } else if (filter === 'discussed') {
      queryText += ` ORDER BY r.helpful_votes DESC, r.created_at DESC`;
    } else {
      queryText += ` ORDER BY r.created_at DESC`;
    }

    queryText += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.query(queryText, params);
    const totalResult = await db.query(
      "SELECT COUNT(*) FROM reviews WHERE status = 'approved' AND user_id != $1",
      [req.user.id]
    );
    const totalReviews = parseInt(totalResult.rows[0].count);

    res.json({
      reviews: result.rows,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalReviews / limit),
        totalReviews,
        limit
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch community reviews' });
  }
});

app.post('/api/reviews', requireLogin, async (req, res) => {
  const { book_id, review_title, rating, review_text, tags, contains_spoilers } = req.body;

  if (!book_id || !review_title || !rating || !review_text) {
    return res.status(400).json({ error: 'Required fields missing' });
  }

  try {
    const result = await db.query(
      `INSERT INTO reviews (user_id, book_id, review_title, rating, review_text, tags, contains_spoilers)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [req.user.id, book_id, sanitizeInput(review_title), rating, sanitizeInput(review_text), tags || [], contains_spoilers || false]
    );
    res.status(201).json({ success: true, reviewId: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create review' });
  }
});

app.patch('/api/reviews/:id', requireLogin, async (req, res) => {
  const { id } = req.params;
  const { review_title, rating, review_text, tags, contains_spoilers } = req.body;

  try {
    const updates = [];
    const params = [id, req.user.id];
    let paramIndex = 3;

    if (review_title) {
      updates.push(`review_title = $${paramIndex++}`);
      params.push(sanitizeInput(review_title));
    }
    if (rating) {
      updates.push(`rating = $${paramIndex++}`);
      params.push(rating);
    }
    if (review_text) {
      updates.push(`review_text = $${paramIndex++}`);
      params.push(sanitizeInput(review_text));
    }
    if (tags) {
      updates.push(`tags = $${paramIndex++}`);
      params.push(tags);
    }
    if (typeof contains_spoilers === 'boolean') {
      updates.push(`contains_spoilers = $${paramIndex++}`);
      params.push(contains_spoilers);
    }

    if (updates.length > 0) {
      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      await db.query(`UPDATE reviews SET ${updates.join(', ')} WHERE id = $1 AND user_id = $2`, params);
    }
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update review' });
  }
});

app.delete('/api/reviews/:id', requireLogin, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM reviews WHERE id = $1 AND user_id = $2 RETURNING id', [id, req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

app.post('/api/reviews/:id/vote', requireLogin, async (req, res) => {
  const { id } = req.params;
  const { vote } = req.body;

  try {
    const reviewCheck = await db.query('SELECT user_id, helpful_votes FROM reviews WHERE id = $1', [id]);
    if (reviewCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }
    if (reviewCheck.rows[0].user_id === req.user.id) {
      return res.status(403).json({ error: 'Cannot vote on own review' });
    }

    const newVotes = vote === 'helpful' ? reviewCheck.rows[0].helpful_votes + 1 : reviewCheck.rows[0].helpful_votes;
    await db.query('UPDATE reviews SET helpful_votes = $1 WHERE id = $2', [newVotes, id]);
    res.status(200).json({ success: true, helpful_votes: newVotes });
  } catch (err) {
    res.status(500).json({ error: 'Failed to vote on review' });
  }
});

const startServer = async () => {
  try {
    await db.connectDB();
    await db.initDB();
    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`Server running on port ${port}`));
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

startServer();