'use strict';
const path = require('path');
const express = require('express');
const session = require('express-session');
const config = require('./src/config');
const PgStore = require('./src/sessionStore');
const auth = require('./src/auth');

const app = express();
app.set('trust proxy', config.trustProxy);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(session({
  name: 'sas.sid',
  store: new PgStore(),
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.cookieSecure,
    maxAge: 7 * 24 * 3600 * 1000,
  },
}));

// ---- API ----
app.get('/api/health', async (req, res) => {
  try {
    await require('./src/db').query('SELECT 1', []);
    res.json({ ok: true, app: config.appName });
  } catch (_) { res.status(503).json({ ok: false, error: 'Database belum siap.' }); }
});
// Hanya identitas publik; rahasia database/sesi tidak pernah dikirim ke browser.
app.get('/api/config', (req, res) => res.json({
  appName: config.appName, institutionName: config.institutionName, schoolName: config.schoolName,
}));
app.get('/api/product', (req, res) => res.json({
  supportEmail: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(process.env.SUPPORT_EMAIL || '') ? process.env.SUPPORT_EMAIL : null,
}));
app.use('/api/auth', require('./src/routes/auth'));
// Semua rute di bawah wajib login
app.use('/api', auth.requireAuth);
app.use('/api/master', require('./src/routes/master'));
app.use('/api/opening', require('./src/routes/opening'));
app.use('/api/journals', require('./src/routes/journals'));
app.use('/api/kasbank', require('./src/routes/kasbank'));
app.use('/api/piutang', require('./src/routes/piutang'));
app.use('/api/pajak', require('./src/routes/pajak'));
app.use('/api/budget', require('./src/routes/budget'));
app.use('/api/admin', require('./src/routes/admin'));
app.use('/api/reports', require('./src/routes/reports'));

// ---- Frontend statis ----
const PUB = path.join(__dirname, 'public');
app.use(express.static(PUB));
// Login page & app shell
app.get('/', (req, res) => res.sendFile(path.join(PUB, 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(PUB, 'login.html')));
app.get('/app', (req, res) => res.sendFile(path.join(PUB, 'app.html')));
app.get('/download/sas-opensource.zip', (req, res) => {
  const file = path.join(__dirname, 'release', 'sas-opensource.zip');
  if (!require('fs').existsSync(file)) return res.status(503).send('Paket unduhan sedang disiapkan. Silakan coba kembali.');
  res.download(file, 'sas-opensource.zip');
});
app.get('/download/panduan-instalasi.md', (req, res) => res.download(path.join(__dirname, 'README.md'), 'Panduan-SAS.md'));
// Halaman publik yang tidak dikenal tidak boleh tampak sebagai beranda/aplikasi yang valid.
app.get(/^\/(?!api\/).*/, (req, res) => res.status(404).send('Halaman tidak ditemukan. Kembali ke beranda SAS di /.'));

app.listen(config.port, config.host, () => {
  console.log(`\n  ${config.appName} berjalan di http://${config.host}:${config.port}\n`);
  // Backup database otomatis (saat start + harian)
  require('./src/services/backupService').startAuto();
});
