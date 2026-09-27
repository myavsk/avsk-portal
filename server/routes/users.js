const express = require('express');
const { body, validationResult } = require('express-validator');
const { listUsers, getUserByEmail, buildUserPublic, createTransaction, getDb } = require('../db');
const { requireAuth, ensureAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, ensureAdmin, (req, res) => {
  return res.json({ users: listUsers().map(buildUserPublic) });
});

router.get('/:email', requireAuth, ensureAdmin, (req, res) => {
  const user = getUserByEmail(req.params.email);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  return res.json({ user: buildUserPublic(user) });
});

router.patch('/:email/wallet', requireAuth, ensureAdmin, [body('amount').isFloat({ min: 0 }), body('type').isIn(['credit', 'bonus', 'debit'])], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { amount, type, description } = req.body;
  const user = getUserByEmail(req.params.email);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const signed = type === 'debit' ? -Number(amount) : Number(amount);
  const db = getDb();
  const newBalance = Number((user.balance + signed).toFixed(2));
  db.prepare('UPDATE users SET balance = ?, updated_at = ? WHERE email = ?').run(newBalance, new Date().toISOString(), user.email);

  const tx = {
    id: crypto.randomUUID(),
    userEmail: user.email,
    amount: signed,
    description: description || (type === 'bonus' ? 'Admin bonus' : type === 'debit' ? 'Admin adjustment' : 'Commission credit'),
    type: type || 'credit',
    createdAt: new Date().toISOString(),
    metadata: {}
  };

  db.prepare(`INSERT INTO transactions (id, user_email, amount, description, type, created_at, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
    tx.id,
    tx.userEmail,
    tx.amount,
    tx.description,
    tx.type,
    tx.createdAt,
    JSON.stringify(tx.metadata)
  );

  return res.json({ success: true, balance: newBalance, transaction: tx });
});

module.exports = router;
