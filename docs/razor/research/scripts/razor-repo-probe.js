#!/usr/bin/env node
'use strict';
// razor repo probe — does the ladder still hold in a repository, or does
// "one search, then move on" write a duplicate?
//
// Why this exists: every razor number ever published comes from a workspace of
// one or two files with an empty node_modules. Rung 2 says "Already in this
// codebase? One search for it — reuse a hit, or move on the instant it comes up
// empty", and the ladder adds "One check is enough... don't re-verify or broaden
// it." In a two-file workspace that costs nothing, because one search sees
// everything. In a ~40-file repo with a helper three directories away under an
// unobvious name, the same reflex is a recipe for a duplicate. Nobody has
// tested that transfer.
//
// One fixture, materialised fresh per cell: a ~41-file service repo with eight
// declared dependencies, all eight genuinely present and requireable under
// node_modules, real helpers in src/utils/, tests, docs, config, and a house
// convention that is only visible if you read src/services/ (kebab-case
// <thing>-service.js, a create<Thing>Service factory export, a sibling test).
//
// Four tasks, each scoring the structural question SEPARATELY from correctness,
// the way benchmarks/razor/runner/tasks.js scores the counter-suite. A session
// can be perfectly correct and still have duplicated a helper — that is the
// finding this probe exists to catch, and it is invisible to a single column.
//
//   unobvious-name  a "batch" job that src/utils/chunk-list.js already does.
//                   reused = it called chunkList instead of re-writing it.
//   unnamed-dep     a cron capability the installed `cron-next` provides, never
//                   named in the prompt. reused = it used the installed package.
//                   added_dep = it reached for a new one instead.
//   near-miss       nothing reusable exists, but three similarly-named helpers
//                   do (normalize-email, normalize-address, phone-format).
//                   complied = wrote the new thing and wired none of them.
//                   Tool-call counts are recorded: the other failure is burning
//                   the session searching.
//   convention      the right answer IS a new file. complied = right directory,
//                   kebab-case -service.js name, factory export shape.
//
// The run root is D:/razor-probe-runs, NOT os.tmpdir(), and that is
// load-bearing. razor/hooks/file-meter.js:50 exempts anything under the temp
// dir as scratch, and every benchmark on record ran there, so razor's new-file
// check has never been able to fire in a single published cell. Here it can.
// Every session records razor_file_denies (occurrences of "razor: new ... file
// #" in the transcript). A deny on a legitimate task is a FALSE DENY and is the
// most important thing this probe could find; it is printed per cell and in the
// summary, never averaged away.
//
//   node razor-repo-probe.js --selftest          # prove every scorer, $0. Run first.
//   node razor-repo-probe.js --dry-run           # cell list + grid + cost, $0
//   node razor-repo-probe.js                     # the full 48-cell grid
//   node razor-repo-probe.js <out-dir> [--models sonnet,opus] [--arms baseline,razor]
//                            [--tasks unobvious-name,convention] [--reps 3]
//                            [--seed 12345] [--rep-offset 0] [--max-spend 25]
//
// rows.json is rewritten after every cell, so a killed run keeps its data — and
// re-running the same out-dir SKIPS every cell already in it rather than buying
// it twice. --max-spend is a hard stop on the running total. Unknown model, arm
// or task names are refused before anything is spawned.

const fs = require('node:fs');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

const RAZOR_DIR = process.env.RAZOR_DIR
  ? path.resolve(process.env.RAZOR_DIR)
  : path.resolve(__dirname, "..", "..", "..", "..", "razor");
// Sonnet and Opus only. Haiku is retired as a test model by house rule.
const MODELS = { sonnet: 'claude-sonnet-5', opus: 'claude-opus-5' };
const TURN_TIMEOUT_MS = 420000; // a 40-file read surface is slower than a 2-file one
const GUARD = ['Bash(git*)', 'PowerShell(git*)', 'Agent', 'Task', 'ScheduleWakeup', 'CronCreate', 'RemoteTrigger'];
// Deliberately outside os.tmpdir() (X:\Temp here) so razor's file meter is not
// exempted, and outside every git tree so a bypassPermissions session cannot
// reach a real repository.
// One namespaced directory under that root, because the batch's other probes
// write their own rows.json to the same place.
const DEFAULT_OUT = 'D:/razor-probe-runs/repo-probe';

// Verbatim from benchmarks/razor/runner/run.js:89-91 so this probe's sessions
// stay comparable with the published corpus. Do not reword it.
const NO_RUN = 'Write the implementation (include tests if you normally would for a change like '
  + 'this). Do not run a dev server, install dependencies, run a database, or open a browser to '
  + 'verify -- just write the code and stop. Only the code you write is measured, not its execution.';

// Per-session price used only by --dry-run. Base rates are the corpus
// calibration (~$0.11 sonnet, ~$0.17 opus); the multiplier is the allowance for
// this fixture's much larger read surface.
const EST = { sonnet: 0.11, opus: 0.17 };
const EST_READ_SURFACE = 1.5;

// ============================================================================
// The fixture: one ~41-file repo, plus eight requireable dependency stubs.
// ============================================================================

const DEPS = {
  'cron-next': '^1.2.0',
  'csv-tiny': '^0.4.1',
  dayjs: '^1.11.10',
  express: '^4.19.2',
  nanoid: '^3.3.7',
  pino: '^8.19.0',
  'redact-keys': '^2.0.1',
  zod: '^3.22.4',
};

const PKG = JSON.stringify({
  name: 'orderly',
  version: '2.4.0',
  private: true,
  description: 'Order intake and fulfilment service',
  main: 'src/index.js',
  scripts: { start: 'node src/index.js', test: 'node --test tests/' },
  dependencies: DEPS,
  devDependencies: {},
}, null, 2) + '\n';

// --- dependency stubs -------------------------------------------------------
// Small, but genuinely requireable: `cron-next` is a working cron helper because
// task 2 turns on it, and the rest exist so a produced file that reaches for a
// declared dependency still executes under the scorer instead of failing to
// resolve and reading as a correctness loss it is not.

function stub(name, code) {
  return {
    ['node_modules/' + name + '/package.json']:
      JSON.stringify({ name, version: DEPS[name].replace(/^\^/, ''), main: 'index.js' }, null, 2) + '\n',
    ['node_modules/' + name + '/index.js']: code,
  };
}

const CRON_NEXT = `'use strict';
// Next fire time for a standard five-field cron expression, evaluated in UTC.
// Supports *, */n, a-b, a-b/n and comma lists.
function matchField(spec, value, min, max) {
  for (const part of String(spec).split(',')) {
    if (part === '*') return true;
    const step = part.match(/^(\\*|(\\d+)-(\\d+))\\/(\\d+)$/);
    if (step) {
      const lo = step[1] === '*' ? min : Number(step[2]);
      const hi = step[1] === '*' ? max : Number(step[3]);
      const n = Number(step[4]);
      if (value >= lo && value <= hi && (value - lo) % n === 0) return true;
      continue;
    }
    const range = part.match(/^(\\d+)-(\\d+)$/);
    if (range) {
      if (value >= Number(range[1]) && value <= Number(range[2])) return true;
      continue;
    }
    if (Number(part) === value) return true;
  }
  return false;
}

// Returns a Date at or after \`from\` (seconds and ms zeroed), or null if the
// expression does not fire within the next 366 days.
function nextRun(expression, from) {
  const fields = String(expression).trim().split(/\\s+/);
  if (fields.length !== 5) throw new Error('cron-next: expected five fields');
  const d = new Date(from.getTime());
  d.setUTCSeconds(0, 0);
  if (d.getTime() < from.getTime()) d.setUTCMinutes(d.getUTCMinutes() + 1);
  for (let i = 0; i < 366 * 24 * 60; i++) {
    if (matchField(fields[0], d.getUTCMinutes(), 0, 59)
      && matchField(fields[1], d.getUTCHours(), 0, 23)
      && matchField(fields[2], d.getUTCDate(), 1, 31)
      && matchField(fields[3], d.getUTCMonth() + 1, 1, 12)
      && matchField(fields[4], d.getUTCDay(), 0, 6)) return d;
    d.setUTCMinutes(d.getUTCMinutes() + 1);
  }
  return null;
}

module.exports = { nextRun, matchField };
`;

const CSV_TINY = `'use strict';
function parse(text) {
  const lines = String(text).split(/\\r?\\n/).filter((l) => l.length > 0);
  if (lines.length === 0) return [];
  const header = lines[0].split(',');
  return lines.slice(1).map((line) => {
    const cells = line.split(',');
    const row = {};
    header.forEach((h, i) => { row[h] = cells[i]; });
    return row;
  });
}
module.exports = { parse };
`;

const REDACT_KEYS = `'use strict';
function redact(value, keys) {
  const secret = new Set(keys || ['password', 'token']);
  if (Array.isArray(value)) return value.map((v) => redact(v, keys));
  if (!value || typeof value !== 'object') return value;
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    out[k] = secret.has(k) ? '[redacted]' : redact(v, keys);
  }
  return out;
}
module.exports = { redact };
`;

const DAYJS = `'use strict';
function wrap(input) {
  const d = input === undefined ? new Date() : new Date(input);
  return {
    toDate: () => new Date(d.getTime()),
    valueOf: () => d.getTime(),
    format: () => d.toISOString(),
    add: (n, unit) => wrap(d.getTime() + n * (unit === 'day' ? 86400000 : 3600000)),
    isBefore: (other) => d.getTime() < new Date(other).getTime(),
  };
}
module.exports = wrap;
module.exports.default = wrap;
`;

const EXPRESS = `'use strict';
function router() {
  const r = { stack: [] };
  for (const m of ['get', 'post', 'put', 'patch', 'delete', 'use']) {
    r[m] = function () { r.stack.push(m); return r; };
  }
  return r;
}
function express() {
  const app = router();
  app.listen = function (port, cb) { if (cb) cb(); return { close() {} }; };
  return app;
}
express.Router = router;
express.json = function () { return function (req, res, next) { if (next) next(); }; };
express.urlencoded = express.json;
module.exports = express;
`;

const PINO = `'use strict';
function pino() {
  const noop = function () {};
  const logger = { info: noop, warn: noop, error: noop, debug: noop, fatal: noop, trace: noop };
  logger.child = function () { return logger; };
  return logger;
}
module.exports = pino;
module.exports.default = pino;
`;

const ZOD = `'use strict';
function schema(kind) {
  const s = {
    kind,
    parse: (v) => v,
    safeParse: (v) => ({ success: true, data: v }),
    optional: () => s,
    nullable: () => s,
    min: () => s,
    max: () => s,
    int: () => s,
  };
  return s;
}
const z = {
  object: (shape) => Object.assign(schema('object'), { shape }),
  string: () => schema('string'),
  number: () => schema('number'),
  boolean: () => schema('boolean'),
  array: () => schema('array'),
};
module.exports = { z };
`;

const NANOID = `'use strict';
function nanoid(size) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < (size || 12); i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}
module.exports = { nanoid };
`;

// --- repo files -------------------------------------------------------------

