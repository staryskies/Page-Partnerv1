const { createBook, getBooks, getBook, createGroup, getGroups, getComments, addComment } = require('../models/book');

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
  createGroup: async (req, res) => {
    const { bookId } = req.params;
    const { name } = req.body;
    try {
      const groupId = await createGroup(bookId, name);
      res.status(201).json({ success: true, groupId });
    } catch (err) {
      console.error('Create Group Error:', err);
      res.status(500).json({ error: 'Failed to create group' });
    }
  },
  getGroups: async (req, res) => {
    const { bookId } = req.params;
    const groups = await getGroups(bookId);
    res.json(groups);
  },
  getGroupComments: async (req, res) => {
    const { bookId, groupId } = req.params;
    console.log('Fetching comments for book:', bookId, 'group:', groupId);
    const comments = await getComments(bookId, groupId);
    res.json(comments);
  },
  postGroupComment: async (req, res) => {
    const { bookId, groupId } = req.params;
    const { message } = req.body;
    console.log('Posting comment:', { bookId, groupId, message });
    await addComment(bookId, groupId, message);
    res.status(201).json({ success: true });
  },
};