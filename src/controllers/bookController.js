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
    const { bookId } = req.params;
    console.log('Fetching book:', bookId);
    try {
      const book = await getBook(bookId);
      if (!book) {
        console.log('Book not found:', bookId);
        return res.status(404).json({ error: 'Book not found' });
      }
      res.json(book);
    } catch (err) {
      console.error('Get Book Details Error:', err);
      res.status(500).json({ error: 'Failed to fetch book details' });
    }
  }
};