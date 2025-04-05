const { createBook, getBooks, getBook, addGroup, getComments, addComment } = require('../models/book');

module.exports = {
  createBook: async (req, res) => {
    const { title, genre } = req.body;
    try {
      const bookId = await createBook(title, genre);
      res.status(201).json({ success: true, bookId });
    } catch (err) {
      console.error('Create Book Error:', err);
      res.status(500).json({ error: 'Failed to create book' });
    }
  },
  getBooks: async (req, res) => {
    const books = await getBooks();
    res.json(books);
  },
  getBookDetails: async (req, res) => {
    const { bookId } = req.params;
    console.log('Fetching book:', bookId);
    const book = await getBook(bookId);
    if (!book) {
      console.log('Book not found:', bookId);
      return res.status(404).json({ error: 'Book not found' });
    }
    res.json(book);
  },
  addGroup: async (req, res) => {
    const { bookId } = req.params;
    const { name } = req.body;
    try {
      await addGroup(bookId, name);
      res.status(201).json({ success: true });
    } catch (err) {
      console.error('Add Group Error:', err);
      res.status(500).json({ error: 'Failed to add group' });
    }
  },
  getGroupComments: async (req, res) => {
    const { bookId, groupName } = req.params;
    console.log('Fetching comments for book:', bookId, 'group:', groupName);
    const comments = await getComments(bookId, groupName);
    res.json(comments);
  },
  postGroupComment: async (req, res) => {
    const { bookId, groupName } = req.params;
    const { message } = req.body;
    console.log('Posting comment:', { bookId, groupName, message });
    await addComment(bookId, groupName, message);
    res.status(201).json({ success: true });
  },
};