const express = require('express');
const { getBookDetails, getGroupComments, postGroupComment } = require('../controllers/bookController');
const router = express.Router();

router.get('/book/:bookId', getBookDetails);
router.get('/book/:bookId/group/:groupId/comments', getGroupComments);
router.post('/book/:bookId/group/:groupId/comments', postGroupComment);

module.exports = router;