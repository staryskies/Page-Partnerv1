// client.js
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
  window.location.pathname !== '/onboarding.html'
) {
  window.location.href = '/login.html';
}

// Display username and load books on index page
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
    if (!response.ok) throw new Error('Failed to fetch books');
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
    if (!response.ok) throw new Error('Failed to add book');
    document.getElementById('book-title').value = '';
    document.getElementById('book-genre').value = '';
    loadBooks();
  } catch (err) {
    document.getElementById('error').innerText = err.message;
  }
}

// Load reviews
async function loadReviews() {
  try {
    const response = await fetch(`${baseUrl}/api/reviews`, {
      headers: { 'X-Username': localStorage.getItem('username') },
    });
    if (!response.ok) throw new Error('Failed to fetch reviews');
    const data = await response.json();
    const reviewsDiv = document.getElementById('reviews');
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
  } catch (err) {
    document.getElementById('error').innerText = err.message;
  }
}

// Load community reviews
async function loadCommunityReviews() {
  try {
    const response = await fetch(`${baseUrl}/api/reviews/community`, {
      headers: { 'X-Username': localStorage.getItem('username') },
    });
    if (!response.ok) throw new Error('Failed to fetch community reviews');
    const data = await response.json();
    const communityDiv = document.getElementById('community-reviews');
    communityDiv.innerHTML = '';
    data.reviews.forEach(review => {
      const div = document.createElement('div');
      div.innerHTML = `
        <h3>${review.review_title}</h3>
        <p>By: ${review.username}</p>
        <p>Book: ${review.book_title} (${review.book_genre})</p>
        <p>Rating: ${review.rating}/5</p>
        <p>${review.review_text}</p>
        <p>Helpful votes: ${review.helpful_votes}</p>
        <button onclick="voteReview(${review.id}, 'helpful')">Helpful</button>
      `;
      communityDiv.appendChild(div);
    });
  } catch (err) {
    document.getElementById('error').innerText = err.message;
  }
}

// Add a new review
async function addReview() {
  const bookId = document.getElementById('book-select').value;
  const reviewTitle = document.getElementById('review-title').value;
  const rating = document.getElementById('rating').value;
  const reviewText = document.getElementById('review-text').value;
  const tags = document.getElementById('review-tags').value.split(',').map(tag => tag.trim());
  const containsSpoilers = document.getElementById('contains-spoilers').checked;

  if (!bookId || !reviewTitle || !rating || !reviewText) {
    document.getElementById('error').innerText = 'All fields are required';
    return;
  }

  try {
    const response = await fetch(`${baseUrl}/api/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Username': localStorage.getItem('username') },
      body: JSON.stringify({ book_id: bookId, review_title: reviewTitle, rating, review_text: reviewText, tags, contains_spoilers }),
    });
    if (!response.ok) throw new Error('Failed to add review');
    loadReviews();
  } catch (err) {
    document.getElementById('error').innerText = err.message;
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
    loadReviews();
  } catch (err) {
    document.getElementById('error').innerText = err.message;
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
    loadCommunityReviews();
  } catch (err) {
    document.getElementById('error').innerText = err.message;
  }
}