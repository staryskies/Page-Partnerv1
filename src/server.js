const express = require('express');
const path = require('path');
const { connectDB, initDB, query } = require('./db');
const userController = require('./controllers/userController');

const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Default route for homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'homepage.html'));
});

// Authentication Routes
app.post('/api/auth/register', userController.signup);
app.post('/api/auth/login', userController.login);

// Book Routes
app.get('/api/books', async (req, res) => {
  try {
    const result = await query('SELECT * FROM books');
    res.json(result.rows);
  } catch (err) {
    console.error('Get Books Error:', err);
    res.status(500).json({ error: 'Failed to fetch books' });
  }
});

app.post('/api/book', async (req, res) => {
  const { title, genre } = req.body;
  if (!title || !genre) {
    return res.status(400).json({ error: 'Title and genre are required' });
  }
  try {
    await query('INSERT INTO books (title, genre) VALUES ($1, $2)', [title, genre]);
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Add Book Error:', err);
    res.status(500).json({ error: 'Failed to add book' });
  }
});

app.get('/api/book/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query('SELECT * FROM books WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get Book Error:', err);
    res.status(500).json({ error: 'Failed to fetch book' });
  }
});

app.post('/api/book/:id/group', async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Group name is required' });
  }
  try {
    await query(
      'UPDATE books SET groups = array_append(groups, $1) WHERE id = $2 AND NOT ($1 = ANY(groups))',
      [name, id]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Add Group Error:', err);
    res.status(500).json({ error: 'Failed to add group' });
  }
});

app.get('/api/book/:id/group/:groupName/comments', async (req, res) => {
  const { id, groupName } = req.params;
  try {
    const result = await query(
      'SELECT * FROM comments WHERE book_id = $1 AND group_name = $2 ORDER BY created_at',
      [id, groupName]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get Comments Error:', err);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

app.post('/api/book/:id/group/:groupName/comments', async (req, res) => {
  const { id, groupName } = req.params;
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }
  try {
    await query(
      'INSERT INTO comments (book_id, group_name, message) VALUES ($1, $2, $3)',
      [id, groupName, message]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Post Comment Error:', err);
    res.status(500).json({ error: 'Failed to post comment' });
  }
});

// Onboarding Route
app.post('/api/onboarding', async (req, res) => {
  const {
    username, // Assuming username is passed to link to the user
    profile_picture, // Base64 string or file path if stored separately
    user_location,
    genres,
    favorite_authors,
    reading_pace,
    goals,
    to_read_list,
    book_length
  } = req.body;

  try {
    // Update the users table with onboarding data
    const result = await query(
      `UPDATE users 
       SET profile_picture = $1, 
           user_location = $2, 
           genres = $3, 
           favorite_authors = $4, 
           reading_pace = $5, 
           goals = $6, 
           to_read_list = $7, 
           book_length = $8 
       WHERE username = $9 
       RETURNING id`,
      [
        profile_picture || null,
        user_location,
        genres, // Array of strings
        favorite_authors.split(/[,;\n]/).map(a => a.trim()), // Convert to array
        parseInt(reading_pace, 10),
        goals, // Array of strings
        to_read_list.split(/[,;\n]/).map(b => b.trim()), // Convert to array
        book_length
      ],
      username
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

// Error Handling for Unhandled Routes
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  res.status(500).json({ error: 'Something went wrong on the server' });
});

// Start Server and Initialize Database
const startServer = async () => {
  try {
    await connectDB();
    await initDB();

    // Update database schema to include onboarding fields
    await query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS profile_picture TEXT,
      ADD COLUMN IF NOT EXISTS user_location VARCHAR(255),
      ADD COLUMN IF NOT EXISTS genres TEXT[],
      ADD COLUMN IF NOT EXISTS favorite_authors TEXT[],
      ADD COLUMN IF NOT EXISTS reading_pace INT,
      ADD COLUMN IF NOT EXISTS goals TEXT[],
      ADD COLUMN IF NOT EXISTS to_read_list TEXT[],
      ADD COLUMN IF NOT EXISTS book_length VARCHAR(50)
    `);
    console.log('Database schema updated for onboarding');

    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

startServer();