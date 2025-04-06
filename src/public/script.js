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
  window.location.pathname !== '/discover.html' &&
  window.location.pathname !== '/reviews.html' // Added reviews.html
) {
  window.location.href = '/login.html';
}

// Display username and load content on index page
if (window.location.pathname === '/index.html') {
  const username = localStorage.getItem('username');
  if (username) {
    document.getElementById('username').innerText = username;
    loadBooks();
    loadReviews();
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
    if (bookSelect) {
      bookSelect.innerHTML = '<option value="">Select a book</option>';
      books.forEach(book => {
        const option = document.createElement('option');
        option.value = book.id;
        option.innerText = book.title;
        bookSelect.appendChild(option);
      });
    }
    return books; // Return books for use in other functions
  } catch (err) {
    console.error('Load Books Error:', err);
    const errorEl = document.getElementById('error');
    if (errorEl) errorEl.innerText = err.message;
    return [];
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

// Load reviews (updated to return data)
async function loadReviews() {
  try {
    const response = await fetch(`${baseUrl}/api/reviews`, {
      headers: { 'X-Username': localStorage.getItem('username') },
    });
    if (!response.ok) throw new Error('Failed to fetch reviews');
    const data = await response.json();
    const reviewsDiv = document.getElementById('reviews') || document.getElementById('my-reviews-list');
    if (reviewsDiv) {
      reviewsDiv.innerHTML = '';
      data.reviews.forEach(review => {
        const div = document.createElement('div');
        div.innerHTML = `
          <h3>${review.review_title}</h3>
          <p>Book: ${review.book_title} (${review.book_genre})</p>
          <p>Rating: ${review.rating}/5</p>
          <p>${review.review_text}</p>
          <p>Helpful votes: ${review.helpful_votes}</p>
          <button onclick="deleteReview(${review.id})">Delete</button>
        `;
        reviewsDiv.appendChild(div);
      });
    }
    return data.reviews;
  } catch (err) {
    console.error('Load Reviews Error:', err);
    const errorEl = document.getElementById('error');
    if (errorEl) errorEl.innerText = err.message;
    return [];
  }
}

// Load community reviews (updated to return data)
async function loadCommunityReviews() {
  try {
    const response = await fetch(`${baseUrl}/api/reviews/community`, {
      headers: { 'X-Username': localStorage.getItem('username') },
    });
    if (!response.ok) throw new Error('Failed to fetch community reviews');
    const data = await response.json();
    const communityDiv = document.getElementById('community-reviews') || document.getElementById('community-reviews-list');
    if (communityDiv) {
      communityDiv.innerHTML = '';
      data.reviews.forEach(review => {
        const div = document.createElement('div');
        div.innerHTML = `
          <h3>${review.review_title}</h3>
          <p>By: ${review.username}</p>
          nec<p>Book: ${review.book_title} (${review.book_genre})</p>
          <p>Rating: ${review.rating}/5</p>
          <p>${review.review_text}</p>
          <p>Helpful votes: ${review.helpful_votes}</p>
          <button onclick="voteReview(${review.id}, 'helpful')">Helpful</button>
        `;
        communityDiv.appendChild(div);
      });
    }
    return data.reviews;
  } catch (err) {
    console.error('Load Community Reviews Error:', err);
    const errorEl = document.getElementById('error');
    if (errorEl) errorEl.innerText = err.message;
    return [];
  }
}

// Add a new review (modified to accept full review object)
async function addReview(reviewData) {
  const { book_id, review_title, rating, review_text, tags, contains_spoilers } = reviewData;
  if (!book_id || !review_title || !rating || !review_text) {
    throw new Error('All required fields must be provided');
  }

  try {
    const response = await fetch(`${baseUrl}/api/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Username': localStorage.getItem('username') },
      body: JSON.stringify({ book_id, review_title, rating, review_text, tags, contains_spoilers }),
    });
    if (!response.ok) throw new Error('Failed to add review');
    return await response.json(); // Return the created review
  } catch (err) {
    console.error('Add Review Error:', err);
    throw err;
  }
}

// Delete a review
async function deleteReview(reviewId) {
  try {
    const response = await fetch(`${baseUrl}/api/reviews/${reviewId}`, {
      method: 'DELETE',
      headers: { 'X-Username': localStorage.getItem('username') },
    });
    if (!response.ok) throw new Error('Failed to delete review');
    return true;
  } catch (err) {
    console.error('Delete Review Error:', err);
    throw err;
  }
}

// Vote on a review
async function voteReview(reviewId, vote) {
  try {
    const response = await fetch(`${baseUrl}/api/reviews/${reviewId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Username': localStorage.getItem('username') },
      body: JSON.stringify({ vote }),
    });
    if (!response.ok) throw new Error('Failed to vote on review');
    return true;
  } catch (err) {
    console.error('Vote Review Error:', err);
    throw err;
  }
}