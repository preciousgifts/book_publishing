const express = require('express');
const { register, login, getMe, resetPasswordInit, resetPasswordConfirm } = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/reset-password-init', resetPasswordInit);
router.post('/reset-password-confirm', resetPasswordConfirm);

// Protected routes
router.get('/me', authMiddleware, getMe);

module.exports = router;
