const bcrypt = require('bcryptjs');
const { getUserByEmail, createUser, ensureAdminSeed } = require('./db');

ensureAdminSeed();

const adminEmail = (process.env.ADMIN_EMAIL || 'admin@avsk.com').toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@12345';
const existing = getUserByEmail(adminEmail);
if (!existing) {
  createUser({ email: adminEmail, name: 'AVSK Admin', password: adminPassword, role: 'admin', referralCode: 'admin', profile: {}, kyc: { verified: true, status: 'verified' } });
  console.log(`Seeded admin user: ${adminEmail} / ${adminPassword}`);
}
