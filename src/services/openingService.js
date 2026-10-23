'use strict';
const db = require('../db');
const journals = require('./journalService');
const audit = require('./audit');
const { ApiError } = journals;

function money(value, signed = false) {
  let text = typeof value === 'number' ? String(value).replace('.', ',') : String(value ?? '').trim();
  if (!text) return 0;
  if (!(signed ? /^-?(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/ : /^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/).test(text)) {
    throw new ApiError(400, 'Nominal tidak valid. Gunakan format rupiah, misalnya 1.250.000,00.');
  }
  const negative = text.startsWith('-'); text = text.replace('-', '').replaceAll('.', '');
  const [rp, cents = ''] = text.split(',');
  const amount = BigInt(rp) * 100n + BigInt(cents.padEnd(2, '0'));
  if (amount > BigInt(Number.MAX_SAFE_INTEGER)) throw new ApiError(400, 'Nominal terlalu besar.');
  return Number(amount) * (negative ? -1 : 1);
}
function date(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '') || value < '1900-01-01' ||
      !Number.isFinite(Date.parse(value)) || new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) !== value) {
    throw new ApiError(400, 'Tanggal mulai pembukuan tidak valid.');
  }
  return value;
}
function canManage(user, unit) {
  if (!['admin', 'bendahara', 'staf_akuntansi'].includes(user.role)) throw new ApiError(403, 'Hanya admin, bendahara, atau staf akuntansi yang dapat menyiapkan saldo awal.');
  if (user.role !== 'admin' && user.unit_id && user.unit_id !== unit.id) throw new ApiError(403, 'Anda tidak berwenang menyiapkan unit ini.');
}
function eligible(account) {
  return account.aktif && account.is_postable && !account.is_interunit &&
    ['aset', 'liabilitas'].includes(account.tipe) && !['1131', '1139', '2120'].includes(account.kode);
}
async function context(user, unitId) {
  const unit = await db.prepare('SELECT * FROM units WHERE id=?').get(unitId);
  if (!unit || !unit.aktif) throw new ApiError(400, 'Pilih unit sekolah yang aktif.');
  canManage(user, unit);
  const setup = await db.prepare('SELECT o.*, j.status, j.nomor FROM opening_setups o LEFT JOIN journals j ON j.id=o.journal_id WHERE o.unit_id=?').get(unit.id);
  const existing = await db.prepare(`SELECT COUNT(DISTINCT j.id) n FROM journals j LEFT JOIN journal_lines l ON l.journal_id=j.id
    WHERE (j.unit_id=? OR l.unit_id=?) AND j.status <> 'rejected'`).get(unit.id, unit.id);
  return { unit, setup: setup ? { ...setup, detail: JSON.parse(setup.detail) } : null,
    blocked: !!setup || existing.n > 0, existingJournals: existing.n };
}
async function status(user, unitId) {
  const info = await context(user, unitId);
  const accounts = await db.prepare('SELECT * FROM accounts ORDER BY kode').all();
  const students = await db.prepare("SELECT id, nim, nama FROM students WHERE unit_id=? AND status='aktif' ORDER BY nama").all(info.unit.id);
  return { ...info, accounts: accounts.filter(eligible), students };
}
async function preview(user, payload) {
  const info = await context(user, Number(payload.unit_id));
  if (info.blocked) throw new ApiError(409, 'Unit ini sudah mempunyai jurnal atau pengaturan awal. Gunakan jurnal koreksi; saldo awal tidak boleh ditambahkan dua kali.');
  const tanggal = date(payload.tanggal);
  const period = await db.prepare('SELECT status FROM periods WHERE tahun=? AND bulan=?').get(+tanggal.slice(0, 4), +tanggal.slice(5, 7));
  if (period?.status === 'closed') throw new ApiError(409, 'Periode tanggal mulai sudah terkunci.');
  if (!Array.isArray(payload.balances) || payload.balances.length > 200 || !Array.isArray(payload.receivables) || payload.receivables.length > 1000) throw new ApiError(400, 'Daftar saldo/piutang tidak valid atau terlalu banyak.');
  const all = await db.prepare('SELECT * FROM accounts ORDER BY kode').all();
  const byId = new Map(all.map(a => [a.id, a]));
  const byCode = Object.fromEntries(all.map(a => [a.kode, a]));
  const lines = [], seen = new Set(); let assets = 0, liabilities = 0;
  const add = (a, amount, debit) => {
    if (!amount) return;
    if (!a || !a.aktif || !a.is_postable) throw new ApiError(400, 'Akun saldo awal wajib tersedia, aktif dan dapat dijurnal.');
    lines.push({ account_id: a.id, unit_id: info.unit.id, debit: debit ? amount : 0, kredit: debit ? 0 : amount,
      akun_kode: a.kode, akun_nama: a.nama });
  };
  for (const row of payload.balances) {
    const a = byId.get(Number(row.account_id));
    if (!a || !eligible(a) || seen.has(a.id)) throw new ApiError(400, 'Akun tidak didukung atau tercantum dua kali.');
    seen.add(a.id); const amount = money(row.amount);
    if (a.tipe === 'aset') assets += a.normal_balance === 'D' ? amount : -amount;
    else liabilities += a.normal_balance === 'K' ? amount : -amount;
    add(a, amount, a.normal_balance === 'D');
  }
  const receivables = []; const studentSet = new Set();
  for (const row of payload.receivables) {
    const student = await db.prepare("SELECT id, nama, nim FROM students WHERE id=? AND unit_id=? AND status='aktif'").get(Number(row.student_id), info.unit.id);
    if (!student || studentSet.has(student.id)) throw new ApiError(400, 'Siswa piutang harus aktif, dari unit ini, dan tidak boleh duplikat.');
    studentSet.add(student.id); const amount = money(row.amount);
    if (amount <= 0) throw new ApiError(400, 'Isi sisa piutang siswa lebih besar dari nol.');
    const due = date(row.jatuh_tempo);
    if (due > tanggal) throw new ApiError(400, 'Piutang awal hanya untuk layanan pendidikan sebelum tanggal mulai; jatuh tempo tidak boleh setelah tanggal mulai.');
    receivables.push({ ...student, amount, jatuh_tempo: due }); assets += amount;
  }
  add(byCode['1131'], receivables.reduce((n, r) => n + r.amount, 0), true);
  if (payload.unrestricted === '' || payload.unrestricted == null || payload.restricted === '' || payload.restricted == null) throw new ApiError(400, 'Konfirmasi aset neto awal, termasuk angka 0 jika tidak ada.');
  const unrestricted = money(payload.unrestricted, true), restricted = money(payload.restricted);
  add(byCode['3100'], Math.abs(unrestricted), unrestricted < 0);
  add(byCode['3200'], restricted, false);
  const totalDebit = lines.reduce((s, l) => s + l.debit, 0), totalKredit = lines.reduce((s, l) => s + l.kredit, 0);
  if (![assets, liabilities, totalDebit, totalKredit, unrestricted + restricted].every(Number.isSafeInteger)) throw new ApiError(400, 'Total saldo terlalu besar.');
  return { unit: info.unit, tanggal, lines, receivables, assets, liabilities, unrestricted, restricted,
    totalDebit, totalKredit, difference: totalDebit - totalKredit, balanced: totalDebit === totalKredit, empty: lines.length === 0 };
}
const submit = db.transaction(async (user, payload) => {
  if (payload.confirmed !== true) throw new ApiError(400, 'Konfirmasikan pemeriksaan bukti saldo awal terlebih dahulu.');
  await db.prepare('SELECT id FROM units WHERE id=? FOR UPDATE').get(Number(payload.unit_id));
  const p = await preview(user, payload);
  if (!p.balanced) throw new ApiError(400, 'Saldo awal belum seimbang. Periksa aset, kewajiban, dan aset neto.');
  const journal = p.empty ? null : await journals.createPending(user, { tanggal: p.tanggal, unit_id: p.unit.id,
    deskripsi: 'Saldo awal pembukuan — ' + p.unit.nama, sumber: 'opening', amountsInSen: true, lines: p.lines, ip: user.ip });
  await db.prepare('INSERT INTO opening_setups (unit_id,journal_id,tanggal,detail,created_by) VALUES (?,?,?,?,?) RETURNING unit_id')
    .run(p.unit.id, journal?.id || null, p.tanggal, JSON.stringify(p), user.id);
  await audit.log(user, 'opening_submit', 'unit', p.unit.id, { journal_id: journal?.id || null, tanggal: p.tanggal, empty: p.empty }, user.ip);
  return { journal, empty: p.empty, tanggal: p.tanggal };
});

