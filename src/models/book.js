const db = require('../db');

module.exports = {
  createBook: async (title, genre) => {
    const result = await db.query(
      'INSERT INTO books (title, genre) VALUES ($1, $2) RETURNING id',
      [title, genre]
    );
    return result.rows[0].id;
  },
  getBooks: async () => {
    const result = await db.query('SELECT * FROM books');
    return result.rows;
  },
  getBook: async (bookId) => {
    const result = await db.query('SELECT * FROM books WHERE id = $1', [bookId]);
    return result.rows[0];
  },
  createGroup: async (bookId, name) => {
    const result = await db.query(
      'INSERT INTO book_groups (book_id, name) VALUES ($1, $2) RETURNING id',
      [bookId, name]
    );
    return result.rows[0].id;
  },
  getGroups: async (bookId) => {
    const result = await db.query(
      'SELECT * FROM book_groups WHERE book_id = $1',
      [bookId]
    );
    return result.rows;
  },
  getComments: async (bookId, groupId) => {
    const result = await db.query(
      'SELECT * FROM comments WHERE book_id = $1 AND group_id = $2 ORDER BY created_at',
      [bookId, groupId]
    );
    return result.rows;
  },
  addComment: async (bookId, groupId, message) => {
    await db.query(
      'INSERT INTO comments (book_id, group_id, message) VALUES ($1, $2, $3)',
      [bookId, groupId, message]
    );
  },
};