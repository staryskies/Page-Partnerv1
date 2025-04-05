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
          email VARCHAR(255) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          age INT NOT NULL,
          password VARCHAR(255) NOT NULL,
          profile_picture TEXT,
          user_location VARCHAR(255),
          genres TEXT[],
          favorite_authors TEXT[],
          reading_pace INT,
          goals TEXT[],
          to_read_list TEXT[],
          book_length VARCHAR(50),
          currently_reading INT DEFAULT 0,
          completed_books INT DEFAULT 0,
          reading_streak INT DEFAULT 0,
          badges INT DEFAULT 0,
          points INT DEFAULT 0
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS books (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          genre VARCHAR(255) NOT NULL,
          user_id INT REFERENCES users(id),
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
      console.log('Database initialized');
    } catch (err) {
      console.error('Error initializing database:', err);
      throw err;
    }
  },

  query: (text, params) => pool.query(text, params),
};