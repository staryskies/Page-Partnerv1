const { getBook, getComments, addComment } = require('../models/book');

module.exports = {
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