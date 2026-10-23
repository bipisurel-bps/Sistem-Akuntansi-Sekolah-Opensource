'use strict';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.NODE_ENV = 'development';
process.env.SEED_MODE = 'school';
process.env.SEED_PASSWORD = 'sasDemo123!';
const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/db');
const migrate = require('../src/db/migrate');
const initialize = require('../src/db/initialize');
const opening = require('../src/services/openingService');
const journals = require('../src/services/journalService');
const piutang = require('../src/services/piutangService');
const financial = require('../src/services/financialService');
let admin, unit, accounts;
test.before(async () => {
  await migrate({fresh:true}); await initialize();
  admin = await db.prepare("SELECT * FROM users WHERE role='admin' LIMIT 1").get();
  unit = await db.prepare('SELECT * FROM units LIMIT 1').get();
  accounts = Object.fromEntries((await db.prepare('SELECT * FROM accounts').all()).map(a=>[a.kode,a]));
});
test.after(()=>db.close());
async function newUnit(code) { return (await db.prepare('INSERT INTO units (kode,nama) VALUES (?,?)').run(code,code)).lastInsertRowid; }
function input(unitId=unit.id) {return { unit_id:unitId, tanggal:'2026-10-01', balances:[
  {account_id:accounts['1111'].id,amount:'1.000.000'},
  {account_id:accounts['1230'].id,amount:'2.000.000'},
  {account_id:accounts['2110'].id,amount:'500.000'},
],receivables:[],unrestricted:'2.000.000',restricted:'500.000',confirmed:true};}
test('mode school menyediakan master dan tiga akun tanpa jurnal, siswa atau tagihan demo',async()=>{
  for(const table of ['journals','students','invoices']) assert.equal((await db.prepare(`SELECT COUNT(*) n FROM ${table}`).get()).n,0);
  assert.equal((await db.prepare('SELECT COUNT(*) n FROM units').get()).n,1);
  assert.equal((await db.prepare('SELECT COUNT(*) n FROM users').get()).n,3);
  assert.equal((await opening.status(admin,unit.id)).blocked,false);
});
test('pratinjau menghitung aset, kewajiban, aset neto dan D/K tanpa menulis jurnal',async()=>{
  const p=await opening.preview(admin,input());
  assert.equal(p.assets,300000000); assert.equal(p.liabilities,50000000);
  assert.equal(p.totalDebit,p.totalKredit); assert.equal(p.balanced,true);
  assert.equal((await db.prepare('SELECT COUNT(*) n FROM journals').get()).n,0);
  const off=await opening.preview(admin,{...input(),unrestricted:'1'}); assert.equal(off.balanced,false);
  await assert.rejects(()=>opening.submit(admin,{...input(),unrestricted:'1'}),/belum seimbang/);
});
test('menolak tanggal semu, nilai rusak, negatif, terlalu besar, akun induk dan akun duplikat',async()=>{
  for(const tanggal of ['2026-02-31','2026-13-01','1900-00-01']) await assert.rejects(()=>opening.preview(admin,{...input(),tanggal}),/Tanggal/);
  for(const amount of ['abc','100rp','1e6','-1','Infinity','9007199254740992']) {
    await assert.rejects(()=>opening.preview(admin,{...input(),balances:[{account_id:accounts['1111'].id,amount}]}),/Nominal/);
  }
  await assert.rejects(()=>opening.preview(admin,{...input(),balances:[{account_id:accounts['1000'].id,amount:'1'}]}),/Akun/);
  await assert.rejects(()=>opening.preview(admin,{...input(),balances:[input().balances[0],input().balances[0]]}),/dua kali/);
  await assert.rejects(()=>opening.submit(admin,{...input(),confirmed:false}),/Konfirmasikan/);
});
test('otorisasi melarang kasir dan staf dari unit lain',async()=>{
  await assert.rejects(()=>opening.status({...admin,role:'kasir'},unit.id),e=>e.status===403);
  await assert.rejects(()=>opening.preview({...admin,role:'staf_akuntansi',unit_id:999},input()),e=>e.status===403);
});
test('pengajuan membuat jurnal pending, bukan posting otomatis, dan menolak duplikasi',async()=>{
  const {journal}=await opening.submit(admin,input());
  assert.equal(journal.status,'pending'); assert.equal(journal.totalDebit,journal.totalKredit);
  const tx={tanggal:'2026-10-02',unit_id:unit.id,deskripsi:'Transaksi pertama',lines:[
    {account_id:accounts['1111'].id,debit:10},{account_id:accounts['4400'].id,kredit:10}]};
  await assert.rejects(()=>journals.createDraft(admin,tx),/belum disetujui/);
  await assert.rejects(()=>opening.submit(admin,input()),e=>e.status===409);
  const p=await financial.position({unitId:unit.id,asOf:'2026-10-01'});
  assert.equal(p.balanced,true);
  await journals.approve(admin,journal.id);
  const posted=await journals.getJournal(journal.id); assert.equal(posted.status,'posted');
  await assert.rejects(()=>journals.createDraft(admin,{...tx,tanggal:'2026-09-30'}),/sebelum tanggal mulai/);
  assert.ok(await db.prepare('SELECT id FROM bank_accounts WHERE account_id=? AND unit_id=?').get(accounts['1111'].id,unit.id));
  await assert.rejects(()=>journals.updateDraft(admin,journal.id,{}),/tidak bisa diubah/);
});
test('unit bertransaksi lama tidak boleh ditambahi saldo pembuka',async()=>{
  const id=await newUnit('OLD');
  await journals.createDraft(admin,{tanggal:'2026-10-01',unit_id:id,deskripsi:'Sudah pernah dipakai',lines:[
    {account_id:accounts['1111'].id,debit:10},{account_id:accounts['3100'].id,kredit:10}]});
  await assert.rejects(()=>opening.submit(admin,input(id)),e=>e.status===409);
});
test('saldo nol mencatat tanggal mulai tanpa membuat jurnal nol dan tetap idempoten',async()=>{
  const id=await newUnit('ZERO');
  const b={...input(id),balances:[],unrestricted:'0',restricted:'0'};
  const r=await opening.submit(admin,b); assert.equal(r.journal,null); assert.equal(r.empty,true);
  assert.ok((await opening.status(admin,id)).setup);
  await assert.rejects(()=>opening.submit(admin,b),e=>e.status===409);
});
test('dua pengajuan paralel unit yang sama hanya menghasilkan satu jurnal pembuka',async()=>{
  const id=await newUnit('RACE'); const b=input(id);
  const result=await Promise.allSettled([opening.submit(admin,b),opening.submit(admin,b)]);
  assert.equal(result.filter(r=>r.status==='fulfilled').length,1);
  assert.equal((await db.prepare("SELECT COUNT(*) n FROM journals WHERE unit_id=? AND sumber='opening'").get(id)).n,1);
});
test('jurnal ditolak bisa disiapkan ulang tanpa mengubah jurnal penolakan',async()=>{
  const id=await newUnit('RETRY'); const b=input(id);
  const a=await opening.submit(admin,b); await journals.reject(admin,a.journal.id,'Periksa bukti bank');
  assert.equal((await opening.status(admin,id)).blocked,false);
  const next=await opening.submit(admin,b); assert.notEqual(next.journal.id,a.journal.id);
  assert.equal((await journals.getJournal(a.journal.id)).status,'rejected');
});
test('piutang historis baru muncul setelah persetujuan, bisa dibayar dan tidak diamortisasi ulang',async()=>{
  const id=await newUnit('AR');
  const student=await piutang.createStudent(admin,{nim:'AWAL-001',nama:'Siswa Awal',unit_id:id});
  const b={...input(id),balances:[],receivables:[{student_id:student.id,amount:'300.000',jatuh_tempo:'2026-09-10'}],
    unrestricted:'300.000',restricted:'0'};
  const r=await opening.submit(admin,b);
  assert.equal((await piutang.listInvoices({unitId:id})).length,0);
  await journals.approve(admin,r.journal.id);
  const [invoice]=await piutang.listInvoices({unitId:id});
  assert.equal(invoice.sisa,30000000); assert.equal(invoice.deferred,0);
  assert.equal((await piutang.aging({unitId:id,asOf:'2026-10-01'})).totalOutstanding,30000000);
  assert.equal((await piutang.amortisasiPreview(2026,10,id)).count,0);
  const bank=(await db.prepare('INSERT INTO bank_accounts (nama,account_id,unit_id) VALUES (?,?,?)').run('Kas AR',accounts['1111'].id,id)).lastInsertRowid;
  await piutang.recordPayment(admin,{invoice_id:invoice.id,tanggal:'2026-10-02',nominal:'100.000',bank_account_id:bank});
  assert.equal((await piutang.getInvoice(invoice.id)).sisa,20000000);
  const balance=await db.prepare(`SELECT SUM(l.debit-l.kredit) n FROM journal_lines l JOIN journals j ON j.id=l.journal_id
    WHERE l.unit_id=? AND l.account_id=? AND j.status IN ('posted','reversed')`).get(id,accounts['1131'].id);
  assert.equal(balance.n,20000000);
  assert.equal((await financial.summary({unitId:id,from:'2026-01-01',to:'2026-12-31'})).pendapatan,0);
  await assert.rejects(()=>journals.reverse(admin,r.journal.id),/transaksi lain/);
});
test('piutang lintas unit, duplikat siswa, jatuh tempo masa depan dan akun agregat ditolak',async()=>{
  const id=await newUnit('INVALID');
  const student=await db.prepare("SELECT * FROM students WHERE nim='AWAL-001'").get();
  const b={...input(id),receivables:[{student_id:student.id,amount:'1',jatuh_tempo:'2026-09-01'}]};
  await assert.rejects(()=>opening.preview(admin,b),/unit ini/);
  await assert.rejects(()=>opening.preview(admin,{...input(id),balances:[{account_id:accounts['1131'].id,amount:'1'}]}),/Akun/);
  const own=await piutang.createStudent(admin,{nim:'AWAL-002',nama:'Siswa Lain',unit_id:id});
  const row={student_id:own.id,amount:'1',jatuh_tempo:'2026-10-02'};
  await assert.rejects(()=>opening.preview(admin,{...input(id),receivables:[row]}),/jatuh tempo/);
  row.jatuh_tempo='2026-09-01';
  await assert.rejects(()=>opening.preview(admin,{...input(id),receivables:[row,row]}),/duplikat/);
});
test('pembalikan pembuka tanpa transaksi lanjutan menonaktifkan tagihan awal',async()=>{
  const id=await newUnit('REV');
  const s=await piutang.createStudent(admin,{nim:'AWAL-003',nama:'Siswa Revisi',unit_id:id});
  const b={...input(id),balances:[],receivables:[{student_id:s.id,amount:'5.000',jatuh_tempo:'2026-09-01'}],unrestricted:'5.000',restricted:'0'};
  const r=await opening.submit(admin,b); await journals.approve(admin,r.journal.id);
  await journals.reverse(admin,r.journal.id);
  assert.equal((await piutang.listInvoices({unitId:id}))[0].status,'void');
});
test('format rupiah mempertahankan sen dan aset neto negatif didukung',async()=>{
  assert.equal(opening.money('1.250.000,25'),125000025);
  assert.equal(opening.money('-5.000,50',true),-500050);
  const id=await newUnit('DEF');
  const b={...input(id),balances:[{account_id:accounts['2110'].id,amount:'100'}],unrestricted:'-100',restricted:'0'};
  assert.equal((await opening.preview(admin,b)).balanced,true);
});
test('periode terkunci menolak saldo awal tanpa meninggalkan setup atau jurnal',async()=>{
  const id=await newUnit('CLOSED');
  await db.prepare("INSERT INTO periods (tahun,bulan,status) VALUES (2031,1,'closed')").run();
  await assert.rejects(()=>opening.submit(admin,{...input(id),tanggal:'2031-01-01'}),/terkunci/);
  assert.equal((await db.prepare('SELECT COUNT(*) n FROM opening_setups WHERE unit_id=?').get(id)).n,0);
});
test('gagal validasi siswa saat persetujuan me-rollback posting dan penerbitan tagihan',async()=>{
  const id=await newUnit('ATOMIC');
  const student=await piutang.createStudent(admin,{nim:'AWAL-004',nama:'Siswa Pindah',unit_id:id});
  const b={...input(id),balances:[],receivables:[{student_id:student.id,amount:'10',jatuh_tempo:'2026-09-01'}],unrestricted:'10',restricted:'0'};
  const r=await opening.submit(admin,b);
  await db.prepare("UPDATE students SET status='nonaktif' WHERE id=?").run(student.id);
  await assert.rejects(()=>journals.approve(admin,r.journal.id),/Siswa saldo awal/);
  assert.equal((await journals.getJournal(r.journal.id)).status,'pending');
  assert.equal((await piutang.listInvoices({unitId:id})).length,0);
});
