import { API_URL } from '../config';

export async function getBookDetails(bookId) {
  const response = await fetch(`${API_URL}/api/book/${bookId}`);
  return response.json();
}

export async function getComments(bookId, groupId) {
  const response = await fetch(`${API_URL}/api/book/${bookId}/group/${groupId}/comments`);
  return response.json();
}

export async function postComment(bookId, groupId, message) {
  await fetch(`${API_URL}/api/book/${bookId}/group/${groupId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
}