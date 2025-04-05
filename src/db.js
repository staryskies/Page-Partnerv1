const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

module.exports = {
  connectDB: async () => {
    try {
      await pool.connect();
      console.log('Connected to PostgreSQL on Render');
    } catch (err) {
      console.error('DB Connection Error:', err);
      throw err;
    }
  },
  query: (text, params) => {
    console.log('Executing query:', text, params);
    return pool.query(text, params);
  },
  initDB: async () => {
    try {
      // Create users table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL
        )
      `);
      console.log('Users table created');

      // Create books table with groups array
      await pool.query(`
        CREATE TABLE IF NOT EXISTS books (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          genre VARCHAR(100),
          groups TEXT[] DEFAULT '{}'
        )
      `);
      console.log('Books table created');

      // Create comments table (group_id replaced with group_name)
      await pool.query(`
        CREATE TABLE IF NOT EXISTS comments (
          id SERIAL PRIMARY KEY,
          book_id INT REFERENCES books(id),
          group_name TEXT NOT NULL,
          message TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('Comments table created');

      // Seed sample data
      const booksCount = await pool.query('SELECT COUNT(*) FROM books');
      if (booksCount.rows[0].count == 0) {
        // Add a book with a group
        const bookResult = await pool.query(
          "INSERT INTO books (title, genre, groups) VALUES ($1, $2, $3) RETURNING id",
          ['Test Book', 'Fiction', ['Test Group']]
        );
        const bookId = bookResult.rows[0].id;

        // Add a comment
        await pool.query(
          'INSERT INTO comments (book_id, group_name, message) VALUES ($1, $2, $3)',
          [bookId, 'Test Group', 'Great book!']
        );
        console.log('Database initialized with sample data');
      } else {
        console.log('Database already initialized');
      }
    } catch (err) {
      console.error('Error initializing database:', err);
      throw err;
    }
  },
};