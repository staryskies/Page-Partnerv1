const baseUrl = window.location.origin;
let selectedBookId = null;
let selectedGroupName = null;

// Redirect Logic
if (window.location.pathname === '/homepage.html' && localStorage.getItem('username')) {
  window.location.href = '/index.html';
}

if (
  !localStorage.getItem('username') &&
  window.location.pathname !== '/' &&
  window.location.pathname !== '/homepage.html' &&
  window.location.pathname !== '/login.html' &&
  window.location.pathname !== '/signup.html' &&
  window.location.pathname !== '/onboarding.html' &&
  window.location.pathname !== '/circles.html' &&
  window.location.pathname !== '/add-book.html' &&
  window.location.pathname !== '/achievements.html' &&
  window.location.pathname !== '/read.html' &&
  window.location.pathname !== '/discover.html'
) {
  window.location.href = '/login.html';
}

// Display username and load books on index page
if (window.location.pathname === '/index.html') {
  const username = localStorage.getItem('username');
  if (username) {
    document.getElementById('username').innerText = username;
    loadBooks();
  }
}

// Login function
async function handleLogin() {
  const identifier = document.getElementById('identifier').value;
  const password = document.getElementById('password').value;
  const errorElement = document.getElementById('error');

  errorElement.textContent = '';

  if (!identifier || !password) {
    errorElement.textContent = 'Please enter both username/email and password.';
    return;
  }

  try {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Login failed');
    localStorage.setItem('username', result.username);
    window.location.href = '/index.html';
  } catch (err) {
    console.error('Login Error:', err);
    errorElement.textContent = err.message;
  }
}

// Signup function
async function handleSignup() {
  const username = document.getElementById('username').value;
  const email = document.getElementById('email').value;
  const name = document.getElementById('name').value;
  const age = document.getElementById('age').value;
  const password = document.getElementById('password').value;
  const errorElement = document.getElementById('error');

  errorElement.textContent = '';

  if (!username || !email || !name || !age || !password) {
    errorElement.textContent = 'Please fill in all fields.';
    return;
  }

  try {
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, name, age, password }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Signup failed');
    localStorage.setItem('username', result.username);
    window.location.href = '/onboarding.html';
  } catch (err) {
    console.error('Signup Error:', err);
    errorElement.textContent = err.message;
  }
}

// Logout function
function logout() {
  localStorage.removeItem('username');
  window.location.href = '/homepage.html';
}

// Load all books
async function loadBooks() {
  try {
    const response = await fetch(`${baseUrl}/api/books`, {
      headers: { 'X-Username': localStorage.getItem('username') },
    });
    if (!response.ok) throw new Error(`Failed to fetch books: ${response.status}`);
    const books = await response.json();
    const bookSelect = document.getElementById('book-select');
    bookSelect.innerHTML = '<option value="">Select a book</option>';
    books.forEach(book => {
      const option = document.createElement('option');
      option.value = book.id;
      option.innerText = book.title;
      bookSelect.appendChild(option);
    });
  } catch (err) {
    console.error('Load Books Error:', err);
    document.getElementById('error').innerText = err.message;
  }
}

