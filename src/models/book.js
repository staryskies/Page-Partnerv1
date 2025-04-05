const db = require('../db');

module.exports = {
  createBook: async (title, genre) => {
    const result = await db.query(
      'INSERT INTO books (title, genre, groups) VALUES ($1, $2, $3) RETURNING id',
      [title, genre, []] // Start with an empty groups array
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
  addGroup: async (bookId, groupName) => {
    await db.query(
      'UPDATE books SET groups = array_append(groups, $1) WHERE id = $2',
      [groupName, bookId]
    );
  },
  getComments: async (bookId, groupName) => {
    const result = await db.query(
      'SELECT * FROM comments WHERE book_id = $1 AND group_name = $2 ORDER BY created_at',
      [bookId, groupName]
    );
    return result.rows;
  },
  addComment: async (bookId, groupName, message) => {
    await db.query(
      'INSERT INTO comments (book_id, group_name, message) VALUES ($1, $2, $3)',
      [bookId, groupName, message]
    );
  },
};