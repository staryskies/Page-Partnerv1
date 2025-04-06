const express = require('express');
const pool = require('../db'); // Assuming you are using a PostgreSQL pool instance
const router = express.Router();

// Get all books
router.get('/books', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM books');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch books' });
  }
});

// Add a new book
router.post('/api/book', async (req, res) => {
  const { title, author, genre, excerpt } = req.body;
  const userId = req.user.id; // Assuming user ID is set from auth middleware

  // Validate required fields
  if (!title || !author || !genre) {
    return res.status(400).json({ error: 'Title, author, and genre are required' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO books (title, author, genre, user_id, excerpt) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [title, author, genre, userId, excerpt]
    );
    res.status(201).json(result.rows[0]); // Return the newly created book
  } catch (err) {
    console.error('Error adding book:', err);
    res.status(500).json({ error: 'Failed to add book' });
  }
});

// Get book details
router.get('/book/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM books WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Book not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch book' });
  }
});

// Add a group to a book
router.post('/book/:id/group', async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Group name is required' });
  try {
    await pool.query(
      'UPDATE books SET groups = array_append(groups, $1) WHERE id = $2 AND NOT ($1 = ANY(groups))',
      [name, id]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add group' });
  }
});

// Get comments for a book and group
router.get('/book/:id/group/:groupName/comments', async (req, res) => {
  const { id, groupName } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM comments WHERE book_id = $1 AND group_name = $2 ORDER BY created_at',
      [id, groupName]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Post a comment
router.post('/book/:id/group/:groupName/comments', async (req, res) => {
  const { id, groupName } = req.params;
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message is required' });
  try {
    await pool.query(
      'INSERT INTO comments (book_id, group_name, message) VALUES ($1, $2, $3)',
      [id, groupName, message]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to post comment' });
  }
});

module.exports = router;