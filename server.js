'use strict';
const path = require('path');
const express = require('express');
const session = require('express-session');
const config = require('./src/config');
const PgStore = require('./src/sessionStore');
const auth = require('./src/auth');

const app = express();
const root = express();
root.disable('x-powered-by');
root.set('trust proxy',config.trustProxy);
app.disable('x-powered-by');
app.set('trust proxy', config.trustProxy);

// Header Keamanan Global
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if(config.isProd)res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  if(config.demoMode)res.setHeader('X-Robots-Tag','noindex, nofollow');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:;");
  next();
});

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

if(!config.demoMode) app.use(session({
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
app.get('/runtime.js',(req,res)=>res.type('application/javascript').send(`window.SAS_BASE_PATH=${JSON.stringify(config.basePath)};window.sasUrl=function(path){return window.SAS_BASE_PATH+path;};`));
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

// ---- Frontend statis & SEO ----
const PUB = path.join(__dirname, 'public');
app.get('/robots.txt', (req, res) => res.type('text/plain').sendFile(path.join(PUB, 'robots.txt')));
app.get('/sitemap.xml', (req, res) => res.type('application/xml').sendFile(path.join(PUB, 'sitemap.xml')));
function page(res,name){
  const html=require('fs').readFileSync(path.join(PUB,name),'utf8');
  res.type('html').send(config.basePath?html.replace(/(href|src|action)="\/(?!\/)/g,'$1="'+config.basePath+'/'):html);
}
app.get('/',(req,res)=>config.demoMode?res.redirect(config.basePath+'/app'):page(res,'index.html'));
app.get('/index.html',(req,res)=>config.demoMode?res.redirect(config.basePath+'/app'):page(res,'index.html'));
app.get(['/login','/login.html'],(req,res)=>config.demoMode?res.redirect(config.basePath+'/app'):page(res,'login.html'));
app.get(['/app','/app.html'],(req,res)=>page(res,'app.html'));
app.use(express.static(PUB,{index:false}));

// Login page & app shell
app.get('/download/sas-opensource.zip', (req, res) => {
  const file = path.join(__dirname, 'release', 'sas-opensource.zip');
  if (!require('fs').existsSync(file)) return res.status(503).send('Paket unduhan sedang disiapkan. Silakan coba kembali.');
  res.download(file, 'sas-opensource.zip');
});
app.get('/download/panduan-instalasi.md', (req, res) => res.download(path.join(__dirname, 'README.md'), 'Panduan-SAS.md'));
app.get('/download/panduan-uji-coba.docx', (req, res) => res.download(path.join(__dirname, 'docs', 'Panduan-Uji-Coba-SAS.docx'), 'Panduan-Uji-Coba-SAS.docx'));
// Halaman publik yang tidak dikenal tidak boleh tampak sebagai beranda/aplikasi yang valid.
app.get(/^\/(?!api\/).*/, (req, res) => res.status(404).send('Halaman tidak ditemukan. Kembali ke beranda SAS di /.'));

root.use(config.basePath || '/',app);
async function start(){
if(config.demoMode)await require('./src/services/demoSafety')();
root.listen(config.port, config.host, () => {
  console.log(`\n  ${config.appName} berjalan di http://${config.host}:${config.port}\n`);
  // Backup database otomatis (saat start + harian)
  if(!config.demoMode)require('./src/services/backupService').startAuto();
});
}
start().catch(e=>{console.error(e.message);process.exitCode=1;require('./src/db').close();});
