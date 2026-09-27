const express = require('express');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { getUserByEmail, createUser, listUsers, listProducts, upsertProduct, insertLead, createTransaction, getTransactions, buildUserPublic, ensureAdminSeed } = require('./db');
const { signToken, requireAuth, ensureAdmin } = require('./middleware/auth');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir, limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/register', [
  body('email').isEmail(),
  body('name').notEmpty(),
  body('password').isLength({ min: 8 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, name, password, profile = {}, kyc = {} } = req.body;
  const existing = getUserByEmail(email);
  if (existing) return res.status(409).json({ error: 'User already exists.' });

  const referralCode = `ref-${Math.random().toString(36).slice(2, 12)}`;
  const created = createUser({ email, name, password, role: 'partner', profile, kyc: { ...kyc, status: 'pending', verified: false }, referralCode });
  const token = signToken(created);
  return res.status(201).json({ token, user: buildUserPublic(created) });
});

router.post('/login', [body('email').isEmail(), body('password').notEmpty()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password } = req.body;
  const user = getUserByEmail(email);
  if (!user) return res.status(401).json({ error: 'Invalid credentials.' });

  const ok = bcrypt.compareSync(password, user.passwordHash || user.password_hash || '');
  if (!ok) return res.status(401).json({ error: 'Invalid credentials.' });

  const token = signToken(user);
  return res.json({ token, user: buildUserPublic(user) });
});

router.get('/me', requireAuth, (req, res) => {
  const user = getUserByEmail(req.user.email);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  return res.json({ user: buildUserPublic(user) });
});

module.exports = router;
