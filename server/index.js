const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const rootDir = path.join(__dirname, '..');

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(rateLimit({ windowMs: 60 * 1000, max: 200 }));

const { ensureAdminSeed, listProducts, getUserByEmail, listUsers, buildUserPublic, getTransactions } = require('./db');
const authRoutes = require('./routes/auth');
const productsRoutes = require('./routes/products');
const usersRoutes = require('./routes/users');
const referralsRoutes = require('./routes/referrals');
const uploadRoutes = require('./routes/upload');
const { requireAuth, ensureAdmin } = require('./middleware/auth');

ensureAdminSeed();

app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/referrals', referralsRoutes);
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/upload', uploadRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true, status: 'healthy' }));
app.get('/api/me', requireAuth, (req, res) => {
  const user = getUserByEmail(req.user.email);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  return res.json({ user: buildUserPublic(user) });
});

app.get('/api/products/public', (req, res) => res.json({ products: listProducts() }));
app.get('/api/users/admin/all', requireAuth, ensureAdmin, (req, res) => res.json({ users: listUsers().map(buildUserPublic) }));
app.get('/api/users/:email/transactions', requireAuth, (req, res) => {
  const user = getUserByEmail(req.params.email);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  return res.json({ transactions: getTransactions(req.params.email) });
});

// Serve static frontend from repo root as fallback for local deployment.
app.use(express.static(rootDir));
app.get('/', (req, res) => res.redirect('/auth.html'));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`AVSK backend listening on http://localhost:${port}`);
});
