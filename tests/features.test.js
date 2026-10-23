'use strict';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgres://sas:sas_local_password@127.0.0.1:5432/sas_test';
const test = require('node:test');
const assert = require('node:assert');
const migrate = require('../src/db/migrate');
const db = require('../src/db');
const auth = require('../src/auth');
const piutang = require('../src/services/piutangService');

let U, units = {};

test.before(async () => {
  await migrate({ fresh: true });
  units.SD = (await db.prepare("INSERT INTO units (kode,nama,is_yayasan) VALUES ('SD','SD SAS',0)").run()).lastInsertRowid;
  units.SMP = (await db.prepare("INSERT INTO units (kode,nama,is_yayasan) VALUES ('SMP','SMP SAS',0)").run()).lastInsertRowid;
  const uid = (await db.prepare("INSERT INTO users (nama,email,password_hash,role,aktif) VALUES ('S','s@x',?,'admin',1)").run(auth.hashPassword('sasDemo123!'))).lastInsertRowid;
  U = { id: uid, nama: 'S', role: 'admin', ip: '127.0.0.1' };
});
test.after(async () => { await db.close(); });

// ---- Ganti password mandiri ----
test('changePassword menolak sandi lama yang salah', async () => {
  await assert.rejects(() => auth.changePassword(U.id, 'salah', 'barubaru1'), /lama salah/i);
});
test('changePassword menolak sandi baru < 8 karakter', async () => {
  await assert.rejects(() => auth.changePassword(U.id, 'sasDemo123!', 'pendek'), /minimal 8/i);
});
test('changePassword menolak sandi baru sama dengan lama', async () => {
  await assert.rejects(() => auth.changePassword(U.id, 'sasDemo123!', 'sasDemo123!'), /berbeda/i);
});
test('changePassword sukses lalu authenticate dgn sandi baru', async () => {
  await auth.changePassword(U.id, 'sasDemo123!', 'sas-baru-99');
  assert.ok(await auth.authenticate('s@x', 'sas-baru-99'));
  assert.strictEqual(await auth.authenticate('s@x', 'sasDemo123!'), null);
});

// ---- Impor siswa CSV ----
test('importStudents: valid masuk, duplikat & unit salah dilewati', async () => {
  await db.prepare("INSERT INTO students (nim,nama,unit_id,status) VALUES ('2201001','Ada',?,'aktif')").run(units.SD);
  const r = await piutang.importStudents(U, { students: [
    { nim: '2301099', nama: 'Test Import', prodi: 'TI', unit: 'SD', angkatan: '2023' }, // valid
    { nim: '2201001', nama: 'Dup', unit: 'SD' },        // sudah ada
    { nim: '2301098', nama: 'BadUnit', unit: 'ZZZ' },    // unit tak dikenal
    { nim: '2301099', nama: 'DupInFile', unit: 'SD' },  // duplikat di berkas
    { nim: '', nama: 'Kosong', unit: 'SD' },            // nim kosong
  ] });
  assert.strictEqual(r.total, 5);
  assert.strictEqual(r.inserted, 1);
  assert.strictEqual(r.skipped, 4);
  assert.strictEqual(r.errors.length, 4);
  const s = await db.prepare("SELECT * FROM students WHERE nim='2301099'").get();
  assert.strictEqual(s.nama, 'Test Import');
  assert.strictEqual(s.unit_id, units.SD);
});
test('importStudents menerima nama unit lengkap, bukan hanya kode', async () => {
  const r = await piutang.importStudents(U, { students: [{ nim: '2402001', nama: 'Via Nama', unit: 'SMP SAS' }] });
  assert.strictEqual(r.inserted, 1);
  const s = await db.prepare("SELECT unit_id FROM students WHERE nim='2402001'").get();
  assert.strictEqual(s.unit_id, units.SMP);
});
test('importStudents menolak daftar kosong', async () => {
  await assert.rejects(() => piutang.importStudents(U, { students: [] }), /tidak ada baris/i);
});
