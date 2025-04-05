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
          book_length VARCHAR(50)
        )
      `);
      console.log('Users table created');

      await pool.query(`
        CREATE TABLE IF NOT EXISTS books (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          genre VARCHAR(100),
          groups TEXT[] DEFAULT '{}'
        )
      `);
      console.log('Books table created');

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

      const booksCount = await pool.query('SELECT COUNT(*) FROM books');
      if (booksCount.rows[0].count == 0) {
        const bookResult = await pool.query(
          "INSERT INTO books (title, genre, groups) VALUES ($1, $2, $3) RETURNING id",
          ['Test Book', 'Fiction', ['Test Group']]
        );
        const bookId = bookResult.rows[0].id;

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