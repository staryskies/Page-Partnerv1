require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

module.exports = {
  connectDB: async () => {
    try {
      const client = await pool.connect();
      console.log('Connected to PostgreSQL database');
      client.release();
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
          password VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          age INT NOT NULL,
          profile_picture TEXT,
          user_location VARCHAR(255),
          genres TEXT[] DEFAULT '{}',
          favorite_authors TEXT[] DEFAULT '{}',
          reading_pace INT DEFAULT 0,
          to_read_list TEXT[] DEFAULT '{}',
          book_length VARCHAR(50),
          currently_reading INT DEFAULT 0,
          completed_books INT DEFAULT 0,
          reading_streak INT DEFAULT 0,
          badges INT DEFAULT 0,
          points INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS books (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          author VARCHAR(255),  -- Nullable for flexibility
          genre VARCHAR(100) NOT NULL,
          user_id INT REFERENCES users(id) ON DELETE CASCADE,
          excerpt TEXT,
          groups TEXT[] DEFAULT '{}',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS circles (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          book_id INT REFERENCES books(id) ON DELETE SET NULL,
          creator VARCHAR(255) NOT NULL,
          status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
          members TEXT[] DEFAULT '{}',
          description TEXT,
          privacy VARCHAR(50) DEFAULT 'public' CHECK (privacy IN ('public', 'private')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT unique_circle_name_book UNIQUE (name, book_id)  -- Prevent duplicate circles per book
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS comments (
          id SERIAL PRIMARY KEY,
          book_id INT REFERENCES books(id) ON DELETE CASCADE,
          group_name VARCHAR(255),
          message TEXT NOT NULL,
          user_id INT REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS achievements (
          id SERIAL PRIMARY KEY,
          user_id INT REFERENCES users(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          icon VARCHAR(255),
          earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      console.log('Database initialized successfully');
    } catch (err) {
      console.error('Error initializing database:', err);
      throw err;
    }
  },

  query: async (text, params) => {
    try {
      const result = await pool.query(text, params);
      return result;
    } catch (err) {
      console.error('Query error:', err);
      throw err;
    }
  },

  // Optional: Close the pool for graceful shutdown
  closeDB: async () => {
    try {
      await pool.end();
      console.log('Database connection pool closed');
    } catch (err) {
      console.error('Error closing database pool:', err);
      throw err;
    }
  }
};