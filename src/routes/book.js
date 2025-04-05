const express = require('express');
const { createBook, getBooks, getBookDetails, addGroup, getGroupComments, postGroupComment } = require('../controllers/bookController');
const router = express.Router();

router.post('/book', createBook);
router.get('/books', getBooks);
router.get('/book/:bookId', getBookDetails);
router.post('/book/:bookId/group', addGroup);
router.get('/book/:bookId/group/:groupName/comments', getGroupComments);
router.post('/book/:bookId/group/:groupName/comments', postGroupComment);

module.exports = router;