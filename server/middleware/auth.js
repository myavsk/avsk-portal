const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getUserByEmail, listProducts, listUsers, createUser, ensureAdminSeed, createTransaction, buildUserPublic } = require('./db');

function signToken(user) {
  return jwt.sign({ email: user.email, role: user.role }, process.env.JWT_ACCESS_SECRET || 'dev-secret', { expiresIn: process.env.JWT_ACCESS_TOKEN_TTL || '15m' });
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'dev-secret');
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

function ensureAdmin(req, res, next) {
  return requireRole('admin')(req, res, next);
}

module.exports = { signToken, verifyToken, requireAuth, requireRole, ensureAdmin, getUserByEmail, listProducts, listUsers, createUser, ensureAdminSeed, createTransaction, buildUserPublic, bcrypt };