const FIXTURE = Object.assign(
  {
    'package.json': PKG,

    '.gitignore': 'node_modules/\ncoverage/\n*.log\n.env\n',

    '.editorconfig': 'root = true\n\n[*]\nindent_style = space\nindent_size = 2\nend_of_line = lf\ncharset = utf-8\ninsert_final_newline = true\n',

    'README.md': `# orderly

Order intake and fulfilment for the storefront.

    npm start        # boot the HTTP service on config.port
    npm test         # node --test over tests/

Layout: HTTP handling in \`src/routes/\`, business rules in \`src/services/\`,
persistence in \`src/db/\`, shared helpers in \`src/utils/\`.
`,

    'src/index.js': `'use strict';
const { createApp } = require('./app.js');
const config = require('../config/default.json');

const app = createApp(config);
app.listen(config.port, () => {
  process.stdout.write('orderly listening on ' + config.port + '\\n');
});
`,

    'src/app.js': `'use strict';
const express = require('express');
const pino = require('pino');
const { requestId } = require('./middleware/request-id.js');
const { errorHandler } = require('./middleware/error-handler.js');
const { ordersRouter } = require('./routes/orders.js');
const { customersRouter } = require('./routes/customers.js');
const { healthRouter } = require('./routes/health.js');

function createApp(config) {
  const logger = pino({ level: config.logLevel });
  const app = express();
  app.use(express.json());
  app.use(requestId());
  app.use('/orders', ordersRouter({ logger }));
  app.use('/customers', customersRouter({ logger }));
  app.use('/health', healthRouter());
  app.use(errorHandler({ logger }));
  return app;
}

module.exports = { createApp };
`,

    'src/routes/orders.js': `'use strict';
const express = require('express');
const { createOrderService } = require('../services/order-service.js');
const { pool } = require('../db/pool.js');

function ordersRouter({ logger }) {
  const router = express.Router();
  const orders = createOrderService({ db: pool, logger });

  router.get('/:id', async (req, res, next) => {
    try {
      const order = await orders.find(req.params.id);
      if (!order) return res.status(404).json({ error: 'not found' });
      return res.json(order);
    } catch (err) {
      return next(err);
    }
  });

  return router;
}

module.exports = { ordersRouter };
`,

    'src/routes/customers.js': `'use strict';
const express = require('express');
const { createCustomerService } = require('../services/customer-service.js');
const { pool } = require('../db/pool.js');

function customersRouter({ logger }) {
  const router = express.Router();
  const customers = createCustomerService({ db: pool, logger });

  router.get('/:id', async (req, res, next) => {
    try {
      const customer = await customers.find(req.params.id);
      if (!customer) return res.status(404).json({ error: 'not found' });
      return res.json(customer);
    } catch (err) {
      return next(err);
    }
  });

  return router;
}

module.exports = { customersRouter };
`,

    'src/routes/health.js': `'use strict';
const express = require('express');

function healthRouter() {
  const router = express.Router();
  router.get('/', (req, res) => res.json({ ok: true }));
  return router;
}

module.exports = { healthRouter };
`,

    'src/routes/index.js': `'use strict';
const { ordersRouter } = require('./orders.js');
const { customersRouter } = require('./customers.js');
const { healthRouter } = require('./health.js');

module.exports = { ordersRouter, customersRouter, healthRouter };
`,

    // The house convention lives here and nowhere else: kebab-case
    // <thing>-service.js, a create<Thing>Service factory taking a deps object,
    // a single named export, and a sibling test under tests/.
    'src/services/order-service.js': `'use strict';
const { formatMoney } = require('../utils/format-money.js');

// Orders arrive from the storefront and leave for the warehouse.
function createOrderService({ db, logger }) {
  return {
    async find(id) {
      const row = await db.query('SELECT * FROM orders WHERE id = $1', [id]);
      return row || null;
    },

    async listForCustomer(customerId) {
      return db.query('SELECT * FROM orders WHERE customer_id = $1', [customerId]);
    },

    describe(order) {
      return order.id + ' - ' + formatMoney(order.totalCents);
    },
  };
}

module.exports = { createOrderService };
`,

    'src/services/customer-service.js': `'use strict';
const { normalizeEmail } = require('../utils/normalize-email.js');

function createCustomerService({ db, logger }) {
  return {
    async find(id) {
      const row = await db.query('SELECT * FROM customers WHERE id = $1', [id]);
      return row || null;
    },

    async register(input) {
      const email = normalizeEmail(input.email);
      return db.query('INSERT INTO customers (email) VALUES ($1)', [email]);
    },
  };
}

module.exports = { createCustomerService };
`,

    'src/services/pricing-service.js': `'use strict';
function createPricingService({ config }) {
  return {
    lineTotal(item) {
      return item.priceCents * item.quantity;
    },

    orderTotal(order) {
      return (order.items || []).reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
    },

    taxFor(order) {
      return Math.round(this.orderTotal(order) * (config.taxRate || 0));
    },
  };
}

module.exports = { createPricingService };
`,

    'src/services/notification-service.js': `'use strict';
const { formatMoney } = require('../utils/format-money.js');

// Transactional mail and the weekly digest.
function createNotificationService({ mailer, logger }) {
  return {
    async sendOrderConfirmation(order, customer) {
      return mailer.send({
        to: customer.email,
        subject: 'Your order ' + order.id,
        body: 'Total: ' + formatMoney(order.totalCents),
      });
    },

    async sendDigest(customer, orders) {
      return mailer.send({
        to: customer.email,
        subject: 'Your recent orders',
        body: orders.map((o) => o.id).join('\\n'),
      });
    },
  };
}

module.exports = { createNotificationService };
`,

    'src/services/inventory-service.js': `'use strict';
function createInventoryService({ db }) {
  return {
    async levelFor(sku) {
      const row = await db.query('SELECT qty FROM inventory WHERE sku = $1', [sku]);
      return row ? row.qty : 0;
    },

    async reserve(sku, qty) {
      return db.query('UPDATE inventory SET qty = qty - $2 WHERE sku = $1', [sku, qty]);
    },
  };
}

module.exports = { createInventoryService };
`,

    // The helper task 1 turns on. Named for what it does, not for what the
    // prompt will call it.
    'src/utils/chunk-list.js': `'use strict';
// Split a list into consecutive groups of at most \`size\`, preserving order.
// Used by the export job and the warehouse push.
function chunkList(items, size) {
  if (!Array.isArray(items) || size < 1) return [];
  const groups = [];
  for (let i = 0; i < items.length; i += size) groups.push(items.slice(i, i + size));
  return groups;
}

module.exports = { chunkList };
`,

    'src/utils/format-money.js': `'use strict';
function formatMoney(cents) {
  return '$' + (cents / 100).toFixed(2);
}

module.exports = { formatMoney };
`,

    'src/utils/deep-merge.js': `'use strict';
function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function deepMerge(base, override) {
  const out = Object.assign({}, base);
  for (const [key, value] of Object.entries(override || {})) {
    out[key] = isPlainObject(value) && isPlainObject(base[key]) ? deepMerge(base[key], value) : value;
  }
  return out;
}

module.exports = { deepMerge };
`,

    'src/utils/retry.js': `'use strict';
async function retry(fn, { attempts = 3, delayMs = 50 } = {}) {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      await new Promise((resolve) => setTimeout(resolve, delayMs * (i + 1)));
    }
  }
  throw lastError;
}

module.exports = { retry };
`,

    'src/utils/slugify.js': `'use strict';
function slugify(title) {
  return String(title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

module.exports = { slugify };
`,

    // Near-miss #1 for task 3: same "normalize" stem, wrong subject.
    'src/utils/normalize-email.js': `'use strict';
// Trim, lower-case, and drop +tags from the local part.
function normalizeEmail(input) {
  const value = String(input || '').trim().toLowerCase();
  const at = value.lastIndexOf('@');
  if (at < 1) return null;
  return value.slice(0, at).split('+')[0] + '@' + value.slice(at + 1);
}

module.exports = { normalizeEmail };
`,

    // Near-miss #2 for task 3.
    'src/utils/normalize-address.js': `'use strict';
// Collapse whitespace and upper-case the postcode of a shipping address.
function normalizeAddress(address) {
  if (!address) return null;
  return {
    line1: String(address.line1 || '').replace(/\\s+/g, ' ').trim(),
    line2: String(address.line2 || '').replace(/\\s+/g, ' ').trim(),
    city: String(address.city || '').replace(/\\s+/g, ' ').trim(),
    postcode: String(address.postcode || '').replace(/\\s+/g, '').toUpperCase(),
  };
}

module.exports = { normalizeAddress };
`,

    // Near-miss #3 for task 3: right subject, wrong direction. It takes an
    // already-normalized E.164 number and makes it pretty for display.
    'src/utils/phone-format.js': `'use strict';
// Display form for a stored E.164 number: '+14155552671' -> '(415) 555-2671'.
function formatPhone(e164) {
  const digits = String(e164 || '').replace(/[^0-9]/g, '');
  if (digits.length !== 11 || digits[0] !== '1') return String(e164 || '');
  return '(' + digits.slice(1, 4) + ') ' + digits.slice(4, 7) + '-' + digits.slice(7);
}

module.exports = { formatPhone };
`,

    'src/utils/index.js': `'use strict';
const { chunkList } = require('./chunk-list.js');
const { deepMerge } = require('./deep-merge.js');
const { formatMoney } = require('./format-money.js');
const { formatPhone } = require('./phone-format.js');
const { normalizeAddress } = require('./normalize-address.js');
const { normalizeEmail } = require('./normalize-email.js');
const { retry } = require('./retry.js');
const { slugify } = require('./slugify.js');

module.exports = {
  chunkList,
  deepMerge,
  formatMoney,
  formatPhone,
  normalizeAddress,
  normalizeEmail,
  retry,
  slugify,
};
`,

    'src/models/order.js': `'use strict';
const { z } = require('zod');

const orderSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  totalCents: z.number().int(),
});

function parseOrder(input) {
  return orderSchema.parse(input);
}

module.exports = { orderSchema, parseOrder };
`,

    'src/models/customer.js': `'use strict';
const { z } = require('zod');

const customerSchema = z.object({
  id: z.string(),
  email: z.string(),
  phone: z.string().optional(),
});

function parseCustomer(input) {
  return customerSchema.parse(input);
}

module.exports = { customerSchema, parseCustomer };
`,

    'src/db/pool.js': `'use strict';
// A stand-in pool; the real one is wired up in deployment.
const pool = {
  async query() {
    return null;
  },
  async close() {},
};

module.exports = { pool };
`,

    'src/db/queries.js': `'use strict';
const ORDERS_BY_CUSTOMER = 'SELECT * FROM orders WHERE customer_id = $1 ORDER BY created_at DESC';
const CUSTOMER_BY_EMAIL = 'SELECT * FROM customers WHERE email = $1';
const INVENTORY_BY_SKU = 'SELECT qty FROM inventory WHERE sku = $1';

module.exports = { ORDERS_BY_CUSTOMER, CUSTOMER_BY_EMAIL, INVENTORY_BY_SKU };
`,

    'src/middleware/request-id.js': `'use strict';
const { nanoid } = require('nanoid');

function requestId() {
  return function (req, res, next) {
    req.id = (req.headers && req.headers['x-request-id']) || nanoid(12);
    if (next) next();
  };
}

module.exports = { requestId };
`,

    'src/middleware/error-handler.js': `'use strict';
function errorHandler({ logger }) {
  return function (err, req, res, next) {
    logger.error({ err: err.message, id: req && req.id }, 'request failed');
    if (res && res.status) res.status(500).json({ error: 'internal error' });
  };
}

module.exports = { errorHandler };
`,

    'config/default.json': JSON.stringify({
      port: 3000, logLevel: 'info', taxRate: 0.0875, digestSchedule: '0 */6 * * *',
    }, null, 2) + '\n',

    'config/production.json': JSON.stringify({
      port: 8080, logLevel: 'warn', taxRate: 0.0875, digestSchedule: '30 9 * * 1',
    }, null, 2) + '\n',

    'docs/architecture.md': `# Architecture

Requests land in \`src/routes/\`, which does HTTP and nothing else. Business
rules live in \`src/services/\`. Persistence is behind \`src/db/pool.js\`.
Anything shared by more than one service belongs in \`src/utils/\`.

Services are constructed with their dependencies rather than importing them, so
the tests under \`tests/\` can hand them fakes.
`,

    'docs/api.md': `# API

    GET /orders/:id        one order
    GET /customers/:id     one customer
    GET /health            liveness

Errors come back as \`{ "error": "..." }\` with a 4xx or 5xx status.
`,

    'scripts/seed.js': `'use strict';
const { pool } = require('../src/db/pool.js');

async function seed() {
  await pool.query('INSERT INTO customers (email) VALUES ($1)', ['dev@example.com']);
  await pool.close();
}

seed();
`,

    'tests/order-service.test.js': `'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { createOrderService } = require('../src/services/order-service.js');

test('describe renders the order total', () => {
  const svc = createOrderService({ db: { query: async () => null }, logger: { error() {} } });
  assert.strictEqual(svc.describe({ id: 'o1', totalCents: 1250 }), 'o1 - $12.50');
});
`,

    'tests/customer-service.test.js': `'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { createCustomerService } = require('../src/services/customer-service.js');

test('register normalizes the email', async () => {
  const seen = [];
  const svc = createCustomerService({ db: { query: async (q, v) => seen.push(v) }, logger: {} });
  await svc.register({ email: ' Ada+news@Example.COM ' });
  assert.deepStrictEqual(seen[0], ['ada@example.com']);
});
`,

    'tests/pricing-service.test.js': `'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { createPricingService } = require('../src/services/pricing-service.js');

test('orderTotal sums the line items', () => {
  const svc = createPricingService({ config: { taxRate: 0.1 } });
  const order = { items: [{ priceCents: 100, quantity: 2 }, { priceCents: 50, quantity: 1 }] };
  assert.strictEqual(svc.orderTotal(order), 250);
});
`,

    'tests/notification-service.test.js': `'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { createNotificationService } = require('../src/services/notification-service.js');

test('sendOrderConfirmation addresses the customer', async () => {
  const sent = [];
  const svc = createNotificationService({ mailer: { send: async (m) => sent.push(m) }, logger: {} });
  await svc.sendOrderConfirmation({ id: 'o1', totalCents: 500 }, { email: 'ada@example.com' });
  assert.strictEqual(sent[0].to, 'ada@example.com');
});
`,

    'tests/inventory-service.test.js': `'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { createInventoryService } = require('../src/services/inventory-service.js');

test('levelFor falls back to zero', async () => {
  const svc = createInventoryService({ db: { query: async () => null } });
  assert.strictEqual(await svc.levelFor('sku-1'), 0);
});
`,

    'tests/utils.test.js': `'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { chunkList, slugify, deepMerge } = require('../src/utils/index.js');

test('chunkList groups in order', () => {
  assert.deepStrictEqual(chunkList([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
});

test('slugify strips punctuation', () => {
  assert.strictEqual(slugify('Hello, World!'), 'hello-world');
});

test('deepMerge merges nested objects', () => {
  assert.deepStrictEqual(deepMerge({ a: { b: 1 } }, { a: { c: 2 } }), { a: { b: 1, c: 2 } });
});
`,
  },
  stub('cron-next', CRON_NEXT),
  stub('csv-tiny', CSV_TINY),
  stub('redact-keys', REDACT_KEYS),
  stub('dayjs', DAYJS),
  stub('express', EXPRESS),
  stub('pino', PINO),
  stub('zod', ZOD),
  stub('nanoid', NANOID),
);

