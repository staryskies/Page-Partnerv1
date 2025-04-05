const { getBook, getComments, addComment } = require('../models/book');

module.exports = {
  getBookDetails: async (req, res) => {
    const { bookId } = req.params;
    const book = await getBook(bookId);
    if (!book) return res.status(404).json({ error: 'Book not found' });
    res.json(book);
  },
  getGroupComments: async (req, res) => {
    const { bookId, groupId } = req.params;
    const comments = await getComments(bookId, groupId);
    res.json(comments);
  },
  postGroupComment: async (req, res) => {
    const { bookId, groupId } = req.params;
    const { message } = req.body;
    await addComment(bookId, groupId, message);
    res.status(201).json({ success: true });
  },
};