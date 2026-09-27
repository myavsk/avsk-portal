const express = require('express');
const { body, validationResult } = require('express-validator');
const { getUserByEmail, buildUserPublic, insertLead, getTransactions, getDb } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/submit', [
  body('ref').notEmpty(),
  body('productId').notEmpty(),
  body('customerName').notEmpty(),
  body('customerEmail').isEmail(),
  body('customerPhone').notEmpty()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { ref, productId, productName, customerName, customerEmail, customerPhone, customerCity } = req.body;
  const db = getDb();
  const userRow = db.prepare('SELECT * FROM users WHERE referral_code = ?').get(ref);
  if (!userRow) return res.status(404).json({ error: 'Referrer not found.' });

  const leadId = `lead-${Date.now()}`;
  db.prepare(`
    INSERT INTO leads (id, referrer_email, product_id, product_name, customer_name, customer_email, customer_phone, customer_city, status, created_at, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
  `).run(leadId, userRow.email, productId, productName || '', customerName || '', customerEmail || '', customerPhone || '', customerCity || '', new Date().toISOString(), JSON.stringify({}));

  db.prepare(`UPDATE users SET clicks = clicks + 1, leads = leads + 1, updated_at = ? WHERE email = ?`).run(new Date().toISOString(), userRow.email);
  db.prepare(`INSERT INTO transactions (id, user_email, amount, description, type, created_at, metadata) VALUES (?, ?, 0, ?, 'lead', ?, ?)`).run(
    `tx-${Date.now()}`,
    userRow.email,
    `Lead captured: ${productName || productId}`,
    new Date().toISOString(),
    JSON.stringify({ leadId, customerEmail: customerEmail || '' })
  );

  return res.json({ success: true, referrerEmail: userRow.email, leadId });
});

router.get('/:email', requireAuth, (req, res) => {
  const user = getUserByEmail(req.params.email);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  return res.json({ user: buildUserPublic(user) });
});

module.exports = router;
