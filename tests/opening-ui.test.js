'use strict';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.SEED_MODE = 'school';
process.env.NODE_ENV = 'development';
process.env.SEED_PASSWORD = 'sasDemo123!';
process.env.SEED_EMAIL_DOMAIN = 'sekolah.example';
const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('node:fs');
const vm = require('node:vm');
const net = require('node:net');
const { once } = require('node:events');
const { spawn } = require('node:child_process');
const db = require('../src/db');
const migrate = require('../src/db/migrate');
const initialize = require('../src/db/initialize');
let server, base, cookie, zeroUnit, school, cash;
const windows=[];
test.before(async()=>{
  await migrate({fresh:true}); await initialize();
  school=await db.prepare('SELECT * FROM units LIMIT 1').get();
  zeroUnit=(await db.prepare("INSERT INTO units (kode,nama) VALUES ('UIZERO','Sekolah Nol')").run()).lastInsertRowid;
  cash=await db.prepare("SELECT * FROM accounts WHERE kode='1111'").get();
  const socket=net.createServer(); socket.listen(0,'127.0.0.1'); await once(socket,'listening');
  const port=socket.address().port; await new Promise(resolve=>socket.close(resolve)); base=`http://127.0.0.1:${port}`;
  server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:String(port),HOST:'127.0.0.1',COOKIE_SECURE:'false'},stdio:['ignore','pipe','pipe']});
  await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('Server belum siap')),10000);
    server.stdout.on('data',data=>{if(data.toString().includes('berjalan di')){clearTimeout(timer);resolve();}});
    server.once('error',reject);
  });
  const login=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'admin1@sekolah.example',password:'sasDemo123!'})});
  assert.equal(login.status,200); cookie=login.headers.get('set-cookie').split(';')[0];
});
test.after(async()=>{
  for(const w of windows)w.close();
  if(server&&server.exitCode===null){const done=once(server,'exit');server.kill();await done;}
  await db.close();
});
async function browser(hash='') {
  const errors=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errors.push(e.message));
  const dom=new JSDOM(await (await fetch(base+'/app')).text(),{url:base+'/app'+hash,runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
  windows.push(dom.window);
  dom.window.fetch=(url,opts={})=>fetch(new URL(url,base),{...opts,headers:{...opts.headers,Cookie:cookie}});
  const context=dom.getInternalVMContext();
  for(const file of ['branding.js','opening.js','app.js'])vm.runInContext(fs.readFileSync('public/'+file,'utf8'),context,{filename:file});
  return {w:dom.window, errors};
}
function until(w,predicate){
  return new Promise((resolve,reject)=>{
    const observer=new w.MutationObserver(check);
    const timer=setTimeout(()=>{observer.disconnect();reject(new Error('UI timeout: '+w.document.body.textContent.slice(-600)));},10000);
    function check(){if(predicate()){clearTimeout(timer);observer.disconnect();resolve();}}
    observer.observe(w.document,{subtree:true,childList:true,attributes:true,characterData:true});check();
  });
}
function fill(w,selector,value){const el=w.document.querySelector(selector);assert.ok(el,selector);el.value=value;el.dispatchEvent(new w.Event('input',{bubbles:true}));}
function click(w,selector){const el=w.document.querySelector(selector);assert.ok(el,selector);el.click();}
test('API saldo awal membutuhkan autentikasi',async()=>{
  assert.equal((await fetch(base+'/api/opening?unit_id='+school.id)).status,401);
});
test('atribusi aplikasi dan halaman Tentang mempertahankan kredit pengembang awal serta MIT',async()=>{
  const {w,errors}=await browser('#/tentang'),q=s=>w.document.querySelector(s);
  await until(w,()=>q('#about-developer'));
  for(const el of [q('.app-credit'),q('.about-sas')]){
    assert.match(el.textContent,/bipi \(jaddadeveloper\)/);
    assert.match(el.textContent,/kemanfaatan bersama seluas-luasnya/);
  }
  assert.match(q('.about-sas').textContent,/Lisensi MIT/);
  assert.equal(q('.about-sas a').href,'https://github.com/galihsidik86/sikeu-tazkia');
  assert.equal(q('.app-credit a').getAttribute('href'),'#/tentang');
  assert.deepEqual(errors,[]);
});
test('UI mengarahkan sekolah kosong ke panduan dan mengajukan jurnal seimbang melalui API sebenarnya',async()=>{
  const {w,errors}=await browser(); const q=s=>w.document.querySelector(s);
  await until(w,()=>q('#openingNext'));
  assert.equal(w.location.hash,'#/mulai');
  fill(w,'#openingDate','2026-10-01'); click(w,'#openingNext');
  await until(w,()=>q('#openingReview'));
  fill(w,'#openingAcc'+cash.id,'1.000.000');
  await q('#openingCalculate').onclick();
  assert.equal(q('#openingUnrestricted').value,'1.000.000,00');
  click(w,'#openingReview'); await until(w,()=>q('#openingSubmit'));
  assert.equal(q('#openingSubmit').disabled,true);
  assert.match(q('#openingContent').textContent,/Seimbang/);
  q('#openingConfirm').checked=true;q('#openingConfirm').dispatchEvent(new w.Event('change',{bubbles:true}));
  assert.equal(q('#openingSubmit').disabled,false);
  click(w,'#openingSubmit'); await until(w,()=>q('#openingContent')===null && q('#openingBody')?.textContent.includes('Pengaturan awal sudah tersimpan'));
  assert.match(q('#openingBody').textContent,/Menunggu/);
  const j=await db.prepare("SELECT * FROM journals WHERE unit_id=? AND sumber='opening'").get(school.id);
  assert.equal(j.status,'pending'); assert.deepEqual(errors,[]);
});
test('UI mempertahankan input saat kembali, menampilkan selisih, dan mendukung saldo nol',async()=>{
  const {w,errors}=await browser('#/mulai');const q=s=>w.document.querySelector(s);
  await until(w,()=>q('#openingUnit'));
  q('#openingUnit').value=String(zeroUnit); q('#openingUnit').dispatchEvent(new w.Event('change',{bubbles:true}));
  await until(w,()=>q('#openingNext'));
  click(w,'#openingNext'); await until(w,()=>q('#openingReview'));
  fill(w,'#openingAcc'+cash.id,'100');fill(w,'#openingUnrestricted','0');
  click(w,'#openingReview');await until(w,()=>q('#openingSubmit'));
  assert.match(q('#openingContent').textContent,/Belum seimbang/);
  q('#openingConfirm').checked=true;q('#openingConfirm').dispatchEvent(new w.Event('change',{bubbles:true}));
  assert.equal(q('#openingSubmit').disabled,true);
  click(w,'#openingEdit');assert.equal(q('#openingAcc'+cash.id).value,'100');
  fill(w,'#openingAcc'+cash.id,'0');click(w,'#openingReview');await until(w,()=>q('#openingSubmit'));
  assert.equal(q('#openingSubmit').textContent,'Mulai tanpa saldo');
  q('#openingConfirm').checked=true;q('#openingConfirm').dispatchEvent(new w.Event('change',{bubbles:true}));
  click(w,'#openingSubmit');await until(w,()=>q('#openingBody')?.textContent.includes('Sekolah mulai tanpa saldo'));
  assert.equal((await db.prepare('SELECT COUNT(*) n FROM journals WHERE unit_id=?').get(zeroUnit)).n,0);
  assert.deepEqual(errors,[]);
});
