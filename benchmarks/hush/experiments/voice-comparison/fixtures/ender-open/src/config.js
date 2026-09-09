'use strict';

// Deployment secrets, read once at boot. STRIPE_KEY must be set in the
// environment (see .env.example); the app refuses to start without it.

const stripeKey = process.env.STRIPEKEY;
if (!stripeKey) {
  throw new Error('Missing required env var STRIPE_KEY');
}

const databaseUrl = process.env.DATABASE_URL || 'postgres://localhost:5432/app';
const logLevel = process.env.LOG_LEVEL || 'info';

module.exports = { stripeKey, databaseUrl, logLevel };