// Dipanggil di dalam transaksi persetujuan jurnal; piutang tidak terlihat sebelum posting.
async function finalize(journal) {
  const setup = await db.prepare('SELECT * FROM opening_setups WHERE journal_id=?').get(journal.id);
  if (!setup) return;
  const p = JSON.parse(setup.detail);
  for (const r of p.receivables) {
    if (!await db.prepare("SELECT id FROM students WHERE id=? AND unit_id=? AND status='aktif'").get(r.id, p.unit.id)) {
      throw new ApiError(409, 'Siswa saldo awal berubah atau tidak lagi aktif pada unit ini. Tolak jurnal dan periksa rincian kembali.');
    }
    await db.prepare(`INSERT INTO invoices (nomor,student_id,unit_id,semester,tanggal,nominal,jatuh_tempo,
      tenor_bulan,mulai_amortisasi,status,journal_id,is_opening) VALUES (?,?,?,?,?,?,?,1,NULL,'terbit',?,1)`)
      .run(`AWAL/${p.unit.kode}/${journal.id}/${r.id}`, r.id, p.unit.id, 'Saldo awal ' + p.tanggal, p.tanggal,
        r.amount, r.jatuh_tempo, journal.id);
  }
  // Rekening operasional mengikuti akun kas/bank yang diisi, jika belum terdaftar.
  for (const l of p.lines.filter(l => /^11[12]/.test(l.akun_kode))) {
    if (!await db.prepare('SELECT id FROM bank_accounts WHERE account_id=? AND unit_id=?').get(l.account_id, p.unit.id)) {
      await db.prepare('INSERT INTO bank_accounts (nama,bank,account_id,unit_id) VALUES (?,?,?,?)')
        .run(l.akun_nama, 'Periksa melalui Kas & Bank', l.account_id, p.unit.id);
    }
  }
}
async function assertCanTransact(lines, tanggal, journalId = null) {
  for (const unitId of [...new Set(lines.map(l => l.unit_id))].sort((a,b) => a-b)) {
    // Kunci yang sama dengan pengajuan saldo awal mencegah transaksi pertama berlomba dengan wizard.
    await db.prepare('SELECT id FROM units WHERE id=? FOR UPDATE').get(unitId);
    const o = await db.prepare('SELECT o.*, j.status FROM opening_setups o LEFT JOIN journals j ON j.id=o.journal_id WHERE o.unit_id=?').get(unitId);
    if (!o) continue;
    if (tanggal < o.tanggal) throw new ApiError(409, 'Tanggal transaksi tidak boleh sebelum tanggal mulai pembukuan unit.');
    if (o.journal_id && o.journal_id !== journalId && o.status !== 'posted') throw new ApiError(409, 'Jurnal pembuka unit belum disetujui atau sudah dibalik. Selesaikan pengaturan awal terlebih dahulu.');
  }
}
async function beforeReverse(journal) {
  const setup = await db.prepare('SELECT * FROM opening_setups WHERE journal_id=?').get(journal.id);
  if (!setup) return;
  await db.prepare('SELECT id FROM units WHERE id=? FOR UPDATE').get(setup.unit_id);
  const other = await db.prepare(`SELECT 1 FROM journals j JOIN journal_lines l ON l.journal_id=j.id
    WHERE l.unit_id=? AND j.id<>? AND j.status IN ('posted','pending','reversed') LIMIT 1`).get(setup.unit_id, journal.id);
  if (other) throw new ApiError(409, 'Saldo awal sudah digunakan transaksi lain. Mintalah pendampingan koreksi, jangan membalik jurnal pembuka.');
  await db.prepare("UPDATE invoices SET status='void' WHERE journal_id=? AND is_opening=1").run(journal.id);
}
async function retryRejected(journal) {
  const setup = await db.prepare('SELECT unit_id FROM opening_setups WHERE journal_id=?').get(journal.id);
  if (setup) await db.prepare('DELETE FROM opening_setups WHERE journal_id=?').run(journal.id);
}
module.exports = { status, preview, submit, finalize, beforeReverse, retryRejected, assertCanTransact, money };
