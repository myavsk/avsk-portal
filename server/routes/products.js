const express = require('express');
const { body, validationResult } = require('express-validator');
const { listProducts, getUserByEmail, buildUserPublic, upsertProduct, createTransaction, getTransactions, getDb } = require('../db');
const { requireAuth, ensureAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ products: listProducts() });
});

router.post('/', requireAuth, ensureAdmin, [body('name').notEmpty(), body('commission').isFloat({ min: 0 }), body('url').isURL()], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, commission, commissionLabel, url } = req.body;
  const product = {
    id: crypto.randomUUID(),
    name,
    commission: Number(commission),
    commissionLabel: commissionLabel || `₹${Number(commission).toFixed(2)}`,
    url
  };

  upsertProduct(product);
  return res.status(201).json({ product });
});

router.put('/:id', requireAuth, ensureAdmin, [body('name').notEmpty(), body('commission').isFloat({ min: 0 }), body('url').isURL()], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const product = {
    id: req.params.id,
    name: req.body.name,
    commission: Number(req.body.commission),
    commissionLabel: req.body.commissionLabel || `₹${Number(req.body.commission).toFixed(2)}`,
    url: req.body.url
  };
  upsertProduct(product);
  return res.json({ product });
});

router.delete('/:id', requireAuth, ensureAdmin, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  return res.json({ success: true, deletedId: req.params.id });
});

module.exports = router;