// Add a new book
async function addBook() {
  const title = document.getElementById('book-title').value;
  const genre = document.getElementById('book-genre').value;
  if (!title || !genre) return;
  try {
    const response = await fetch(`${baseUrl}/api/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Username': localStorage.getItem('username') },
      body: JSON.stringify({ title, genre }),
    });
    if (!response.ok) throw new Error(`Failed to add book: ${response.status}`);
    document.getElementById('book-title').value = '';
    document.getElementById('book-genre').value = '';
    loadBooks();
  } catch (err) {
    console.error('Add Book Error:', err);
    document.getElementById('error').innerText = err.message;
  }
}

// Load groups for the selected book
async function loadGroups() {
  const bookId = document.getElementById('book-select').value;
  selectedBookId = bookId;
  if (!bookId) {
    document.getElementById('group-select').innerHTML = '<option value="">Select a group</option>';
    document.getElementById('book-details').innerText = 'Select a book to view details';
    document.getElementById('comments').innerHTML = 'Select a book and group to view comments';
    return;
  }

  try {
    const bookResponse = await fetch(`${baseUrl}/api/book/${bookId}`, {
      headers: { 'X-Username': localStorage.getItem('username') },
    });
    if (!bookResponse.ok) throw new Error(`Failed to fetch book: ${bookResponse.status}`);
    const book = await bookResponse.json();
    document.getElementById('book-details').innerText = `${book.title} (${book.genre})`;

    const groupSelect = document.getElementById('group-select');
    groupSelect.innerHTML = '<option value="">Select a group</option>';
    book.groups.forEach(group => {
      const option = document.createElement('option');
      option.value = group;
      option.innerText = group;
      groupSelect.appendChild(option);
    });

    document.getElementById('comments').innerHTML = 'Select a group to view comments';
  } catch (err) {
    console.error('Load Groups Error:', err);
    document.getElementById('error').innerText = err.message;
  }
}

// Add a new group
async function addGroup() {
  if (!selectedBookId) {
    document.getElementById('error').innerText = 'Please select a book first';
    return;
  }
  const name = document.getElementById('new-group').value;
  if (!name) return;
  try {
    const response = await fetch(`${baseUrl}/api/book/${selectedBookId}/group`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Username': localStorage.getItem('username') },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) throw new Error(`Failed to add group: ${response.status}`);
    document.getElementById('new-group').value = '';
    loadGroups();
  } catch (err) {
    console.error('Add Group Error:', err);
    document.getElementById('error').innerText = err.message;
  }
}

// Load comments for the selected group
async function loadComments() {
  const groupName = document.getElementById('group-select').value;
  selectedGroupName = groupName;
  if (!selectedBookId || !groupName) {
    document.getElementById('comments').innerHTML = 'Select a book and group to view comments';
    return;
  }

  try {
    const response = await fetch(`${baseUrl}/api/book/${selectedBookId}/group/${encodeURIComponent(groupName)}/comments`, {
      headers: { 'X-Username': localStorage.getItem('username') },
    });
    if (!response.ok) throw new Error(`Failed to fetch comments: ${response.status}`);
    const comments = await response.json();
    const commentsDiv = document.getElementById('comments');
    commentsDiv.innerHTML = '';
    comments.forEach(comment => {
      const p = document.createElement('p');
      p.className = 'comment';
      p.innerText = `${comment.username}: ${comment.message}`;
      commentsDiv.appendChild(p);
    });
  } catch (err) {
    console.error('Load Comments Error:', err);
    document.getElementById('error').innerText = err.message;
  }
}

// Post a comment
async function postComment() {
  if (!selectedBookId || !selectedGroupName) {
    document.getElementById('error').innerText = 'Please select a book and group';
    return;
  }
  const message = document.getElementById('new-comment').value;
  if (!message) return;
  try {
    const response = await fetch(`${baseUrl}/api/book/${selectedBookId}/group/${encodeURIComponent(selectedGroupName)}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Username': localStorage.getItem('username') },
      body: JSON.stringify({ message }),
    });
    if (!response.ok) throw new Error(`Failed to post comment: ${response.status}`);
    document.getElementById('new-comment').value = '';
    loadComments();
  } catch (err) {
    console.error('Post Comment Error:', err);
    document.getElementById('error').innerText = err.message;
  }
}

app.get('/api/user', requireLogin, async (req, res) => {
  try {
    const user = req.user; // Assume `requireLogin` middleware attaches the user object
    res.json({
      displayName: user.name,
      currentlyReading: user.currently_reading || 0,
      completedBooks: user.completed_books || 0,
      readingStreak: user.reading_streak || 0,
      badges: user.badges || 0,
      points: user.points || 0,
    });
  } catch (err) {
    console.error('Get User Data Error:', err);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

javascript

Collapse

Wrap

Copy
// Review Routes

// Get all reviews for the logged-in user (My Reviews tab)
app.get('/api/reviews', requireLogin, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const filter = sanitizeInput(req.query.filter) || 'all'; // e.g., 'all', '5', 'helpful'
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

    const result = await query(queryText, params);
    const totalResult = await query('SELECT COUNT(*) FROM reviews WHERE user_id = $1', [req.user.id]);
    const totalReviews = parseInt(totalResult.rows[0].count);

    res.json({
      reviews: result.rows,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalReviews / limit),
        totalReviews: totalReviews,
        limit: limit,
      },
    });
  } catch (err) {
    console.error('Get Reviews Error:', err);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Get community reviews (Community tab)
app.get('/api/reviews/community', requireLogin, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const filter = sanitizeInput(req.query.filter) || 'recent'; // e.g., 'recent', 'top', 'discussed'
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

    const result = await query(queryText, params);
    const totalResult = await query(
      "SELECT COUNT(*) FROM reviews WHERE status = 'approved' AND user_id != $1",
      [req.user.id]
    );
    const totalReviews = parseInt(totalResult.rows[0].count);

    res.json({
      reviews: result.rows,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalReviews / limit),
        totalReviews: totalReviews,
        limit: limit,
      },
    });
  } catch (err) {
    console.error('Get Community Reviews Error:', err);
    res.status(500).json({ error: 'Failed to fetch community reviews' });
  }
});

