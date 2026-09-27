const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { requireAuth, ensureAdmin } = require('../middleware/auth');
const { getDb, getUserByEmail } = require('../db');

const router = express.Router();
const uploadDir = path.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir, limits: { fileSize: 8 * 1024 * 1024 } });

router.post('/kyc', requireAuth, upload.fields([{ name: 'pan' }, { name: 'aadhaar' }]), (req, res) => {
  const files = req.files || {};
  const userEmail = req.user.email;
  const user = getUserByEmail(userEmail);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const db = getDb();
  const existing = JSON.parse(user.kyc || '{}');
  const kyc = {
    ...existing,
    status: 'pending',
    verified: false,
    lastUpdated: new Date().toISOString(),
    documents: {
      pan: files.pan ? files.pan[0].filename : existing.documents?.pan,
      aadhaar: files.aadhaar ? files.aadhaar[0].filename : existing.documents?.aadhaar
    }
  };

  db.prepare('UPDATE users SET kyc_json = ?, updated_at = ? WHERE email = ?').run(JSON.stringify(kyc), new Date().toISOString(), user.email);
  return res.json({ success: true, kyc });
});

module.exports = router;
