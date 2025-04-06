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
  try {
    const circlesResult = await query('SELECT COUNT(*) FROM circles WHERE $1 = ANY(member_ids)', [user.id]);
    const achievementsResult = await query('SELECT COUNT(*) FROM achievements WHERE user_id = $1', [user.id]);
    res.json({
      isLoggedIn: true,
      displayName: user.username,
      currentlyReading: user.currently_reading || 0,
      completedBooks: user.completed_books || 0,
      readingStreak: user.reading_streak || 0,
      badges: parseInt(achievementsResult.rows[0].count, 10),
      points: user.points || 0,
      recommendations: user.recommendations || []
    });
  } catch (err) {
    console.error('Get User Error:', err);
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
    if (completedBooks) {
      await query(
        'UPDATE reading_goals SET progress = progress + $1 WHERE user_id = $2 AND is_active = TRUE',
        [completedBooks, req.user.id]
      );
    }
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
  const { name, bookId, description, isPublic } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  try {
    const result = await query(
      'INSERT INTO circles (name, book_id, member_ids, description, is_public, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [name, bookId || null, [req.user.id], description || null, isPublic !== undefined ? isPublic : true, req.user.id]
    );
    res.status(201).json({ success: true, circleId: result.rows[0].id });
  } catch (err) {
    console.error('Create Circle Error:', err);
    res.status(500).json({ error: 'Failed to create circle' });
  }
});

app.get('/api/circles/public', async (req, res) => {
  const { search } = req.query;
  try {
    let queryText = 'SELECT * FROM circles WHERE is_public = TRUE';
    const params = [];
    if (search) {
      queryText += ' AND (name ILIKE $1 OR description ILIKE $1)';
      params.push(`%${search}%`);
    }
    const result = await query(queryText, params);
    const circles = await Promise.all(result.rows.map(async circle => {
      const book = circle.book_id ? (await query('SELECT title, genre FROM books WHERE id = $1', [circle.book_id])).rows[0] : null;
      return { ...circle, bookTitle: book?.title, bookGenre: book?.genre };
    }));
    res.json(circles);
  } catch (err) {
    console.error('Find Circles Error:', err);
    res.status(500).json({ error: 'Failed to fetch public circles' });
  }
});

app.post('/api/circles/:id/join', requireLogin, async (req, res) => {
  const { id } = req.params;
  try {
    const circleResult = await query('SELECT * FROM circles WHERE id = $1', [id]);
    if (circleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Circle not found' });
    }
    const circle = circleResult.rows[0];
    if (!circle.is_public && !circle.member_ids.includes(req.user.id)) {
      return res.status(403).json({ error: 'This is a private circle' });
    }
    if (circle.member_ids.includes(req.user.id)) {
      return res.status(400).json({ error: 'Already a member of this circle' });
    }
    const updatedMembers = [...circle.member_ids, req.user.id];
    await query('UPDATE circles SET member_ids = $1 WHERE id = $2', [updatedMembers, id]);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Join Circle Error:', err);
    res.status(500).json({ error: 'Failed to join circle' });
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
  const { profile_picture, user_location, genres, favorite_authors, reading_pace, to_read_list, book_length } = req.body;
  try {
    const result = await query(
      `UPDATE users 
       SET profile_picture = $1, user_location = $2, genres = $3, favorite_authors = $4, 
           reading_pace = $5, to_read_list = $6, book_length = $7 
       WHERE id = $8 
       RETURNING id`,
      [
        profile_picture || null,
        user_location,
        genres || [],
        favorite_authors ? favorite_authors.split(/[,;\n]/).map(a => a.trim()) : [],
        parseInt(reading_pace, 10) || 0,
        to_read_list ? to_read_list.split(/[,;\n]/).map(b => b.trim()) : [],
        book_length,
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

// Reading Goals Routes
app.get('/api/reading-goals', requireLogin, async (req, res) => {
  try {
    const result = await query('SELECT * FROM reading_goals WHERE user_id = $1 AND is_active = TRUE', [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error('Get Reading Goals Error:', err);
    res.status(500).json({ error: 'Failed to fetch reading goals' });
  }
});

app.post('/api/reading-goals', requireLogin, async (req, res) => {
  const { targetBooks, timeframe } = req.body;
  if (!targetBooks || !timeframe) {
    return res.status(400).json({ error: 'Target books and timeframe are required' });
  }
  try {
    await query('UPDATE reading_goals SET is_active = FALSE WHERE user_id = $1 AND is_active = TRUE', [req.user.id]);
    const startDate = new Date();
    let endDate;
    if (timeframe === 'month') endDate = new Date(startDate.setMonth(startDate.getMonth() + 1));
    else if (timeframe === 'year') endDate = new Date(startDate.setFullYear(startDate.getFullYear() + 1));
    else return res.status(400).json({ error: 'Invalid timeframe' });

    const result = await query(
      'INSERT INTO reading_goals (user_id, target_books, timeframe, start_date, end_date, progress) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [req.user.id, targetBooks, timeframe, new Date(), endDate, 0]
    );
    res.status(201).json({ success: true, goalId: result.rows[0].id });
  } catch (err) {
    console.error('Set Reading Goal Error:', err);
    res.status(500).json({ error: 'Failed to set reading goal' });
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

    // Ensure all columns and tables exist
    await query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS profile_picture TEXT,
      ADD COLUMN IF NOT EXISTS user_location VARCHAR(255),
      ADD COLUMN IF NOT EXISTS genres TEXT[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS favorite_authors TEXT[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS reading_pace INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS to_read_list TEXT[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS book_length VARCHAR(50),
      ADD COLUMN IF NOT EXISTS currently_reading INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS completed_books INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS reading_streak INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS badges INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS recommendations JSON DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS previews JSON DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS circles JSON DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS friends JSON DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS points INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `);

    await query(`
      ALTER TABLE books
      ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(id) ON DELETE CASCADE,
      ADD COLUMN IF NOT EXISTS excerpt TEXT,
      ADD COLUMN IF NOT EXISTS groups TEXT[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP
    `);

    await query(`
      ALTER TABLE circles
      ADD COLUMN IF NOT EXISTS description TEXT,
      ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS created_by INT REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active'
    `);

    await query(`
      ALTER TABLE comments
      ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(id) ON DELETE CASCADE
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS friendships (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        friend_id INT REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, friend_id)
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS reading_sessions (
        id SERIAL PRIMARY KEY,
        circle_id INT REFERENCES circles(id) ON DELETE CASCADE,
        start_time TIMESTAMP,
        end_time TIMESTAMP,
        is_active BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS reading_goals (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        target_books INT NOT NULL,
        timeframe VARCHAR(50) NOT NULL,
        start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        end_date TIMESTAMP,
        progress INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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