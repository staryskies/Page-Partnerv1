const db = require('../db');

module.exports = {
  createUser: async (username, password) => {
    const result = await db.query(
      'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id',
      [username, password]
    );
    return result.rows[0].id;
  },
  findUser: async (username, password) => {
    const result = await db.query(
      'SELECT * FROM users WHERE username = $1 AND password = $2',
      [username, password]
    );
    return result.rows[0];
  },
};