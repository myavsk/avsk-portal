const bcrypt = require('bcryptjs');
const { getUserByEmail, createUser, ensureAdminSeed } = require('./db');

// The API startup seed is intentionally disabled unless an explicit password is supplied.
// Use `npm run seed` after setting ADMIN_EMAIL and ADMIN_PASSWORD in a private .env file.
if (process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length >= 12) {
  ensureAdminSeed();
}

module.exports = { bcrypt, getUserByEmail, createUser };
