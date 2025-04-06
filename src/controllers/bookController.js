const { createBook, getBooks, getBook } = require('../models/book');

module.exports = {
  createBook: async (req, res) => {
    const { title, genre, author } = req.body;
    try {
      const bookId = await createBook(title, genre, author);
      res.status(201).json({ success: true, bookId });
    } catch (err) {
      console.error('Create Book Error:', err);
      res.status(500).json({ error: 'Failed to create book' });
    }
  },
  getBooks: async (req, res) => {
    try {
      const books = await getBooks();
      res.json(books);
    } catch (err) {
      console.error('Get Books Error:', err);
      res.status(500).json({ error: 'Failed to fetch books' });
    }
  },
  getBookDetails: async (req, res) => {
    try {
        const bookId = req.params.bookId;

        // Validate bookId
        if (!bookId || isNaN(bookId)) {
            return res.status(400).json({ error: 'Invalid book ID' });
        }

        const result = await db.query('SELECT * FROM books WHERE id = $1', [bookId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Book not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get Book Details Error:', error);
        res.status(500).json({ error: 'Failed to fetch book details' });
    }
  }
};