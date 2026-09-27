const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');

const dbDir = path.join(__dirname, '..', 'data');
fs.mkdirSync(dbDir, { recursive: true });
const dbPath = process.env.DB_PATH || path.join(dbDir, 'avsk.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'partner',
    balance REAL NOT NULL DEFAULT 0,
    referral_code TEXT,
    profile_json TEXT NOT NULL DEFAULT '{}',
    kyc_json TEXT NOT NULL DEFAULT '{}',
    clicks INTEGER NOT NULL DEFAULT 0,
    leads INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    commission REAL NOT NULL DEFAULT 0,
    commission_label TEXT,
    url TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    referrer_email TEXT NOT NULL,
    product_id TEXT,
    product_name TEXT,
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    customer_city TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL,
    metadata TEXT DEFAULT '{}'
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_email TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    description TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'credit',
    created_at TEXT NOT NULL,
    metadata TEXT DEFAULT '{}'
  );
`);

function getDb() {
  return db;
}

function normalizeUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    balance: Number(row.balance || 0),
    referralCode: row.referral_code,
    clicks: Number(row.clicks || 0),
    leads: Number(row.leads || 0),
    profile: JSON.parse(row.profile_json || '{}'),
    kyc: JSON.parse(row.kyc_json || '{}'),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function buildUserPublic(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    balance: user.balance,
    referralCode: user.referralCode,
    clicks: user.clicks,
    leads: user.leads,
    profile: user.profile,
    kyc: user.kyc,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

function getUserByEmail(email) {
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  return normalizeUser(row);
}

function createUser({ email, name, password, role = 'partner', profile = {}, kyc = {}, referralCode }) {
  const now = new Date().toISOString();
  const hash = bcrypt.hashSync(password, 10);
  const insert = db.prepare(`
    INSERT INTO users (email, name, password_hash, role, balance, referral_code, profile_json, kyc_json, clicks, leads, created_at, updated_at)
    VALUES (?, ?, ?, ?, 0, ?, ?, ?, 0, 0, ?, ?)
  `);
  insert.run(email.toLowerCase(), name, hash, role, referralCode || `ref-${Date.now()}`, JSON.stringify(profile), JSON.stringify(kyc), now, now);
  return getUserByEmail(email);
}

function upsertProduct(product) {
  const now = new Date().toISOString();
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(product.id || product._id);
  if (existing) {
    db.prepare(`
      UPDATE products SET name = ?, commission = ?, commission_label = ?, url = ?, updated_at = ? WHERE id = ?
    `).run(product.name, Number(product.commission || 0), product.commissionLabel || '', product.url, now, product.id);
    return db.prepare('SELECT * FROM products WHERE id = ?').get(product.id);
  }
  const insert = db.prepare(`
    INSERT INTO products (id, name, commission, commission_label, url, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insert.run(product.id || cryptoId(), product.name, Number(product.commission || 0), product.commissionLabel || '', product.url, now, now);
  return db.prepare('SELECT * FROM products WHERE id = ?').get(product.id || product._id);
}

function cryptoId() {
  const bytes = [...new Uint8Array(12)];
  return 'id-' + bytes.map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 24);
}

function listProducts() {
  return db.prepare(`SELECT * FROM products ORDER BY created_at DESC`).all().map((p) => ({
    id: p.id,
    name: p.name,
    commission: Number(p.commission || 0),
    commissionLabel: p.commission_label || '',
    url: p.url,
    createdAt: p.created_at,
    updatedAt: p.updated_at
  }));
}

function listUsers() {
  return db.prepare('SELECT * FROM users ORDER BY created_at DESC').all().map(normalizeUser);
}

function insertLead({ referrerEmail, productId, productName, customerName, customerEmail, customerPhone, customerCity, metadata = {} }) {
  const id = cryptoId();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO leads (id, referrer_email, product_id, product_name, customer_name, customer_email, customer_phone, customer_city, status, created_at, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
  `).run(id, referrerEmail, productId || '', productName || '', customerName || '', customerEmail || '', customerPhone || '', customerCity || '', now, JSON.stringify(metadata || {}));

  db.prepare(`UPDATE users SET clicks = clicks + 1, leads = leads + 1, updated_at = ? WHERE email = ?`).run(now, referrerEmail);

  db.prepare(`INSERT INTO transactions (id, user_email, amount, description, type, created_at, metadata) VALUES (?, ?, 0, ?, 'lead', ?, ?)`).run(
    cryptoId(),
    referrerEmail,
    `Lead captured: ${productName || 'Referral'} (${customerName || customerEmail || 'customer'})`,
    now,
    JSON.stringify({ leadId: id, productId: productId || '', customerEmail: customerEmail || '' })
  );

  return id;
}

function createTransaction({ userEmail, amount, description, type = 'credit', metadata = {} }) {
  const now = new Date().toISOString();
  const txId = cryptoId();
  db.prepare(`
    INSERT INTO transactions (id, user_email, amount, description, type, created_at, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(txId, userEmail.toLowerCase(), Number(amount || 0), description, type, now, JSON.stringify(metadata || {}));

  const user = getUserByEmail(userEmail);
  if (user) {
    const newBalance = Number((user.balance + Number(amount || 0)).toFixed(2));
    db.prepare('UPDATE users SET balance = ?, updated_at = ? WHERE email = ?').run(newBalance, now, userEmail.toLowerCase());
  }

  return txId;
}

function getTransactions(email) {
  if (email) {
    return db.prepare('SELECT * FROM transactions WHERE user_email = ? ORDER BY created_at DESC').all(email.toLowerCase()).map((row) => ({
      id: row.id,
      userEmail: row.user_email,
      amount: Number(row.amount || 0),
      description: row.description,
      type: row.type,
      createdAt: row.created_at,
      metadata: JSON.parse(row.metadata || '{}')
    }));
  }
  return db.prepare('SELECT * FROM transactions ORDER BY created_at DESC').all().map((row) => ({
    id: row.id,
    userEmail: row.user_email,
    amount: Number(row.amount || 0),
    description: row.description,
    type: row.type,
    createdAt: row.created_at,
    metadata: JSON.parse(row.metadata || '{}')
  }));
}

function ensureAdminSeed() {
  const email = (process.env.ADMIN_EMAIL || 'admin@avsk.com').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'Admin@12345';
  const user = getUserByEmail(email);
  if (!user) {
    createUser({ email, name: 'AVSK Admin', password, role: 'admin', referralCode: 'admin-ref', profile: {}, kyc: { status: 'verified', verified: true } });
  }
}

module.exports = {
  db,
  getDb,
  getUserByEmail,
  createUser,
  listUsers,
  listProducts,
  upsertProduct,
  insertLead,
  createTransaction,
  getTransactions,
  ensureAdminSeed,
  buildUserPublic
};
