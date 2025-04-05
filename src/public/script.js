const baseUrl = window.location.origin;
let selectedBookId = null;
let selectedGroupId = null;

// Redirect to login if not logged in
if (!localStorage.getItem('username') && window.location.pathname !== '/login.html') {
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

// Load all books
async function loadBooks() {
  try {
    const response = await fetch(`${baseUrl}/api/books`);
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, genre }),
    });
    if (!response.ok) throw new Error(`Failed to add book: ${response.status}`);
    document.getElementById('book-title').value = '';
    document.getElementById('book-genre').value = '';
    loadBooks();
  } catch (err) {
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
    // Fetch book details
    const bookResponse = await fetch(`${baseUrl}/api/book/${bookId}`);
    if (!bookResponse.ok) throw new Error(`Failed to fetch book: ${bookResponse.status}`);
    const book = await bookResponse.json();
    document.getElementById('book-details').innerText = `${book.title} (${book.genre})`;

    // Fetch groups
    const groupsResponse = await fetch(`${baseUrl}/api/book/${bookId}/groups`);
    if (!groupsResponse.ok) throw new Error(`Failed to fetch groups: ${groupsResponse.status}`);
    const groups = await groupsResponse.json();
    const groupSelect = document.getElementById('group-select');
    groupSelect.innerHTML = '<option value="">Select a group</option>';
    groups.forEach(group => {
      const option = document.createElement('option');
      option.value = group.id;
      option.innerText = group.name;
      groupSelect.appendChild(option);
    });

    // Clear comments until a group is selected
    document.getElementById('comments').innerHTML = 'Select a group to view comments';
  } catch (err) {
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) throw new Error(`Failed to add group: ${response.status}`);
    document.getElementById('new-group').value = '';
    loadGroups();
  } catch (err) {
    document.getElementById('error').innerText = err.message;
  }
}

// Load comments for the selected group
async function loadComments() {
  const groupId = document.getElementById('group-select').value;
  selectedGroupId = groupId;
  if (!selectedBookId || !groupId) {
    document.getElementById('comments').innerHTML = 'Select a book and group to view comments';
    return;
  }

  try {
    const response = await fetch(`${baseUrl}/api/book/${selectedBookId}/group/${groupId}/comments`);
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
  if (!selectedBookId || !selectedGroupId) {
    document.getElementById('error').innerText = 'Please select a book and group';
    return;
  }
  const message = document.getElementById('new-comment').value;
  if (!message) return;
  try {
    const response = await fetch(`${baseUrl}/api/book/${selectedBookId}/group/${selectedGroupId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    if (!response.ok) throw new Error(`Failed to post comment: ${response.status}`);
    document.getElementById('new-comment').value = '';
    loadComments();
  } catch (err) {
    document.getElementById('error').innerText = err.message;
  }
}