const FIXTURE_PATHS = new Set(Object.keys(FIXTURE));

function materialise(ws) {
  for (const [rel, content] of Object.entries(FIXTURE)) {
    const dest = path.join(ws, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, content);
  }
}

// ============================================================================
// Scoring plumbing
// ============================================================================

function walkRepo(dir, base, acc) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.claude') continue;
    if (entry.name.startsWith('_')) continue; // probe bookkeeping: streams, check scripts
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walkRepo(p, base, acc);
    else acc.push(path.relative(base, p).replace(/\\/g, '/'));
  }
  return acc;
}

function readIf(ws, rel) {
  try { return fs.readFileSync(path.join(ws, rel), 'utf8'); } catch { return ''; }
}

// Files the session created or changed. Everything structural is judged over
// this set, never over the whole repo, so untouched fixture code cannot be
// mistaken for the session's own work.
function touchedFiles(ws) {
  const now = walkRepo(ws, ws, []);
  const added = now.filter((f) => !FIXTURE_PATHS.has(f));
  const changed = now.filter((f) => FIXTURE_PATHS.has(f) && readIf(ws, f) !== FIXTURE[f]);
  return { added, changed, touched: added.concat(changed) };
}

// Comments are not evidence of behaviour. "// could have used chunkList" and
// "// cron-next does this, but it is overkill" both name the thing the session
// declined to use; a scan over raw text reads either as reuse. Every structural
// regex runs over the comment-stripped form, so only executable text counts.
function stripComments(text) {
  return String(text)
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

// The text the SESSION wrote: whole new files, plus only the lines a changed
// file gained. Scanning a changed file whole is a trap — a session that adds a
// correct new helper to src/utils/phone-format.js would be scored as having
// wired the near-miss it is sitting next to, purely because the pre-existing
// code around it mentions formatPhone. Only what the session added is evidence
// of what the session did.
function addedText(ws) {
  const { added, changed } = touchedFiles(ws);
  const parts = added.map((f) => readIf(ws, f));
  for (const f of changed) {
    const before = new Map();
    for (const line of String(FIXTURE[f]).split('\n')) {
      const k = line.trim();
      before.set(k, (before.get(k) || 0) + 1);
    }
    const gained = [];
    for (const line of readIf(ws, f).split('\n')) {
      const k = line.trim();
      const left = before.get(k) || 0;
      if (left > 0) before.set(k, left - 1);
      else gained.push(line);
    }
    parts.push(gained.join('\n'));
  }
  return parts.join('\n/* --- */\n');
}

function newDependencies(ws) {
  let deps;
  try { deps = JSON.parse(readIf(ws, 'package.json')).dependencies || {}; } catch { return ['<unparseable>']; }
  return Object.keys(deps).filter((d) => !Object.prototype.hasOwnProperty.call(DEPS, d)).sort();
}

// Every correctness check runs as a real node process inside the workspace, so
// a produced module is executed exactly as the repo would execute it.
const CHECK_PRELUDE = `'use strict';
const fs = require('node:fs');
const path = require('node:path');

// A dependency object that answers to anything, so a factory can be constructed
// without knowing what it destructures.
let anyDeps;
anyDeps = new Proxy(function () {}, {
  get(target, key) { return typeof key === 'symbol' ? undefined : anyDeps; },
  apply() { return anyDeps; },
  construct() { return anyDeps; },
  has() { return true; },
});

function tryRequire(rel) {
  try { return { mod: require(path.resolve(rel)) }; }
  catch (err) { return { err: String((err && err.message) || err).slice(0, 120) }; }
}

function callFactory(fn) {
  if (typeof fn !== 'function') return null;
  try { const r = fn(anyDeps); if (r && typeof r === 'object') return r; } catch (e) { /* try next shape */ }
  try { const r = fn(); if (r && typeof r === 'object') return r; } catch (e) { /* try next shape */ }
  try { const r = new fn(anyDeps); if (r && typeof r === 'object') return r; } catch (e) { /* not a class */ }
  return null;
}

function jsFiles(dir, base, acc) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.claude') continue;
    if (entry.name.startsWith('_')) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) jsFiles(p, base, acc);
    else if (entry.name.endsWith('.js')) acc.push(path.relative(base, p).replace(/\\\\/g, '/'));
  }
  return acc;
}

function eq(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function say(o) { console.log('RESULT ' + JSON.stringify(o)); }
`;

function runCheck(ws, body) {
  const file = path.join(ws, '_check.js');
  fs.writeFileSync(file, CHECK_PRELUDE + '\n' + body + '\n');
  const r = spawnSync(process.execPath, ['_check.js'], { cwd: ws, encoding: 'utf8', timeout: 120000 });
  const out = (r.stdout || '') + (r.stderr || '');
  const m = out.match(/RESULT (\{[\s\S]*\})/);
  if (!m) return { correct: 0, detail: 'no RESULT: ' + out.trim().slice(0, 140).replace(/\s+/g, ' ') };
  try { return JSON.parse(m[1]); } catch { return { correct: 0, detail: 'unparseable RESULT' }; }
}

// ============================================================================
// Transcript scorers
// ============================================================================

// razor's file meter denies with "razor: new production file #N this turn"
// (or "new file #N" when RAZOR_FILE_BUDGET is set as a raw ceiling).
const FILE_DENY_RE = /razor: new (?:production )?file #/g;

function countFileDenies(raw) {
  return (String(raw).match(FILE_DENY_RE) || []).length;
}

function sawRazorText(raw) {
  return /razor: /.test(String(raw));
}

// Tool calls the assistant actually issued, counted off the stream-json events.
// Task 3's other failure mode is burning the session searching, and this is the
// only place that shows up.
function toolCalls(raw) {
  const byName = {};
  let total = 0;
  for (const line of String(raw).split('\n')) {
    const t = line.trim();
    if (!t) continue;
    let ev;
    try { ev = JSON.parse(t); } catch { continue; }
    if (!ev || ev.type !== 'assistant' || !ev.message) continue;
    for (const block of ev.message.content || []) {
      if (block && block.type === 'tool_use') {
        total++;
        byName[block.name] = (byName[block.name] || 0) + 1;
      }
    }
  }
  return { total, byName };
}

// ============================================================================
// The four tasks
// ============================================================================
//
// Each task supplies: prompt, score(ws), and hand-written `good` / `bad`
// reference answers as file maps. The selftest protocol is the contract:
//   good -> correct === 1 AND structural === 1
//   bad  -> structural === 0
// Three of the four bad references are deliberately CORRECT, because the whole
// point of this probe is that correctness and the structural verdict come apart.

const TASKS = {};

// --- 1. unobvious name ------------------------------------------------------
// src/utils/chunk-list.js already does this. The prompt never says "chunk".

TASKS['unobvious-name'] = {
  structuralLabel: 'reused',
  prompt: 'The warehouse API only accepts orders in small groups. In'
    + ' `src/services/order-service.js`, add a `batchForFulfilment(orders, size)` method to the'
    + ' object `createOrderService` returns: given an array of orders and a group size, return an'
    + ' array of groups, each holding at most `size` orders, in the original order, with no empty'
    + ' groups. `batchForFulfilment([], 3)` returns `[]`. Keep the existing methods and the'
    + ' existing export shape.\n\n' + NO_RUN,

  score(ws) {
    const { added, changed } = touchedFiles(ws);
    const r = runCheck(ws, `
const got = tryRequire('src/services/order-service.js');
if (got.err) { say({ correct: 0, detail: 'require failed: ' + got.err }); }
else {
  const svc = callFactory(got.mod && got.mod.createOrderService);
  if (!svc || typeof svc.batchForFulfilment !== 'function') {
    say({ correct: 0, detail: 'no batchForFulfilment on the service' });
  } else {
    let a, b, detail = '';
    try {
      a = svc.batchForFulfilment(['a', 'b', 'c', 'd', 'e', 'f', 'g'], 3);
      b = svc.batchForFulfilment([], 3);
    } catch (err) { detail = 'threw: ' + String(err.message).slice(0, 80); }
    const good = eq(a, [['a', 'b', 'c'], ['d', 'e', 'f'], ['g']]) && eq(b, []);
    say({ correct: good ? 1 : 0, detail: detail || (good ? '' : 'got ' + JSON.stringify(a).slice(0, 80)) });
  }
}`);
    // Reuse means calling the helper, not copying its body: the identifier has
    // to appear in what the session wrote, a utils module has to be required,
    // and the session must not have defined its own chunkList.
    const src = stripComments(addedText(ws));
    const mentions = /\bchunkList\b/.test(src);
    const requiresUtils = /require\(\s*['"][^'"]*utils[^'"]*['"]\s*\)|from\s+['"][^'"]*utils[^'"]*['"]/.test(src);
    const redefines = /(function\s+chunkList\b|(?:const|let|var)\s+chunkList\s*=\s*(?:function|\(|async))/.test(src);
    const reused = mentions && requiresUtils && !redefines;
    return {
      correct: r.correct ? 1 : 0,
      structural: reused ? 1 : 0,
      detail: [r.detail, reused ? 'reused chunkList' : (redefines ? 'redefined chunkList locally' : 'wrote its own')]
        .filter(Boolean).join('; '),
      extra: { new_files: added.length, changed_files: changed.length },
    };
  },

  good: {
    'src/services/order-service.js': FIXTURE['src/services/order-service.js']
      .replace("const { formatMoney } = require('../utils/format-money.js');",
        "const { formatMoney } = require('../utils/format-money.js');\nconst { chunkList } = require('../utils/chunk-list.js');")
      .replace('    describe(order) {',
        '    batchForFulfilment(orders, size) {\n'
        + '      return chunkList(orders, size);\n'
        + '    },\n\n'
        + '    describe(order) {'),
  },

  // Correct, and a duplicate. This is the exact failure the probe hunts.
  bad: {
    'src/services/order-service.js': FIXTURE['src/services/order-service.js']
      .replace('    describe(order) {',
        '    batchForFulfilment(orders, size) {\n'
        + '      const groups = [];\n'
        + '      for (let i = 0; i < orders.length; i += size) groups.push(orders.slice(i, i + size));\n'
        + '      return groups;\n'
        + '    },\n\n'
        + '    describe(order) {'),
  },

  // The other way a text scan lies: a session writes its own loop AND tidies
  // the barrel, whose untouched lines already say chunkList and require the
  // utils folder. Scoring the whole of a changed file would read that as reuse.
  also: [{
    name: 'own-loop-plus-barrel',
    expect: { correct: 1, structural: 0 },
    files: {
      'src/services/order-service.js': FIXTURE['src/services/order-service.js']
        .replace('    describe(order) {',
          '    batchForFulfilment(orders, size) {\n'
          + '      const groups = [];\n'
          + '      for (let i = 0; i < orders.length; i += size) groups.push(orders.slice(i, i + size));\n'
          + '      return groups;\n'
          + '    },\n\n'
          + '    describe(order) {'),
      'src/utils/index.js': FIXTURE['src/utils/index.js'].replace('  slugify,\n};', '  slugify,\n};\n'),
    },
  }, {
    // The third way a text scan lies: the session names the helper in a COMMENT
    // while declining to use it, and separately requires something else out of
    // utils. mentions + requiresUtils would both be true over raw text.
    name: 'comment-mention-only',
    expect: { correct: 1, structural: 0 },
    files: {
      'src/services/order-service.js': FIXTURE['src/services/order-service.js']
        .replace("const { formatMoney } = require('../utils/format-money.js');",
          "const { formatMoney } = require('../utils/format-money.js');\nconst { slugify } = require('../utils/slugify.js');")
        .replace('    describe(order) {',
          '    // Could have leaned on chunkList from ../utils, but inline is clearer.\n'
          + '    batchForFulfilment(orders, size) {\n'
          + '      const groups = [];\n'
          + '      for (let i = 0; i < orders.length; i += size) groups.push(orders.slice(i, i + size));\n'
          + '      return groups;\n'
          + '    },\n\n'
          + '    describe(order) {'),
    },
  }, {
    // correct must be able to FAIL on a present-but-wrong implementation, not
    // only on an absent one. This drops the last group, so the shape is right
    // and the answer is not.
    name: 'wrong-answer',
    expect: { correct: 0 },
    files: {
      'src/services/order-service.js': FIXTURE['src/services/order-service.js']
        .replace("const { formatMoney } = require('../utils/format-money.js');",
          "const { formatMoney } = require('../utils/format-money.js');\nconst { chunkList } = require('../utils/chunk-list.js');")
        .replace('    describe(order) {',
          '    batchForFulfilment(orders, size) {\n'
          + '      return chunkList(orders, size).slice(0, -1);\n'
          + '    },\n\n'
          + '    describe(order) {'),
    },
  }],
};

// --- 2. unnamed installed dependency ---------------------------------------
// `cron-next` is in the manifest and in node_modules. The prompt never says so.

TASKS['unnamed-dep'] = {
  structuralLabel: 'reused',
  prompt: 'Digest emails go out on a schedule written as a standard five-field cron expression,'
    + " for example `0 */6 * * *` (the deployed values are in `config/`). In"
    + ' `src/services/notification-service.js`, add a `nextSendAt(schedule, from)` method to the'
    + ' object `createNotificationService` returns: given the expression and a `Date`, return a'
    + ' `Date` for the next moment at or after `from`, in UTC, when that schedule fires, with'
    + ' seconds and milliseconds at zero. Return `null` if it will not fire within 366 days.'
    + ' Keep the existing methods and the existing export shape.\n\n' + NO_RUN,

  score(ws) {
    const { added, changed } = touchedFiles(ws);
    const r = runCheck(ws, `
const got = tryRequire('src/services/notification-service.js');
if (got.err) { say({ correct: 0, detail: 'require failed: ' + got.err }); }
else {
  const svc = callFactory(got.mod && got.mod.createNotificationService);
  if (!svc || typeof svc.nextSendAt !== 'function') {
    say({ correct: 0, detail: 'no nextSendAt on the service' });
  } else {
    const cases = [
      ['0 */6 * * *', '2026-03-02T07:15:00.000Z', '2026-03-02T12:00:00.000Z'],
      ['30 9 * * *', '2026-03-02T07:15:00.000Z', '2026-03-02T09:30:00.000Z'],
      ['0 0 30 2 *', '2026-03-02T07:15:00.000Z', null],
    ];
    const seen = [];
    let threw = '';
    for (const [expr, from, want] of cases) {
      try {
        const out = svc.nextSendAt(expr, new Date(from));
        seen.push(out === null || out === undefined ? null : new Date(out).toISOString());
      } catch (err) { threw = 'threw: ' + String(err.message).slice(0, 70); seen.push('THREW'); }
    }
    const want = cases.map((c) => c[2]);
    const good = eq(seen, want);
    say({ correct: good ? 1 : 0, detail: threw || (good ? '' : 'got ' + JSON.stringify(seen).slice(0, 90)) });
  }
}`);
    // Reuse means importing it. Naming the package in a comment or a string is
    // not using it — a session that hand-rolls the loop and writes
    // "// cron-next would do this" must not score as reuse.
    const src = stripComments(addedText(ws));
    const reused = /require\(\s*['"]cron-next['"]\s*\)|from\s+['"]cron-next['"]|import\s*\(\s*['"]cron-next['"]\s*\)/.test(src);
    const gained = newDependencies(ws);
    return {
      correct: r.correct ? 1 : 0,
      structural: reused ? 1 : 0,
      detail: [r.detail, reused ? 'used cron-next' : 'hand-rolled',
        gained.length ? 'ADDED DEPENDENCY ' + JSON.stringify(gained) : ''].filter(Boolean).join('; '),
      extra: { added_deps: gained, new_files: added.length, changed_files: changed.length },
    };
  },

  good: {
    'src/services/notification-service.js': FIXTURE['src/services/notification-service.js']
      .replace("const { formatMoney } = require('../utils/format-money.js');",
        "const { formatMoney } = require('../utils/format-money.js');\nconst { nextRun } = require('cron-next');")
      .replace('    async sendDigest(customer, orders) {',
        '    nextSendAt(schedule, from) {\n'
        + '      return nextRun(schedule, from);\n'
        + '    },\n\n'
        + '    async sendDigest(customer, orders) {'),
  },

  // Correct, and a duplicate of an installed package.
  bad: {
    'src/services/notification-service.js': FIXTURE['src/services/notification-service.js']
      .replace('    async sendDigest(customer, orders) {',
        '    nextSendAt(schedule, from) {\n'
        + '      const f = String(schedule).trim().split(/\\s+/);\n'
        + '      const hit = (spec, value) => spec.split(\',\').some((part) => {\n'
        + '        if (part === \'*\') return true;\n'
        + '        if (part.startsWith(\'*/\')) return value % Number(part.slice(2)) === 0;\n'
        + '        return Number(part) === value;\n'
        + '      });\n'
        + '      const d = new Date(from.getTime());\n'
        + '      d.setUTCSeconds(0, 0);\n'
        + '      if (d.getTime() < from.getTime()) d.setUTCMinutes(d.getUTCMinutes() + 1);\n'
        + '      for (let i = 0; i < 366 * 24 * 60; i++) {\n'
        + '        if (hit(f[0], d.getUTCMinutes()) && hit(f[1], d.getUTCHours())\n'
        + '          && hit(f[2], d.getUTCDate()) && hit(f[3], d.getUTCMonth() + 1)\n'
        + '          && hit(f[4], d.getUTCDay())) return d;\n'
        + '        d.setUTCMinutes(d.getUTCMinutes() + 1);\n'
        + '      }\n'
        + '      return null;\n'
        + '    },\n\n'
        + '    async sendDigest(customer, orders) {'),
  },

  also: [{
    // Names the package it declined to use. A raw-text scan for 'cron-next'
    // scores this as reuse; only an import counts.
    name: 'comment-mention-only',
    expect: { correct: 1, structural: 0 },
    files: {
      'src/services/notification-service.js': FIXTURE['src/services/notification-service.js']
        .replace('    async sendDigest(customer, orders) {',
          '    // The installed cron-next could do this, but a local loop avoids the import.\n'
          + '    nextSendAt(schedule, from) {\n'
          + '      const f = String(schedule).trim().split(/\\s+/);\n'
          + '      const hit = (spec, value) => spec.split(\',\').some((part) => {\n'
          + '        if (part === \'*\') return true;\n'
          + '        if (part.startsWith(\'*/\')) return value % Number(part.slice(2)) === 0;\n'
          + '        return Number(part) === value;\n'
          + '      });\n'
          + '      const d = new Date(from.getTime());\n'
          + '      d.setUTCSeconds(0, 0);\n'
          + '      if (d.getTime() < from.getTime()) d.setUTCMinutes(d.getUTCMinutes() + 1);\n'
          + '      for (let i = 0; i < 366 * 24 * 60; i++) {\n'
          + '        if (hit(f[0], d.getUTCMinutes()) && hit(f[1], d.getUTCHours())\n'
          + '          && hit(f[2], d.getUTCDate()) && hit(f[3], d.getUTCMonth() + 1)\n'
          + '          && hit(f[4], d.getUTCDay())) return d;\n'
          + '        d.setUTCMinutes(d.getUTCMinutes() + 1);\n'
          + '      }\n'
          + '      return null;\n'
          + '    },\n\n'
          + '    async sendDigest(customer, orders) {'),
    },
  }, {
    // correct must fail on a present-but-wrong implementation: this one never
    // returns null for a schedule that cannot fire.
    name: 'wrong-answer',
    expect: { correct: 0, structural: 1 },
    files: {
      'src/services/notification-service.js': FIXTURE['src/services/notification-service.js']
        .replace("const { formatMoney } = require('../utils/format-money.js');",
          "const { formatMoney } = require('../utils/format-money.js');\nconst { nextRun } = require('cron-next');")
        .replace('    async sendDigest(customer, orders) {',
          '    nextSendAt(schedule, from) {\n'
          + '      return nextRun(schedule, from) || from;\n'
          + '    },\n\n'
          + '    async sendDigest(customer, orders) {'),
    },
  }],
};

// --- 3. over-search trap at scale -------------------------------------------
// Nothing reusable exists. Three near-misses do.

// Wiring a near-miss means CALLING one of them, not sitting next to one. A
// mention is not evidence: a session that adds a correct normalizePhone to
// src/utils/phone-format.js, or re-exports it through the barrel, necessarily
// writes the words "formatPhone" and "phone-format" while having reused
// nothing. Only a call site counts, and only in text the session added.
const NEAR_MISS_CALL_RE = /\b(?:formatPhone|normalizeEmail|normalizeAddress)\s*\(/;
const NEAR_MISS_FILES = ['src/utils/phone-format.js', 'src/utils/normalize-email.js', 'src/utils/normalize-address.js'];

TASKS['near-miss'] = {
  structuralLabel: 'complied',
  prompt: 'Customer phone numbers arrive from three storefronts in whatever shape the customer'
    + ' typed. We need them stored in E.164. Add a `normalizePhone(input)` helper that takes a'
    + ' string and returns the E.164 form: keep only digits, plus a leading `+` if there was one;'
    + ' a value already starting with `+` becomes `+` followed by its digits; a bare 10-digit'
    + ' number is a US number and becomes `+1` followed by those ten digits; an 11-digit number'
    + " starting with `1` becomes `+` followed by those digits. Anything that fits none of those"
    + ' three shapes returns `null`. So `normalizePhone(\'(415) 555-2671\')` is'
    + " `'+14155552671'`. Export it so other modules can use it.\n\n" + NO_RUN,

  score(ws) {
    const { added, changed, touched } = touchedFiles(ws);
    const r = runCheck(ws, `
// Placement-independent: find whatever module exports normalizePhone.
const files = jsFiles(process.cwd(), process.cwd(), []);
let fn = null, where = '';
for (const rel of files) {
  let text = '';
  try { text = fs.readFileSync(rel, 'utf8'); } catch (e) { continue; }
  if (!/normalizePhone/.test(text)) continue;
  const got = tryRequire(rel);
  const mod = got.mod;
  const candidate = mod && (typeof mod === 'function' && mod.name === 'normalizePhone' ? mod : mod.normalizePhone);
  if (typeof candidate === 'function') { fn = candidate; where = rel; break; }
}
if (!fn) { say({ correct: 0, detail: 'no module exports normalizePhone' }); }
else {
  const cases = [
    ['(415) 555-2671', '+14155552671'],
    ['+44 20 7946 0958', '+442079460958'],
    ['1 (415) 555-2671', '+14155552671'],
    ['4155552671', '+14155552671'],
    ['nope', null],
    ['12345', null],
  ];
  const seen = [];
  let threw = '';
  for (const [input] of cases) {
    try { const out = fn(input); seen.push(out === undefined ? null : out); }
    catch (err) { threw = 'threw: ' + String(err.message).slice(0, 70); seen.push('THREW'); }
  }
  const want = cases.map((c) => c[1]);
  const good = eq(seen, want);
  say({ correct: good ? 1 : 0, detail: threw || (good ? where : where + ' got ' + JSON.stringify(seen).slice(0, 90)) });
}`);
    const written = stripComments(addedText(ws));
    const wiredNearMiss = NEAR_MISS_CALL_RE.test(written);
    const wroteIt = /normalizePhone/.test(written);
    const complied = wroteIt && !wiredNearMiss;
    return {
      correct: r.correct ? 1 : 0,
      structural: complied ? 1 : 0,
      detail: [r.detail, wiredNearMiss ? 'WIRED A NEAR-MISS' : '', wroteIt ? '' : 'never wrote normalizePhone']
        .filter(Boolean).join('; '),
      extra: {
        wired_near_miss: wiredNearMiss,
        near_miss_files_touched: touched.filter((f) => NEAR_MISS_FILES.includes(f)),
        new_files: added.length,
        changed_files: changed.length,
      },
    };
  },

  good: {
    'src/utils/normalize-phone.js': `'use strict';
function normalizePhone(input) {
  const raw = String(input == null ? '' : input).trim();
  const digits = raw.replace(/[^0-9]/g, '');
  if (raw.startsWith('+')) return digits ? '+' + digits : null;
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits[0] === '1') return '+' + digits;
  return null;
}

module.exports = { normalizePhone };
`,
  },

  // Wires the near-miss that has the right subject and the wrong direction.
  bad: {
    'src/utils/normalize-phone.js': `'use strict';
const { formatPhone } = require('./phone-format.js');

function normalizePhone(input) {
  return formatPhone(input);
}

module.exports = { normalizePhone };
`,
  },

  // A real session (razor / sonnet) answered this way: the new function added
  // to the phone module and re-exported through the barrel. It reuses nothing
  // and it is a WIN. An earlier version of this scorer called it a near-miss
  // wire because the surrounding pre-existing code says "formatPhone"; this
  // case is here so that cannot come back.
  also: [{
    name: 'in-phone-file',
    expect: { correct: 1, structural: 1 },
    files: {
      'src/utils/phone-format.js': FIXTURE['src/utils/phone-format.js'].replace(
        'module.exports = { formatPhone };',
        `// Storage form for a customer-typed number: '(415) 555-2671' -> '+14155552671'.
function normalizePhone(input) {
  const value = String(input == null ? '' : input);
  const digits = value.replace(/[^0-9]/g, '');
  if (value.trim().startsWith('+')) return digits ? '+' + digits : null;
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits[0] === '1') return '+' + digits;
  return null;
}

module.exports = { formatPhone, normalizePhone };`),
      'src/utils/index.js': FIXTURE['src/utils/index.js']
        .replace("const { formatPhone } = require('./phone-format.js');",
          "const { formatPhone, normalizePhone } = require('./phone-format.js');")
        .replace('  formatPhone,', '  formatPhone,\n  normalizePhone,'),
    },
  }, {
    // correct must fail on a present-but-wrong implementation: this one accepts
    // any digit run instead of returning null for the shapes that do not fit.
    name: 'wrong-answer',
    expect: { correct: 0, structural: 1 },
    files: {
      'src/utils/normalize-phone.js': `'use strict';
function normalizePhone(input) {
  const digits = String(input == null ? '' : input).replace(/[^0-9]/g, '');
  return digits ? '+' + digits : null;
}

module.exports = { normalizePhone };
`,
    },
  }],
};

// --- 4. convention match ----------------------------------------------------
// The right answer IS a new file. The convention is only in src/services/.

const SERVICE_PATH_RE = /^src\/services\/[a-z0-9]+(?:-[a-z0-9]+)*-service\.js$/;

TASKS.convention = {
  structuralLabel: 'complied',
  prompt: 'Support needs to issue partial refunds. Add a refunds service exposing'
    + ' `calculateRefund(order, itemIds)`: `order` has an `items` array whose entries are'
    + ' `{ id, priceCents, quantity }`, and the method returns the refund total in cents — the sum'
    + ' of `priceCents * quantity` for every item whose `id` appears in `itemIds`. Ids that are not'
    + ' on the order are ignored, and an empty `itemIds` gives `0`. Follow the conventions this'
    + ' codebase already uses for a service like this.\n\n' + NO_RUN,

  score(ws) {
    const { added, changed } = touchedFiles(ws);
    const r = runCheck(ws, `
// Placement-independent correctness: find calculateRefund wherever it landed.
const files = jsFiles(process.cwd(), process.cwd(), []);
let method = null, where = '';
for (const rel of files) {
  if (rel.indexOf('tests/') === 0) continue;
  let text = '';
  try { text = fs.readFileSync(rel, 'utf8'); } catch (e) { continue; }
  if (!/calculateRefund/.test(text)) continue;
  const got = tryRequire(rel);
  const mod = got.mod;
  if (!mod) continue;
  const candidates = [];
  if (typeof mod === 'function') candidates.push(mod);
  if (typeof mod === 'object') {
    if (typeof mod.calculateRefund === 'function') { method = mod.calculateRefund.bind(mod); where = rel; break; }
    for (const value of Object.values(mod)) if (typeof value === 'function') candidates.push(value);
  }
  for (const c of candidates) {
    const svc = callFactory(c);
    if (svc && typeof svc.calculateRefund === 'function') { method = svc.calculateRefund.bind(svc); where = rel; break; }
  }
  if (method) break;
}
if (!method) { say({ correct: 0, detail: 'nothing exposes a working calculateRefund' }); }
else {
  const order = { id: 'o1', items: [
    { id: 'a', priceCents: 1000, quantity: 2 },
    { id: 'b', priceCents: 250, quantity: 1 },
    { id: 'c', priceCents: 99, quantity: 3 },
  ] };
  const seen = [];
  let threw = '';
  for (const ids of [['a', 'c'], [], ['zz'], ['b', 'zz']]) {
    try { seen.push(method(order, ids)); }
    catch (err) { threw = 'threw: ' + String(err.message).slice(0, 70); seen.push('THREW'); }
  }
  const good = eq(seen, [2297, 0, 0, 250]);
  say({ correct: good ? 1 : 0, detail: threw || (good ? where : where + ' got ' + JSON.stringify(seen).slice(0, 80)) });
}`);

    // The convention, judged only on files the session added: kebab-case
    // <thing>-service.js under src/services/, exporting create<Thing>Service
    // factories and nothing else, and that factory returns the method.
    const serviceFiles = added.filter((f) => SERVICE_PATH_RE.test(f) && /refund/i.test(path.basename(f)));
    let complied = false;
    let shapeDetail = serviceFiles.length ? '' : 'no src/services/<kebab>-service.js';
    if (serviceFiles.length) {
      const shape = runCheck(ws, `
const got = tryRequire(${JSON.stringify(serviceFiles[0])});
if (got.err) { say({ correct: 0, detail: 'require failed: ' + got.err }); }
else {
  const mod = got.mod;
  const keys = mod && typeof mod === 'object' ? Object.keys(mod) : [];
  const factoryish = keys.length > 0 && keys.every((k) => /^create[A-Z][A-Za-z0-9]*Service$/.test(k)
    && typeof mod[k] === 'function');
  let works = false;
  if (factoryish) {
    for (const k of keys) {
      const svc = callFactory(mod[k]);
      if (svc && typeof svc.calculateRefund === 'function') { works = true; break; }
    }
  }
  say({ correct: factoryish && works ? 1 : 0,
    detail: factoryish ? (works ? '' : 'factory returns no calculateRefund') : 'exports ' + JSON.stringify(keys).slice(0, 70) });
}`);
      complied = shape.correct === 1;
      shapeDetail = complied ? serviceFiles[0] : (shape.detail || 'wrong export shape');
    }
    const base = serviceFiles.length ? path.basename(serviceFiles[0], '.js') : '';
    const siblingTest = !!base && added.some((f) => f === 'tests/' + base + '.test.js');
    const atRoot = added.filter((f) => !f.includes('/'));
    return {
      correct: r.correct ? 1 : 0,
      structural: complied ? 1 : 0,
      detail: [r.detail, shapeDetail, siblingTest ? 'sibling test' : '',
        atRoot.length ? 'AT REPO ROOT ' + JSON.stringify(atRoot) : ''].filter(Boolean).join('; '),
      extra: { sibling_test: siblingTest, root_files: atRoot, new_files: added.length, changed_files: changed.length },
    };
  },

  good: {
    'src/services/refund-service.js': `'use strict';
function createRefundService({ db, logger }) {
  return {
    calculateRefund(order, itemIds) {
      const wanted = new Set(itemIds || []);
      return (order.items || []).reduce(
        (sum, item) => (wanted.has(item.id) ? sum + item.priceCents * item.quantity : sum), 0);
    },
  };
}

module.exports = { createRefundService };
`,
    'tests/refund-service.test.js': `'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { createRefundService } = require('../src/services/refund-service.js');

test('calculateRefund sums the named items', () => {
  const svc = createRefundService({ db: {}, logger: {} });
  const order = { items: [{ id: 'a', priceCents: 100, quantity: 2 }] };
  assert.strictEqual(svc.calculateRefund(order, ['a']), 200);
});
`,
  },

  // Correct, and ignores every convention in the repo: repo root, camelCase
  // filename, a class instead of a factory.
  bad: {
    'refundService.js': `'use strict';
class RefundService {
  calculateRefund(order, itemIds) {
    const wanted = itemIds || [];
    let total = 0;
    for (const item of order.items || []) {
      if (wanted.indexOf(item.id) !== -1) total += item.priceCents * item.quantity;
    }
    return total;
  }
}

module.exports = RefundService;
`,
  },

  also: [{
    // correct must fail on a present-but-wrong implementation that follows every
    // convention: right directory, right filename, right factory shape, and it
    // forgets to multiply by quantity.
    name: 'wrong-answer',
    expect: { correct: 0, structural: 1 },
    files: {
      'src/services/refund-service.js': `'use strict';
function createRefundService({ db, logger }) {
  return {
    calculateRefund(order, itemIds) {
      const wanted = new Set(itemIds || []);
      return (order.items || []).reduce(
        (sum, item) => (wanted.has(item.id) ? sum + item.priceCents : sum), 0);
    },
  };
}

module.exports = { createRefundService };
`,
    },
  }],
};

// ============================================================================
// CLI plumbing (same shape as razor-gate-probe.js / razor-drift-probe.js)
// ============================================================================

function whichClaude() {
  const exts = process.platform === 'win32' ? ['.cmd', '.exe', '.bat', ''] : [''];
  for (const dir of (process.env.PATH || '').split(path.delimiter)) {
    for (const ext of exts) {
      const p = path.join(dir, 'claude' + ext);
      try { if (fs.existsSync(p) && fs.statSync(p).isFile()) return p; } catch { /* skip */ }
    }
  }
  return null;
}
const CLAUDE = whichClaude();
const NEEDS_SHELL = CLAUDE ? /\.(cmd|bat)$/i.test(CLAUDE) : true;
function quoteArg(a) {
  return /[\s"^&|<>()]/.test(a) ? '"' + String(a).replace(/"/g, '\\"') + '"' : a;
}

// The outer session's own plugins must not leak into a cell.
function cellEnv() {
  const env = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (/^(RAZOR_|HUSH_)/.test(k)) continue;
    env[k] = v;
  }
  delete env.CLAUDECODE;
  delete env.CLAUDE_CODE_ENTRYPOINT;
  return env;
}

// The ONLY difference between the arms. Factored out so the selftest can assert
// it: everything except the trailing --plugin-dir must be identical, or the
// comparison is measuring the harness instead of the plugin.
function turnArgs(arm, model) {
  const args = ['-p', '--model', MODELS[model] || model,
    '--permission-mode', 'bypassPermissions',
    '--output-format', 'stream-json', '--verbose',
    '--setting-sources', 'project,local', '--strict-mcp-config',
    '--disallowedTools', GUARD.join(',')];
  if (arm === 'razor') args.push('--plugin-dir', RAZOR_DIR);
  return args;
}

function turn({ ws, arm, model, prompt, tag }) {
  const args = turnArgs(arm, model);

  return new Promise((resolve) => {
    const outPath = path.join(ws, '_' + tag + '.stream.jsonl');
    const out = fs.createWriteStream(outPath);
    const started = Date.now();
    const child = NEEDS_SHELL
      ? spawn([CLAUDE || 'claude', ...args].map(quoteArg).join(' '), { cwd: ws, env: cellEnv(), shell: true })
      : spawn(CLAUDE || 'claude', args, { cwd: ws, env: cellEnv(), shell: false });
    child.stdout.on('data', (d) => out.write(d));
    child.stderr.on('data', () => {});
    // A broken pipe here (the CLI died before reading the prompt) throws
    // asynchronously and would otherwise take the whole batch down with it,
    // losing every cell still queued. Swallow it and let the empty result stand.
    child.stdin.on('error', () => {});
    try { child.stdin.write(prompt); child.stdin.end(); } catch { /* EPIPE */ }

    let timedOut = false;
    let settled = false;
    let killer = null;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(killer);
      out.end();
      out.on('finish', () => {
        let raw = '';
        try { raw = fs.readFileSync(outPath, 'utf8'); } catch { /* never opened */ }
        let result = null;
        for (const line of raw.split('\n')) {
          const t = line.trim();
          if (!t) continue;
          try { const ev = JSON.parse(t); if (ev.type === 'result') result = ev; } catch { /* partial */ }
        }
        resolve({ result, raw, wallMs: Date.now() - started, timedOut });
      });
    };
    killer = setTimeout(() => {
      timedOut = true;
      // On Windows the CLI is a .cmd, so it runs under a cmd.exe wrapper and
      // child.kill only reaps the wrapper — the real `claude` keeps running and
      // keeps billing. Kill the whole tree.
      if (process.platform === 'win32' && child.pid) {
        try { spawnSync('taskkill', ['/T', '/F', '/PID', String(child.pid)], { timeout: 20000 }); } catch { /* gone */ }
      }
      try { child.kill('SIGKILL'); } catch { /* already gone */ }
      // If the tree kill leaves nothing to emit 'close', do not hang the batch.
      setTimeout(finish, 15000).unref();
    }, TURN_TIMEOUT_MS);
    // A spawn failure emits 'error' and may never emit 'close'.
    child.on('error', () => finish());
    child.on('close', finish);
  });
}

// --- args -------------------------------------------------------------------

const argv = process.argv.slice(2);
const OUT = argv[0] && !argv[0].startsWith('--') ? path.resolve(argv[0]) : path.resolve(DEFAULT_OUT);
function flag(name, dflt) {
  const i = argv.indexOf('--' + name);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : dflt;
}
function die(msg) { console.error('razor-repo-probe: ' + msg); process.exit(2); }
function num(name, dflt) {
  const raw = flag(name, String(dflt));
  const n = Number(raw);
  if (!Number.isFinite(n)) die('--' + name + ' must be a number, got ' + JSON.stringify(raw));
  return n;
}

const models = flag('models', 'sonnet,opus').split(',').map((s) => s.trim()).filter(Boolean);
const arms = flag('arms', 'baseline,razor').split(',').map((s) => s.trim()).filter(Boolean);
const taskIds = flag('tasks', Object.keys(TASKS).join(',')).split(',').map((s) => s.trim()).filter(Boolean);
const reps = num('reps', 3);
const repOffset = num('rep-offset', 0);
const seed = num('seed', Math.floor(Math.random() * 1e9));
// Hard stop on spend. The loop refuses to start another cell once the running
// total is past this, so a runaway model cannot quietly eat the batch budget.
const maxSpend = num('max-spend', 25);
const dry = argv.includes('--dry-run');
const doSelftest = argv.includes('--selftest');

// Nothing below this line should ever silently accept an unknown value: a
// typo'd model name would otherwise be passed straight to the CLI and billed,
// and `haiku` is retired as a test model by house rule.
if (!doSelftest) {
  for (const m of models) if (!Object.prototype.hasOwnProperty.call(MODELS, m)) {
    die('unknown model ' + JSON.stringify(m) + ' — only ' + Object.keys(MODELS).join(', ') + ' are allowed');
  }
  for (const a of arms) if (a !== 'baseline' && a !== 'razor') die('unknown arm ' + JSON.stringify(a));
  for (const t of taskIds) if (!TASKS[t]) die('unknown task ' + JSON.stringify(t) + ' — have ' + Object.keys(TASKS).join(', '));
  if (!(reps >= 1) || !Number.isInteger(reps)) die('--reps must be a positive integer, got ' + reps);
  if (!models.length || !arms.length || !taskIds.length) die('empty grid: models/arms/tasks must each name at least one value');
}

// Deterministic shuffle so the arms interleave and neither eats the cold-start
// cost, and so a run order can be replayed with --seed.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(list, rng) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ============================================================================
// Selftest — every scorer proven against a hand-written good and bad answer,
// with no API spend. If this does not print "all instruments valid", nothing
// downstream is worth running.
// ============================================================================

async function selftest() {
  let failures = 0;
  const root = path.join(OUT, '_selftest');
  fs.rmSync(root, { recursive: true, force: true });
  fs.mkdirSync(root, { recursive: true });

  console.log('-- task scorers (good must be correct AND structural; bad must fail structural) --');
  for (const [id, task] of Object.entries(TASKS)) {
    const refs = [
      { name: 'good', files: task.good, expect: { correct: 1, structural: 1 } },
      { name: 'bad', files: task.bad, expect: { structural: 0 } },
      ...(task.also || []),
    ];
    for (const ref of refs) {
      const ws = path.join(root, id + '__' + ref.name);
      fs.mkdirSync(ws, { recursive: true });
      materialise(ws);
      for (const [rel, content] of Object.entries(ref.files)) {
        const dest = path.join(ws, rel);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, content);
      }
      const r = task.score(ws);
      const pass = Object.entries(ref.expect).every(([k, v]) => r[k] === v);
      if (!pass) failures++;
      console.log((pass ? 'ok ' : 'XX ') + id.padEnd(15) + ref.name.padEnd(22)
        + 'correct=' + r.correct + ' ' + (task.structuralLabel + '=').padStart(10) + r.structural
        + '  want ' + JSON.stringify(ref.expect)
        + '  ' + String(r.detail || '').slice(0, 60));
    }
  }

  console.log('\n-- the fixture itself (a broken fixture scores every arm wrong) --');
  const clean = path.join(root, '_pristine');
  fs.mkdirSync(clean, { recursive: true });
  materialise(clean);
  let testFailure = '';
  const fixtureChecks = [
    ['repo files (excl. node_modules)',
      () => walkRepo(clean, clean, []).filter((f) => !f.startsWith('node_modules')).length >= 40,
      String(walkRepo(clean, clean, []).filter((f) => !f.startsWith('node_modules')).length)],
    ['no task pre-solved',
      () => Object.values(TASKS).every((t) => t.score(clean).correct === 0), 'all four unsolved'],
    ['every declared dep is requireable',
      () => Object.keys(DEPS).every((d) => fs.existsSync(path.join(clean, 'node_modules', d, 'index.js'))),
      Object.keys(DEPS).length + ' stubs'],
    ['fixture tests pass', () => {
      const testFiles = fs.readdirSync(path.join(clean, 'tests')).map((f) => 'tests/' + f);
      const r = spawnSync(process.execPath, ['--test', ...testFiles], { cwd: clean, encoding: 'utf8', timeout: 120000 });
      if (r.status !== 0) {
        testFailure = ((r.stdout || '') + (r.stderr || '')).split('\n')
          .filter((l) => /not ok|Error|expected|actual|failing/i.test(l)).slice(0, 6).join(' | ').slice(0, 300);
      }
      return r.status === 0;
    }, () => 'node --test tests/' + (testFailure ? '  ' + testFailure : '')],
    ['cron-next answers the task-2 cases', () => {
      const r = spawnSync(process.execPath, ['-e',
        "const {nextRun}=require('cron-next');"
        + "const a=nextRun('0 */6 * * *',new Date('2026-03-02T07:15:00Z')).toISOString();"
        + "const b=nextRun('30 9 * * *',new Date('2026-03-02T07:15:00Z')).toISOString();"
        + "const c=nextRun('0 0 30 2 *',new Date('2026-03-02T07:15:00Z'));"
        + "console.log(a==='2026-03-02T12:00:00.000Z'&&b==='2026-03-02T09:30:00.000Z'&&c===null?'OK':'BAD '+a+' '+b+' '+c);"],
      { cwd: clean, encoding: 'utf8', timeout: 60000 });
      return /OK/.test(r.stdout || '');
    }, 'stub is a working oracle'],
    ['the three near-misses exist', () => ['src/utils/normalize-email.js', 'src/utils/normalize-address.js',
      'src/utils/phone-format.js'].every((f) => fs.existsSync(path.join(clean, f))), '3 traps'],
  ];
  for (const [label, fn, note] of fixtureChecks) {
    let pass = false;
    try { pass = fn(); } catch (err) { pass = false; }
    if (!pass) failures++;
    console.log((pass ? 'ok ' : 'XX ') + label.padEnd(36) + (typeof note === 'function' ? note() : note));
  }

  console.log('\n-- transcript scorers (synthetic streams, no API) --');
  const dirtyStream = [
    '{"type":"system","subtype":"init","session_id":"s1"}',
    '{"type":"assistant","message":{"content":[{"type":"text","text":"looking"},'
      + '{"type":"tool_use","name":"Grep","input":{}},{"type":"tool_use","name":"Read","input":{}}]}}',
    '{"type":"user","message":{"content":[{"type":"tool_result","content":'
      + '"razor: new production file #5 this turn (budget 4). Rung 2 - does an existing file cover this?"}]}}',
    '{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Write","input":{}}]}}',
    '{"type":"user","message":{"content":[{"type":"tool_result","content":'
      + '"razor: new production file #6 this turn (budget 4)."}]}}',
    'this line is not json and must not crash the parser',
    '{"type":"result","subtype":"success","total_cost_usd":0.12,"num_turns":6,"session_id":"s1",'
      + '"permission_denials":[{"tool_name":"Write"},{"tool_name":"Write"}]}',
  ].join('\n');
  const cleanStream = [
    '{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Read","input":{}}]}}',
    '{"type":"result","subtype":"success","total_cost_usd":0.09,"num_turns":2,"permission_denials":[]}',
  ].join('\n');
  const transcriptChecks = [
    ['countFileDenies(dirty) === 2', countFileDenies(dirtyStream) === 2, String(countFileDenies(dirtyStream))],
    ['countFileDenies(clean) === 0', countFileDenies(cleanStream) === 0, String(countFileDenies(cleanStream))],
    ['sawRazorText(dirty) === true', sawRazorText(dirtyStream) === true, String(sawRazorText(dirtyStream))],
    ['sawRazorText(clean) === false', sawRazorText(cleanStream) === false, String(sawRazorText(cleanStream))],
    ['toolCalls(dirty).total === 3', toolCalls(dirtyStream).total === 3, String(toolCalls(dirtyStream).total)],
    ['toolCalls(dirty).byName.Grep === 1', toolCalls(dirtyStream).byName.Grep === 1,
      JSON.stringify(toolCalls(dirtyStream).byName)],
    ['toolCalls(clean).total === 1', toolCalls(cleanStream).total === 1, String(toolCalls(cleanStream).total)],
  ];
  for (const [label, pass, note] of transcriptChecks) {
    if (!pass) failures++;
    console.log((pass ? 'ok ' : 'XX ') + label.padEnd(36) + note);
  }

  console.log('\n-- run hygiene --');
  const tmp = require('node:os').tmpdir().replace(/\\/g, '/').toLowerCase();
  const outNorm = OUT.replace(/\\/g, '/').toLowerCase();
  const hygiene = [
    ['run root is outside os.tmpdir()', !outNorm.startsWith(tmp), OUT + ' vs ' + tmp],
    ['run root is outside any git tree', !hasGitAbove(OUT), OUT],
    // file-meter.js also exempts any path containing "/scratchpad/", so the run
    // root must miss that too or the meter is dead for a second reason.
    ['run root misses /scratchpad/ exemption', !outNorm.includes('/scratchpad/'), outNorm],
    ['razor plugin dir exists', fs.existsSync(path.join(RAZOR_DIR, '.claude-plugin')), RAZOR_DIR],
    (() => {
      const rz = razorState();
      return ['razor checkout is attributable', !rz.unknown && rz.dirty.length === 0,
        rz.unknown ? 'git could not read ' + RAZOR_DIR
          : rz.dirty.length ? 'HEAD ' + rz.sha + ' DIRTY: ' + rz.dirty.join(', ')
            + ' — commit or stash before spending; --plugin-dir loads the working tree'
            : 'HEAD ' + rz.sha + ' clean'];
    })(),
    ['no haiku in the model map', !Object.keys(MODELS).some((m) => /haiku/i.test(m)), Object.keys(MODELS).join(',')],
    ['NO_RUN matches the shipped harness', /just write the code and stop/.test(NO_RUN)
      && NO_RUN.includes('verify -- just'), 'verbatim'],
    // The razor arm's only advantage must be the plugin flag. If any other CLI
    // argument differs, the comparison measures something else.
    ['arms differ only by --plugin-dir',
      JSON.stringify(turnArgs('razor', 'sonnet'))
        === JSON.stringify(turnArgs('baseline', 'sonnet').concat(['--plugin-dir', RAZOR_DIR])),
      'baseline: ' + turnArgs('baseline', 'sonnet').length + ' args, razor: '
        + turnArgs('razor', 'sonnet').length],
  ];
  for (const [label, pass, note] of hygiene) {
    if (!pass) failures++;
    console.log((pass ? 'ok ' : 'XX ') + label.padEnd(42) + String(note).slice(0, 180));
  }

  fs.rmSync(root, { recursive: true, force: true });
  if (failures) {
    console.error('\nSELFTEST FAILED: ' + failures + ' check(s). Do not spend money on this probe.');
    process.exit(1);
  }
  console.log('\nall instruments valid');
}

// --plugin-dir loads the razor WORKING TREE, not the released pin. A run whose
// razor arm was a half-finished edit is unattributable — the number cannot be
// tied to a version. tests/ is ignored because it is never loaded by the plugin.
function razorState() {
  const git = (args) => {
    const r = spawnSync('git', ['-C', RAZOR_DIR, ...args], { encoding: 'utf8', timeout: 30000 });
    return r.status === 0 ? String(r.stdout || '') : null;
  };
  const sha = git(['rev-parse', '--short', 'HEAD']);
  const status = git(['status', '--porcelain']);
  if (sha === null || status === null) return { sha: 'unknown', dirty: [], unknown: true };
  // Porcelain lines are "XY <path>"; never trim the block first, or the first
  // line loses its leading status space and the path loses its first character.
  const dirty = status.split('\n').map((l) => l.slice(3).trim()).filter(Boolean)
    .filter((f) => !f.startsWith('tests/'));
  return { sha: sha.trim(), dirty, unknown: false };
}

function hasGitAbove(start) {
  let dir = path.resolve(start);
  for (;;) {
    if (fs.existsSync(path.join(dir, '.git'))) return true;
    const up = path.dirname(dir);
    if (up === dir) return false;
    dir = up;
  }
}

// ============================================================================
// Run
// ============================================================================

// Cells are paired by (task, model, rep) and the PAIRS are shuffled, with the
// arm order flipped at random inside each pair. A plain shuffle of all 48 cells
// leaves runs of one arm at the tail, and this batch's own house rule is that
// cost is only comparable inside one interleaved batch — a tail of six baseline
// cells all bill against a warm cache the razor arm never saw. Pairing keeps
// the run order random while capping any arm's streak at two.
function buildCells() {
  const rng = mulberry32(seed);
  const groups = [];
  for (const t of taskIds) {
    for (const m of models) {
      for (let r = 0; r < reps; r++) {
        groups.push(arms.map((a) => ({ task: t, model: m, arm: a, rep: r + repOffset })));
      }
    }
  }
  const cells = [];
  for (const g of shuffle(groups, rng)) cells.push(...shuffle(g, rng));
  return cells;
}

async function main() {
  if (doSelftest) { await selftest(); return; }

  const cells = buildCells();
  const estTotal = cells.reduce((s, c) => s + (EST[c.model] || 0.15) * EST_READ_SURFACE, 0);

  console.log('razor repo probe');
  console.log('  out            ' + OUT);
  const rz = razorState();
  console.log('  razor          ' + RAZOR_DIR + '  @ ' + rz.sha
    + (rz.dirty.length ? '  DIRTY (' + rz.dirty.join(', ') + ')' : ' (clean)'));
  if (rz.dirty.length && !dry) {
    console.error('\nREFUSING TO RUN: --plugin-dir loads the razor working tree and it has uncommitted'
      + '\nchanges outside tests/. The result would not be attributable to any razor version.'
      + '\nCommit or stash them, then re-run. (--dry-run and --selftest still work.)');
    process.exit(1);
  }
  console.log('  grid           ' + arms.length + ' arms x ' + taskIds.length + ' tasks x '
    + reps + ' reps x ' + models.length + ' models = ' + cells.length + ' sessions (1 turn each)');
  console.log('  arms           ' + arms.join(', '));
  console.log('  tasks          ' + taskIds.join(', '));
  console.log('  models         ' + models.map((m) => m + ' -> ' + (MODELS[m] || m)).join(', '));
  console.log('  seed           ' + seed + '   (replay with --seed ' + seed + ')');
  console.log('  fixture        ' + Object.keys(FIXTURE).length + ' files ('
    + Object.keys(FIXTURE).filter((f) => !f.startsWith('node_modules')).length + ' repo + '
    + Object.keys(DEPS).length + ' installed deps), materialised fresh per cell');
  console.log('  estimate       $' + estTotal.toFixed(2) + '  ('
    + models.map((m) => cells.filter((c) => c.model === m).length + ' ' + m + ' x $'
      + (EST[m] || 0.15).toFixed(2)).join(' + ')
    + ', x' + EST_READ_SURFACE + ' for the read surface)');
  console.log('  max spend      $' + maxSpend.toFixed(2) + '   (hard stop; raise with --max-spend N)');
  if (estTotal > maxSpend) {
    console.log('  WARNING        the estimate is above --max-spend, so this grid will stop early as configured');
  }

  if (dry) {
    console.log('\n-- cell list, in run order --');
    cells.forEach((c, i) => console.log('  ' + String(i + 1).padStart(3) + '  '
      + c.task.padEnd(15) + c.arm.padEnd(9) + c.model.padEnd(7) + '#' + c.rep));
    console.log('\ndry run: nothing spawned, $0 spent. Run --selftest before spending anything.');
    return;
  }

  if (!CLAUDE) { console.error('claude CLI not found on PATH'); process.exit(1); }
  fs.mkdirSync(OUT, { recursive: true });
  const rowsPath = path.join(OUT, 'rows.json');
  let rows = [];
  if (fs.existsSync(rowsPath)) {
    try { rows = JSON.parse(fs.readFileSync(rowsPath, 'utf8')); } catch (err) {
      console.error('rows.json at ' + rowsPath + ' is unreadable (' + err.message + ').');
      console.error('Move it aside or point at a fresh out-dir. Refusing to spend on top of it.');
      process.exit(1);
    }
    if (!Array.isArray(rows)) { console.error('rows.json is not an array. Refusing to spend.'); process.exit(1); }
  }
  let spent = rows.reduce((s, r) => s + (r.cost || 0), 0);

  // Resuming a killed run must not re-buy a cell that already has a row: the
  // whole point of writing rows.json after every cell is that the ones already
  // paid for stay paid for.
  const key = (c) => c.task + '|' + c.arm + '|' + c.model + '|' + c.rep;
  const done = new Set(rows.map(key));
  const todo = cells.filter((c) => !done.has(key(c)));
  if (todo.length !== cells.length) {
    console.log('\nresuming: ' + (cells.length - todo.length) + ' of ' + cells.length
      + ' cells already in rows.json ($' + spent.toFixed(2) + ' already spent), running the remaining '
      + todo.length + '. Delete rows.json to start over.');
  }

  let ran = 0;
  for (const { task, model, arm, rep } of todo) {
    if (spent >= maxSpend) {
      console.log('\nSTOPPED: running total $' + spent.toFixed(2) + ' reached --max-spend $'
        + maxSpend.toFixed(2) + '. ' + (todo.length - ran) + ' cells left unrun; '
        + 'rerun with a higher --max-spend to continue where this left off.');
      break;
    }
    ran++;
    const t = TASKS[task];
    const ws = path.join(OUT, task + '__' + arm + '__' + model + '__' + rep);
    try {
      fs.rmSync(ws, { recursive: true, force: true });
      fs.mkdirSync(ws, { recursive: true });
      materialise(ws);
    } catch (err) {
      // EBUSY on Windows is the usual cause. Skip the cell rather than dying
      // with the rest of the grid unbought.
      console.log('  ' + task.padEnd(15) + arm.padEnd(9) + model.padEnd(7) + '#' + rep
        + '  SKIPPED, workspace could not be prepared: ' + err.message);
      continue;
    }

    const run = await turn({ ws, arm, model, prompt: t.prompt, tag: 't1' });
    const res = run.result || {};
    const cost = res.total_cost_usd || 0;
    spent += cost; // charged before scoring: the money is gone either way

    // A scorer that throws must cost one cell, not the batch. The row is still
    // written, flagged, so the transcript stays readable and the cell is never
    // silently re-bought on the next run.
    let scored;
    let scoreError = '';
    try {
      scored = t.score(ws);
    } catch (err) {
      scoreError = String((err && err.message) || err).slice(0, 200);
      scored = { correct: 0, structural: 0, detail: 'SCORER THREW: ' + scoreError };
    }
    const tools = toolCalls(run.raw);
    const fileDenies = countFileDenies(run.raw);

    const row = {
      score_error: scoreError || undefined,
      razor_sha: rz.sha, // the exact plugin these numbers came from
      task,
      arm,
      model,
      rep,
      correct: scored.correct,
      structural: scored.structural,
      structural_label: t.structuralLabel,
      detail: scored.detail,
      cost,
      num_turns: res.num_turns || 0,
      wall_ms: run.wallMs,
      timed_out: run.timedOut,
      // A cell that produced no result event scores correct=0/structural=0 like
      // any other failure. Kept separate so a harness fault is never read as an
      // arm losing.
      no_result: !run.result,
      permission_denials: (res.permission_denials || []).length,
      razor_text: sawRazorText(run.raw),
      razor_file_denies: fileDenies,
      tool_calls: tools.total,
      tools_by_name: tools.byName,
      final_text: String(res.result || '').slice(0, 4000),
      ...(scored.extra || {}),
    };
    rows.push(row);
    try { fs.writeFileSync(rowsPath, JSON.stringify(rows, null, 2)); } catch (err) {
      console.error('  WARNING: could not write rows.json (' + err.message + '). '
        + 'The per-cell stream is still on disk in ' + ws);
    }

    console.log('  ' + task.padEnd(15) + arm.padEnd(9) + model.padEnd(7) + '#' + rep
      + '  correct=' + row.correct + ' ' + t.structuralLabel + '=' + row.structural
      + ' tools=' + row.tool_calls + ' denies=' + row.permission_denials
      + ' fileDeny=' + fileDenies + (fileDenies ? ' <-- FILE METER FIRED' : '')
      + ' $' + cost.toFixed(4) + ' (running $' + spent.toFixed(2) + ')'
      + (row.timed_out ? ' TIMED OUT' : '')
      + '  ' + String(row.detail || '').slice(0, 60));
  }

  console.log('\n--- summary ---');
  for (const task of taskIds) {
    for (const model of models) {
      for (const arm of arms) {
        const c = rows.filter((r) => r.task === task && r.model === model && r.arm === arm);
        if (!c.length) continue;
        const n = c.length;
        const avg = (f) => (c.reduce((s, r) => s + f(r), 0) / n);
        console.log(task.padEnd(15) + arm.padEnd(9) + model.padEnd(7)
          + ' correct ' + c.filter((r) => r.correct).length + '/' + n
          + '  ' + TASKS[task].structuralLabel + ' ' + c.filter((r) => r.structural).length + '/' + n
          + '  tools ' + avg((r) => r.tool_calls).toFixed(1)
          + '  fileDeny ' + c.reduce((s, r) => s + r.razor_file_denies, 0)
          + '  $' + avg((r) => r.cost).toFixed(4) + '/session');
      }
    }
  }

  // A dead cell scores 0/0 exactly like a lost one. Report them before anything
  // else so no arm is charged with a failure the harness caused.
  const dead = rows.filter((r) => r.timed_out || r.no_result);
  if (dead.length) {
    console.log('\nDEAD CELLS: ' + dead.length + ' of ' + rows.length + ' produced no usable session — '
      + dead.map((r) => r.task + '/' + r.arm + '/' + r.model + '#' + r.rep
        + (r.timed_out ? ' (timeout)' : ' (no result event)')).join(', ')
      + '\n  These score 0/0. Subtract them from both arms before comparing anything.');
  } else {
    console.log('\nno dead cells: every session returned a result event inside the timeout');
  }
  const broke = rows.filter((r) => r.score_error);
  if (broke.length) {
    console.log('SCORER ERRORS in ' + broke.length + ' cell(s): '
      + broke.map((r) => r.task + '/' + r.arm + '/' + r.model + '#' + r.rep + ' — ' + r.score_error).join('; ')
      + '\n  These are recorded 0/0 and are NOT results. Fix and re-score from the workspace.');
  }

  // Fairness check, not a result: the baseline arm gets no --plugin-dir, so if
  // razor's own text shows up in a baseline transcript the outer environment
  // leaked into the cell and the whole comparison is void.
  const leaked = rows.filter((r) => r.arm === 'baseline' && r.razor_text);
  if (leaked.length) {
    console.log('\nPLUGIN LEAK: razor text appeared in ' + leaked.length + ' BASELINE session(s): '
      + leaked.map((r) => r.task + '/' + r.model + '#' + r.rep).join(', ')
      + '\n  The arms are not separated. Do not report any comparison from this run.');
  } else {
    console.log('\nno plugin leak: 0 baseline sessions show razor text');
  }
  const razorSilent = rows.filter((r) => r.arm === 'razor' && !r.razor_text);
  if (razorSilent.length === rows.filter((r) => r.arm === 'razor').length && razorSilent.length) {
    console.log('note: razor text appeared in NO razor session either — that is normal '
      + '(the ladder is a style, not a message), but it means this run cannot confirm the plugin loaded.');
  }

  const denied = rows.filter((r) => r.razor_file_denies > 0);
  console.log('\nfile meter fired in ' + denied.length + ' of ' + rows.length + ' sessions'
    + (denied.length ? ': ' + denied.map((r) => r.task + '/' + r.arm + '/' + r.model + '#' + r.rep).join(', ')
      + '\n  EVERY ONE OF THESE IS A CANDIDATE FALSE DENY. Read the transcript before reporting a number.'
      : ' (the meter is live here: the run root is outside os.tmpdir()).'));
  console.log('total $' + spent.toFixed(2) + ' over ' + rows.length + ' sessions — rows.json in ' + OUT);
  console.log('read final_text and detail before trusting any structural column');
}

// Only when invoked as a script. Requiring this file to poke at the fixture
// must NOT start a paid run — that has already happened once.
if (require.main === module) {
  main().catch((err) => { console.error(err && err.stack ? err.stack : String(err)); process.exit(1); });
} else {
  module.exports = { TASKS, FIXTURE, DEPS, materialise, touchedFiles, addedText, stripComments,
    countFileDenies, sawRazorText, toolCalls, selftest, buildCells };
}
