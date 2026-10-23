'use strict';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.SEED_EMAIL_DOMAIN = 'sekolah.example';
process.env.SEED_PASSWORD = 'sasDemo123!';
process.env.NODE_ENV = 'development';
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn, spawnSync } = require('node:child_process');
const { once } = require('node:events');
const net = require('node:net');
const db = require('../src/db');
const migrate = require('../src/db/migrate');
const initialize = require('../src/db/initialize');
let server, base;
test.before(async () => {
  await migrate({ fresh: true });
  await initialize();
  const socket = net.createServer();
  socket.listen(0, '127.0.0.1'); await once(socket, 'listening');
  const port = socket.address().port;
  await new Promise(resolve => socket.close(resolve));
  base = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT: String(port), HOST: '127.0.0.1',
    NODE_ENV: 'development', COOKIE_SECURE: 'false', APP_NAME: 'SAS Uji Integrasi',
    INSTITUTION_NAME: 'Yayasan Uji <aman>', SCHOOL_NAME: 'Sekolah Uji' }, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Server tidak siap')), 10000);
    server.stdout.on('data', data => { if (data.toString().includes('berjalan di')) { clearTimeout(timer); resolve(); } });
    server.once('error', error => { clearTimeout(timer); reject(error); });
    server.once('exit', code => { clearTimeout(timer); reject(new Error(`Server berhenti: ${code}`)); });
  });
});
test.after(async () => {
  if (server && server.exitCode === null) { const exit = once(server, 'exit'); server.kill(); await exit; }
  await db.close();
});
test('inisialisasi kedua tidak menimpa data atau kredensial yang telah tersimpan', async () => {
  await db.prepare("UPDATE units SET nama='Sekolah Lokal Tetap' WHERE kode='SD'").run();
  const before = await db.prepare('SELECT COUNT(*) n FROM journals').get();
  await initialize();
  assert.equal((await db.prepare("SELECT nama FROM units WHERE kode='SD'").get()).nama, 'Sekolah Lokal Tetap');
  assert.deepEqual(await db.prepare('SELECT COUNT(*) n FROM journals').get(), before);
});
test('seed menyediakan jenjang umum dan COA sekolah tanpa mengubah keseimbangan jurnal', async () => {
  assert.deepEqual((await db.prepare('SELECT kode FROM units ORDER BY kode').all()).map(u => u.kode), ['SD', 'SMA', 'SMP', 'YYS']);
  for (const code of ['1124','1131','4210','4310','5410','5420']) assert.ok(await db.prepare('SELECT id FROM accounts WHERE kode=?').get(code));
  const invalid = await db.prepare('SELECT journal_id FROM journal_lines GROUP BY journal_id HAVING SUM(debit)<>SUM(kredit)').all();
  assert.equal(invalid.length, 0);
});
test('produksi menolak session secret demo dan seed bersandi demo tanpa menghapus data', async () => {
  const run = spawnSync(process.execPath, ['-e', "require('./src/config')"], {
    env: { ...process.env, NODE_ENV: 'production', SESSION_SECRET: 'sas-local-demo-only-change-before-production-2026' }, encoding: 'utf8',
  });
  assert.notEqual(run.status, 0); assert.match(run.stderr, /SESSION_SECRET/);
  const before = await db.prepare('SELECT COUNT(*) n FROM journals').get();
  process.env.NODE_ENV = 'production';
  try { await assert.rejects(() => require('../src/db/seed')(), /SEED_PASSWORD/); }
  finally { process.env.NODE_ENV = 'development'; }
  assert.deepEqual(await db.prepare('SELECT COUNT(*) n FROM journals').get(), before);
});
test('health, login dan identitas publik dapat diakses tanpa membocorkan rahasia', async () => {
  const health = await fetch(base + '/api/health'); assert.equal(health.status, 200);
  const cfg = await (await fetch(base + '/api/config')).json();
  assert.deepEqual(cfg, { appName: 'SAS Uji Integrasi', institutionName: 'Yayasan Uji <aman>', schoolName: 'Sekolah Uji' });
  for (const page of ['/', '/login', '/branding.js', '/app.js']) {
    const res = await fetch(base + page); assert.equal(res.status, 200);
    const body = await res.text(); assert.doesNotMatch(body, /tazkia/i);
  }
});
test('admin dan operator berhasil login lewat HTTP lokal serta mendapat sesi aktif', async () => {
  for (const [email, role] of [['admin1@sekolah.example','admin'], ['operator@sekolah.example','staf_akuntansi']]) {
    const login = await fetch(base + '/api/auth/login', { method:'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ email, password: process.env.SEED_PASSWORD || 'sasDemo123!' }) });
    assert.equal(login.status, 200); assert.equal((await login.json()).user.role, role);
    const cookie = login.headers.get('set-cookie'); assert.ok(cookie); assert.doesNotMatch(cookie, /; Secure/i);
    const me = await fetch(base + '/api/auth/me', { headers: { Cookie: cookie.split(';')[0] } });
    assert.equal(me.status, 200); assert.equal((await me.json()).user.email, email);
  }
});
