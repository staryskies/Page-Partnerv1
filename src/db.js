// db.js
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
          genre VARCHAR(255) NOT NULL,
          user_id INT REFERENCES users(id) ON DELETE CASCADE,
          excerpt TEXT,
          groups TEXT[] DEFAULT '{}',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          completed_at TIMESTAMP
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
        CREATE TABLE IF NOT EXISTS circles (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          book_id INT REFERENCES books(id) ON DELETE SET NULL,
          member_ids INT[] DEFAULT '{}',
          is_public BOOLEAN DEFAULT TRUE,
          created_by INT REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          status VARCHAR(50) DEFAULT 'active'
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

      await pool.query(`
        CREATE TABLE IF NOT EXISTS reviews (
          id SERIAL PRIMARY KEY,
          user_id INT REFERENCES users(id) ON DELETE CASCADE,
          book_id INT REFERENCES books(id) ON DELETE CASCADE,
          review_title VARCHAR(255) NOT NULL,
          rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
          review_text TEXT NOT NULL,
          tags TEXT[] DEFAULT '{}',
          contains_spoilers BOOLEAN DEFAULT FALSE,
          helpful_votes INT DEFAULT 0,
          status VARCHAR(50) DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP
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
};