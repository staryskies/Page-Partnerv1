const bookId = 1;
const groupId = 1;
const baseUrl = window.location.origin; // Dynamically use the Render URL

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
    fetchComments(); // Refresh comments
  } catch (err) {
    document.getElementById('error').innerText = err.message;
  }
}

// Initial fetch
fetchBook();
fetchComments();
setInterval(fetchComments, 5000); // Poll for comments every 5 seconds