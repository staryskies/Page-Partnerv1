const express = require('express');
const path = require('path');
const { connectDB, initDB } = require('./db');
const userController = require('./controllers/userController'); // For auth routes
const db = require('./db'); // Direct DB access for book routes

const app = express();

// Middleware
app.use(express.json()); // Parse JSON request bodies
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from 'public'

// Optional: Add request logging with morgan (uncomment if installed)
// const morgan = require('morgan');
// app.use(morgan('dev'));

// Default route for homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'homepage.html'));
});

// Authentication Routes
app.post('/api/auth/register', userController.signup);
app.post('/api/auth/login', userController.login);

// Book Routes
// Get all books
app.get('/api/books', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM books');
    res.json(result.rows);
  } catch (err) {
    console.error('Get Books Error:', err);
    res.status(500).json({ error: 'Failed to fetch books' });
  }
});

// Add a new book
app.post('/api/book', async (req, res) => {
  const { title, genre } = req.body;
  if (!title || !genre) {
    return res.status(400).json({ error: 'Title and genre are required' });
  }
  try {
    await db.query(
      'INSERT INTO books (title, genre) VALUES ($1, $2)',
      [title, genre]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Add Book Error:', err);
    res.status(500).json({ error: 'Failed to add book' });
  }
});

// Get book details
app.get('/api/book/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('SELECT * FROM books WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get Book Error:', err);
    res.status(500).json({ error: 'Failed to fetch book' });
  }
});

// Add a group to a book
app.post('/api/book/:id/group', async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Group name is required' });
  }
  try {
    await db.query(
      'UPDATE books SET groups = array_append(groups, $1) WHERE id = $2 AND NOT ($1 = ANY(groups))',
      [name, id]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Add Group Error:', err);
    res.status(500).json({ error: 'Failed to add group' });
  }
});

// Get comments for a book and group
app.get('/api/book/:id/group/:groupName/comments', async (req, res) => {
  const { id, groupName } = req.params;
  try {
    const result = await db.query(
      'SELECT * FROM comments WHERE book_id = $1 AND group_name = $2 ORDER BY created_at',
      [id, groupName]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get Comments Error:', err);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Post a comment
app.post('/api/book/:id/group/:groupName/comments', async (req, res) => {
  const { id, groupName } = req.params;
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }
  try {
    await db.query(
      'INSERT INTO comments (book_id, group_name, message) VALUES ($1, $2, $3)',
      [id, groupName, message]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Post Comment Error:', err);
    res.status(500).json({ error: 'Failed to post comment' });
  }
});

// Error Handling for Unhandled Routes
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' }); // Or serve a 404.html file
});

// Global Error Handler (for unexpected errors)
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  res.status(500).json({ error: 'Something went wrong on the server' });
});

// Start Server and Initialize Database
const startServer = async () => {
  try {
    await connectDB(); // Connect to PostgreSQL
    await initDB();    // Initialize tables and seed data
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1); // Exit with failure if startup fails
  }
};

// Start the server
startServer();