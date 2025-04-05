const db = require('../db');

module.exports = {
  getBook: async (bookId) => {
    const result = await db.query('SELECT * FROM books WHERE id = $1', [bookId]);
    return result.rows[0];
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