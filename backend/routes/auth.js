// routes/auth.js - Thin routes: validation → auth → controller
const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');
const { validateBody } = require('../middleware/validate');
const { registerBody, loginBody } = require('../validators/authSchemas');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/register', validateBody(registerBody), asyncHandler(authController.register));
router.post('/login', validateBody(loginBody), asyncHandler(authController.login));
router.post('/logout', authMiddleware, asyncHandler(authController.logout));

module.exports = router;
