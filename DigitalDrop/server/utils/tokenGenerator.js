const crypto = require('crypto');

function generateDownloadToken() {
  return crypto.randomUUID();
}

function getTokenExpiry() {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 24);
  return expiry;
}

module.exports = { generateDownloadToken, getTokenExpiry };
