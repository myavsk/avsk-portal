const express = require('express');
const { requireAuth, ensureAdmin } = require('../middleware/auth');
const { getTransactions, getUserByEmail, listUsers } = require('../db');

const router = express.Router();

router.get('/', requireAuth, ensureAdmin, (req, res) => {
  return res.json({ transactions: getTransactions() });
});

router.get('/:email', requireAuth, (req, res) => {
  const user = getUserByEmail(req.params.email);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  return res.json({ transactions: getTransactions(req.params.email) });
});

module.exports = router;
