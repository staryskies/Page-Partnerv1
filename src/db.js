const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

module.exports = {
  connectDB: async () => {
    await pool.connect();
    console.log('Connected to PostgreSQL on Render');
  },
  query: (text, params) => pool.query(text, params),
  initDB: async () => {
    try {
      // Create books table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS books (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          genre VARCHAR(100)
        )
      `);

      // Create comments table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS comments (
          id SERIAL PRIMARY KEY,
          book_id INT REFERENCES books(id),
          group_id INT NOT NULL,
          message TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Seed sample data (only if tables are empty)
      const booksCount = await pool.query('SELECT COUNT(*) FROM books');
      if (booksCount.rows[0].count == 0) {
        await pool.query(
          'INSERT INTO books (title, genre) VALUES ($1, $2)',
          ['Test Book', 'Fiction']
        );
        await pool.query(
          'INSERT INTO comments (book_id, group_id, message) VALUES ($1, $2, $3)',
          [1, 1, 'Great book!']
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