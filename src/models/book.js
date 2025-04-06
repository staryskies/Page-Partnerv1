const db = require('../db');

const addGroup = async (bookId, groupName) => {
  await db.query(
    'UPDATE books SET groups = array_append(groups, $1) WHERE id = $2',
    [groupName, bookId]
  );
};

module.exports = {
  createBook: async (title, genre, author) => {
    const result = await db.query(
      'INSERT INTO books (title, genre, author, groups) VALUES ($1, $2, $3, $4) RETURNING id',
      [title, genre, author || 'Unknown', []]
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
  addGroup,
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