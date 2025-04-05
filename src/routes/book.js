const express = require('express');
const db = require('../db');
const router = express.Router();

// Get all books
router.get('/books', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM books');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch books' });
  }
});

// Add a new book
router.post('/book', async (req, res) => {
  const { title, genre } = req.body;
  if (!title || !genre) return res.status(400).json({ error: 'Title and genre are required' });
  try {
    await db.query(
      'INSERT INTO books (title, genre) VALUES ($1, $2)',
      [title, genre]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add book' });
  }
});

// Get book details
router.get('/book/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('SELECT * FROM books WHERE id = $1', [id]);
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
    await db.query(
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
    const result = await db.query(
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
    await db.query(
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