const db = require('../db');

module.exports = {
  createUser: async (username, email, name, age, password) => {
    const result = await db.query(
      'INSERT INTO users (username, email, name, age, password) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [username, email, name, age, password]
    );
    return result.rows[0].id;
  },
  findUserByUsername: async (username, password) => {
    const result = await db.query(
      'SELECT * FROM users WHERE username = $1 AND password = $2',
      [username, password]
    );
    return result.rows[0];
  },
  findUserByEmail: async (email, password) => {
    const result = await db.query(
      'SELECT * FROM users WHERE email = $1 AND password = $2',
      [email, password]
    );
    return result.rows[0];
  },
};