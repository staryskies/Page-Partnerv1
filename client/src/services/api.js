import { API_URL } from '../config';

export async function getBookDetails(bookId) {
  try {
    console.log(`Fetching book details from: ${API_URL}/api/book/${bookId}`);
    const response = await fetch(`${API_URL}/api/book/${bookId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch book: ${response.status} - ${errorText}`);
    }
    const data = await response.json();
    console.log('Book Details Response:', data);
    return data;
  } catch (err) {
    console.error('getBookDetails Error:', err.message);
    throw err;
  }
}

export async function getComments(bookId, groupId) {
  try {
    console.log(`Fetching comments from: ${API_URL}/api/book/${bookId}/group/${groupId}/comments`);
    const response = await fetch(`${API_URL}/api/book/${bookId}/group/${groupId}/comments`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch comments: ${response.status} - ${errorText}`);
    }
    const data = await response.json();
    console.log('Comments Response:', data);
    return data;
  } catch (err) {
    console.error('getComments Error:', err.message);
    throw err;
  }
}

export async function postComment(bookId, groupId, message) {
  try {
    console.log(`Posting comment to: ${API_URL}/api/book/${bookId}/group/${groupId}/comments`);
    const response = await fetch(`${API_URL}/api/book/${bookId}/group/${groupId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to post comment: ${response.status} - ${errorText}`);
    }
    console.log('Post Comment Response:', response.status);
  } catch (err) {
    console.error('postComment Error:', err.message);
    throw err;
  }
}