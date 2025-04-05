const express = require('express');
const { createBook, getBooks, getBookDetails, createGroup, getGroups, getGroupComments, postGroupComment } = require('../controllers/bookController');
const router = express.Router();

router.post('/book', createBook);
router.get('/books', getBooks);
router.get('/book/:bookId', getBookDetails);
router.post('/book/:bookId/group', createGroup);
router.get('/book/:bookId/groups', getGroups);
router.get('/book/:bookId/group/:groupId/comments', getGroupComments);
router.post('/book/:bookId/group/:groupId/comments', postGroupComment);

module.exports = router;