const express = require('express');
const router = express.Router();
const AuthController = require('./auth.controller');
const verifyToken = require('../../middleware/auth');

const upload = require('../../middleware/upload.middleware');

router.post('/register', upload.single('profile_pic'), AuthController.register);
router.post('/login', AuthController.login);
router.post('/logout', verifyToken, AuthController.logout);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password', AuthController.resetPassword);

router.get('/github', AuthController.githubLogin);
router.get('/github/callback', AuthController.githubCallback);

module.exports = router;
