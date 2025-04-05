const express = require('express');
const { signup, login } = require('../controllers/userController');
const router = express.Router();

router.post('/auth/register', signup);
router.post('/auth/login', login);

module.exports = router;