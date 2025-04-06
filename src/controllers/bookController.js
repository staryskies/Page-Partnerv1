const bookModel = require('../models/book');

exports.getBookDetails = async (req, res) => {
  const { bookId } = req.params;
  console.log('Received bookId:', bookId);

  if (!bookId || isNaN(bookId)) {
    return res.status(400).json({ error: 'Invalid bookId: must be a number' });
  }

  try {
    const result = await bookModel.getBook(bookId);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get Book Details Error:', err);
    if (err.code === '22P02') {
      res.status(400).json({ error: 'Invalid bookId format' });
    } else {
      res.status(500).json({ error: 'Failed to fetch book details' });
    }
  }
};