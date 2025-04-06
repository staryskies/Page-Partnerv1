require('dotenv').config();
const express = require('express');
const path = require('path');
const db = require('./db');
const userController = require('./controllers/userController');
const bookController = require('./controllers/bookController');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to get username from header
const getUsername = (req, res, next) => {
  req.username = req.headers['x-username'];
  if (!req.username) return res.status(401).json({ error: 'Unauthorized: Username required' });
  next();
};

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

// Authentication Routes
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
app.get('/api/books', async (req, res) => {
  const username = req.headers['x-username'];
  if (!username) {
    return res.status(401).json({ error: 'Unauthorized: Username required' });
  }

  try {
    const userResult = await db.query('SELECT id FROM users WHERE username = $1', [username]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = userResult.rows[0].id;
    const booksResult = await db.query('SELECT * FROM books WHERE user_id = $1', [userId]);
    res.json({ books: booksResult.rows });
  } catch (err) {
    console.error('Error fetching books:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/book', requireLogin, bookController.createBook);
app.get('/api/book/:bookId', async (req, res) => {
    const bookId = req.params.bookId;

    if (!bookId || isNaN(bookId)) {
        return res.status(400).json({ error: 'Invalid book ID' });
    }

    try {
        const result = await db.query('SELECT * FROM books WHERE id = $1', [bookId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Book not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching book:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Backend: Filter books by the logged-in user
app.get('/api/users/:username/books', async (req, res) => {
  const { username } = req.params;
  try {
    const result = await db.query(
      'SELECT * FROM books WHERE user_id = (SELECT user_id FROM users WHERE username = $1)',
      [username]
    );
    res.json({ books: result.rows });
  } catch (err) {
    console.error('Error fetching user books:', err);
    res.status(500).json({ error: 'Failed to fetch books' });
  }
});

// Circles Routes
app.get('/api/circles', getUsername, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT c.*, b.genre AS bookGenre 
            FROM circles c 
            LEFT JOIN books b ON c.book_id = b.id
            WHERE c.privacy = 'public' OR c.creator = $1 OR $1 = ANY(COALESCE(c.members, '{}'))
        `, [req.username]);

        // Map the result to match frontend expectations
        const circles = result.rows.map(row => ({
            id: row.id,
            name: row.name,
            bookId: row.book_id, // Ensure this matches frontend expectation
            creator: row.creator,
            status: row.status,
            members: row.members,
            description: row.description,
            privacy: row.privacy,
            genre: row.bookGenre // Include genre from the joined books table
        }));

        res.json(circles);
    } catch (err) {
        console.error('Get Circles Error:', err);
        res.status(500).json({ error: 'Failed to fetch circles' });
    }
});

app.post('/api/circles', getUsername, async (req, res) => {
    const { name, bookId, description, privacy } = req.body;
    if (!name || !bookId) return res.status(400).json({ error: 'Name and bookId are required' });

    try {
        const bookCheck = await db.query('SELECT id FROM books WHERE id = $1', [bookId]);
        if (bookCheck.rows.length === 0) return res.status(404).json({ error: 'Book not found' });

        const result = await db.query(
            'INSERT INTO circles (name, book_id, creator, members, description, privacy) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [name, bookId, req.username, [req.username], description || '', privacy || 'public']
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Create Circle Error:', err);
        res.status(500).json({ error: 'Failed to create circle' });
    }
});

app.post('/api/circles/:id/join', getUsername, async (req, res) => {
  try {
    const circleResult = await db.query('SELECT * FROM circles WHERE id = $1', [req.params.id]);
    if (circleResult.rows.length === 0) return res.status(404).json({ error: 'Circle not found' });
    const circle = circleResult.rows[0];
    if (circle.members.includes(req.username)) {
      return res.status(400).json({ error: 'You are already a member of this circle' });
    }
    if (circle.privacy === 'private' && circle.creator !== req.username) {
      return res.status(403).json({ error: 'This is a private circle. Only the creator can invite members.' });
    }
    const updatedMembers = [...circle.members, req.username];
    const updateResult = await db.query(
      'UPDATE circles SET members = $1 WHERE id = $2 RETURNING *',
      [updatedMembers, req.params.id]
    );
    res.json(updateResult.rows[0]);
  } catch (err) {
    console.error('Join Circle Error:', err);
    res.status(500).json({ error: 'Failed to join circle' });
  }
});

app.delete('/api/circles/:id', getUsername, async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM circles WHERE id = $1 AND creator = $2 RETURNING *',
      [req.params.id, req.username]
    );
    if (result.rows.length === 0) return res.status(403).json({ error: 'You are not authorized to delete this circle' });
    res.json({ message: 'Circle deleted successfully' });
  } catch (err) {
    console.error('Delete Circle Error:', err);
    res.status(500).json({ error: 'Failed to delete circle' });
  }
});

// Comments Rsdfsdfsd
app.get('/api/book/:bookId/group/:groupName/comments', getUsername, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT c.*, u.username 
      FROM comments c 
      JOIN users u ON c.user_id = u.id 
      WHERE c.book_id = $1 AND c.group_name = $2 
      ORDER BY c.created_at ASC
    `, [req.params.bookId, req.params.groupName]);
    res.json(result.rows);
  } catch (err) {
    console.error('Get Comments Error:', err);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

app.post('/api/book/:bookId/group/:groupName/comments', getUsername, async (req, res) => {
  const { message } = req.body;
  try {
    const userResult = await db.query('SELECT id FROM users WHERE username = $1', [req.username]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const circleResult = await db.query(
      'SELECT * FROM circles WHERE book_id = $1 AND name = $2',
      [req.params.bookId, req.params.groupName]
    );
    if (circleResult.rows.length === 0) return res.status(404).json({ error: 'Circle not found' });
    if (!circleResult.rows[0].members.includes(req.username)) {
      return res.status(403).json({ error: 'You must be a member of this circle to comment' });
    }
    const result = await db.query(
      'INSERT INTO comments (book_id, group_name, message, user_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.params.bookId, req.params.groupName, message, userResult.rows[0].id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Post Comment Error:', err);
    res.status(500).json({ error: 'Failed to post comment' });
  }
});

// Error Handling
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  res.status(500).json({ error: 'Something went wrong on the server' });
});

// Start Server with Database Initialization
(async () => {
  try {
    await db.connectDB(); // Connect to the database
    await db.initDB();    // Initialize the database tables
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1); // Exit if database setup fails
  }
})();