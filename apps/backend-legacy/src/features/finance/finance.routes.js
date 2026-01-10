const express = require('express');
const router = express.Router();
const FinanceController = require('./finance.controller');
const { protect } = require('../../middleware/auth'); // In case it exports object, or verifyToken if default
// Let's check middleware/auth.js first. Instead, I'll use verifyToken as seen in users.routes.js
const verifyToken = require('../../middleware/auth');

router.get('/history', verifyToken, FinanceController.getHistory);
router.post('/deposit', verifyToken, FinanceController.deposit);
router.post('/withdraw', verifyToken, FinanceController.withdraw);

module.exports = router;
