/**
 * Auth controller: maps HTTP req/res to authService and sends responses.
 * Keeps routes thin: route → controller → service → db.
 */
const authService = require('../services/authService');

async function register(req, res) {
  const result = await authService.register(req.body);
  res.status(201).json({
    success: true,
    message: 'Driver registered successfully',
    driverId: result.driverId
  });
}

async function login(req, res) {
  const { username, password } = req.body;
  const result = await authService.login(username, password);
  res.json({
    success: true,
    token: result.token,
    driver: result.driver
  });
}

async function logout(req, res) {
  await authService.logout(req.token);
  res.json({ success: true, message: 'Logged out successfully' });
}

module.exports = { register, login, logout };
