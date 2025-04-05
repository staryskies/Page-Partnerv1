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
      await pool.query(`
        CREATE TABLE IF NOT EXISTS books (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          genre VARCHAR(100)
        )
      `);
      console.log('Books table created');

      await pool.query(`
        CREATE TABLE IF NOT EXISTS comments (
          id SERIAL PRIMARY KEY,
          book_id INT REFERENCES books(id),
          group_id INT NOT NULL,
          message TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('Comments table created');

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