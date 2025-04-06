const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

module.exports = {
  connectDB: async () => {
    try {
      await pool.connect();
      console.log('Connected to PostgreSQL database');
    } catch (err) {
      console.error('Database connection error:', err);
      throw err;
    }
  },

  initDB: async () => {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          currently_reading INT DEFAULT 0,
          completed_books INT DEFAULT 0,
          reading_streak INT DEFAULT 0,
          badges INT DEFAULT 0,
          recommendations JSON DEFAULT '[]',
          previews JSON DEFAULT '[]',
          circles JSON DEFAULT '[]',
          friends JSON DEFAULT '[]',
          points INT DEFAULT 0
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS books (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          genre VARCHAR(255) NOT NULL,
          user_id INT REFERENCES users(id),
          excerpt TEXT, -- Added excerpt column
          groups TEXT[] DEFAULT '{}',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS comments (
          id SERIAL PRIMARY KEY,
          book_id INT REFERENCES books(id),
          group_name VARCHAR(255),
          message TEXT NOT NULL,
          user_id INT REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS circles (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          book_id INT REFERENCES books(id),
          member_ids INT[] DEFAULT '{}'
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS achievements (
          id SERIAL PRIMARY KEY,
          user_id INT REFERENCES users(id),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          icon VARCHAR(255),
          earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('Database initialized');
    } catch (err) {
      console.error('Error initializing database:', err);
      throw err;
    }
  },

  query: (text, params) => pool.query(text, params),
};