// Create a new review
app.post('/api/reviews', requireLogin, async (req, res) => {
  const {
    book_id,
    review_title,
    rating,
    review_text,
    tags,
    contains_spoilers,
  } = req.body;

  if (!book_id || !review_title || !rating || !review_text) {
    return res.status(400).json({ error: 'Book ID, review title, rating, and review text are required' });
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }

  if (review_text.length < 50) {
    return res.status(400).json({ error: 'Review text must be at least 50 characters' });
  }

  try {
    // Verify the book exists and belongs to the user
    const bookCheck = await query('SELECT id FROM books WHERE id = $1 AND user_id = $2', [book_id, req.user.id]);
    if (bookCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found or not owned by user' });
    }

    const sanitizedReviewTitle = sanitizeInput(review_title);
    const sanitizedReviewText = sanitizeInput(review_text);
    const sanitizedTags = Array.isArray(tags) ? tags.map(t => sanitizeInput(t)) : [];

    const result = await query(
      `INSERT INTO reviews (user_id, book_id, review_title, rating, review_text, tags, contains_spoilers)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [req.user.id, book_id, sanitizedReviewTitle, rating, sanitizedReviewText, sanitizedTags, contains_spoilers || false]
    );

    res.status(201).json({ success: true, reviewId: result.rows[0].id });
  } catch (err) {
    console.error('Create Review Error:', err);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

// Update a review
app.patch('/api/reviews/:id', requireLogin, async (req, res) => {
  const { id } = req.params;
  const { review_title, rating, review_text, tags, contains_spoilers } = req.body;

  try {
    const reviewCheck = await query('SELECT * FROM reviews WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (reviewCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found or not owned by user' });
    }

    const updates = [];
    const params = [id, req.user.id];
    let paramIndex = 3;

    if (review_title) {
      updates.push(`review_title = $${paramIndex++}`);
      params.push(sanitizeInput(review_title));
    }
    if (rating) {
      if (rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating must be between 1 and 5' });
      }
      updates.push(`rating = $${paramIndex++}`);
      params.push(rating);
    }
    if (review_text) {
      if (review_text.length < 50) {
        return res.status(400).json({ error: 'Review text must be at least 50 characters' });
      }
      updates.push(`review_text = $${paramIndex++}`);
      params.push(sanitizeInput(review_text));
    }
    if (tags) {
      updates.push(`tags = $${paramIndex++}`);
      params.push(Array.isArray(tags) ? tags.map(t => sanitizeInput(t)) : []);
    }
    if (typeof contains_spoilers === 'boolean') {
      updates.push(`contains_spoilers = $${paramIndex++}`);
      params.push(contains_spoilers);
    }

    if (updates.length > 0) {
      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      const queryText = `UPDATE reviews SET ${updates.join(', ')} WHERE id = $1 AND user_id = $2`;
      await query(queryText, params);
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Update Review Error:', err);
    res.status(500).json({ error: 'Failed to update review' });
  }
});

// Delete a review
app.delete('/api/reviews/:id', requireLogin, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query('DELETE FROM reviews WHERE id = $1 AND user_id = $2 RETURNING id', [id, req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found or not owned by user' });
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Delete Review Error:', err);
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

// Vote on a review (helpful/not helpful)
app.post('/api/reviews/:id/vote', requireLogin, async (req, res) => {
  const { id } = req.params;
  const { vote } = req.body; // 'helpful' or 'not_helpful'

  if (vote !== 'helpful' && vote !== 'not_helpful') {
    return res.status(400).json({ error: 'Invalid vote type' });
  }

  try {
    const reviewCheck = await query('SELECT user_id, helpful_votes FROM reviews WHERE id = $1', [id]);
    if (reviewCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }
    if (reviewCheck.rows[0].user_id === req.user.id) {
      return res.status(403).json({ error: 'Cannot vote on your own review' });
    }

    // Simplified voting: increment helpful_votes (no tracking of individual user votes here)
    const newVotes = vote === 'helpful' ? reviewCheck.rows[0].helpful_votes + 1 : reviewCheck.rows[0].helpful_votes;
    await query('UPDATE reviews SET helpful_votes = $1 WHERE id = $2', [newVotes, id]);

    res.status(200).json({ success: true, helpful_votes: newVotes });
  } catch (err) {
    console.error('Vote Review Error:', err);
    res.status(500).json({ error: 'Failed to vote on review' });
  }
});
