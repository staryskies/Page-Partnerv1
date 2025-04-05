const baseUrl = window.location.origin;
const bookId = 1;
const groupId = 1;

// Redirect to login if not logged in
if (!localStorage.getItem('username') && window.location.pathname !== '/login.html') {
  window.location.href = '/login.html';
}

// Display username on index page
if (window.location.pathname === '/index.html') {
  const username = localStorage.getItem('username');
  if (username) {
    document.getElementById('username').innerText = username;
    fetchBook();
    fetchComments();
    setInterval(fetchComments, 5000);
  }
}

// Login function
async function login() {
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;
  try {
    const response = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Login failed');
    localStorage.setItem('username', username);
    window.location.href = '/index.html';
  } catch (err) {
    document.getElementById('error').innerText = err.message;
  }
}

// Signup function
async function signup() {
  const username = document.getElementById('signup-username').value;
  const password = document.getElementById('signup-password').value;
  try {
    const response = await fetch(`${baseUrl}/api/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Signup failed');
    localStorage.setItem('username', username);
    window.location.href = '/index.html';
  } catch (err) {
    document.getElementById('error').innerText = err.message;
  }
}

// Logout function
function logout() {
  localStorage.removeItem('username');
  window.location.href = '/login.html';
}

// Fetch book details
async function fetchBook() {
  try {
    const response = await fetch(`${baseUrl}/api/book/${bookId}`);
    if (!response.ok) throw new Error(`Failed to fetch book: ${response.status}`);
    const book = await response.json();
    document.getElementById('book-details').innerText = `${book.title} (${book.genre})`;
  } catch (err) {
    document.getElementById('error').innerText = err.message;
  }
}

// Fetch comments
async function fetchComments() {
  try {
    const response = await fetch(`${baseUrl}/api/book/${bookId}/group/${groupId}/comments`);
    if (!response.ok) throw new Error(`Failed to fetch comments: ${response.status}`);
    const comments = await response.json();
    const commentsDiv = document.getElementById('comments');
    commentsDiv.innerHTML = '';
    comments.forEach(comment => {
      const p = document.createElement('p');
      p.className = 'comment';
      p.innerText = comment.message;
      commentsDiv.appendChild(p);
    });
  } catch (err) {
    document.getElementById('error').innerText = err.message;
  }
}

// Post a comment
async function postComment() {
  const message = document.getElementById('new-comment').value;
  if (!message) return;
  try {
    const response = await fetch(`${baseUrl}/api/book/${bookId}/group/${groupId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    if (!response.ok) throw new Error(`Failed to post comment: ${response.status}`);
    document.getElementById('new-comment').value = '';
    fetchComments();
  } catch (err) {
    document.getElementById('error').innerText = err.message;
  }
}