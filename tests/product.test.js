'use strict';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.NODE_ENV = 'development';
const test=require('node:test'), assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require('jsdom');
const {unzipSync,strFromU8}=require('fflate');
const fs=require('node:fs'),vm=require('node:vm'),net=require('node:net');
const {once}=require('node:events');
const {spawn}=require('node:child_process');
const db=require('../src/db'),migrate=require('../src/db/migrate');
let server,base,html;const windows=[];
test.before(async()=>{
  await migrate({fresh:true});require('../src/release')();
  const socket=net.createServer();socket.listen(0,'127.0.0.1');await once(socket,'listening');
  const port=socket.address().port;await new Promise(resolve=>socket.close(resolve));base=`http://127.0.0.1:${port}`;
  server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:String(port),HOST:'127.0.0.1',SUPPORT_EMAIL:'aide@sekolah.example'},stdio:['ignore','pipe','pipe']});
  await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('Server belum siap')),10000);
    server.stdout.on('data',data=>{if(data.toString().includes('berjalan di')){clearTimeout(timer);resolve();}});server.once('error',reject);
  });
  html=await(await fetch(base+'/')).text();
});
test.after(async()=>{for(const w of windows)w.close();if(server&&server.exitCode===null){const done=once(server,'exit');server.kill();await done;}await db.close();});
function browser(){
  const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
  const dom=new JSDOM(html,{url:base+'/',runScripts:'outside-only',virtualConsole:vc});windows.push(dom.window);
  const requests=[];dom.window.fetch=(url,opts={})=>{requests.push({url,method:opts.method||'GET'});return fetch(new URL(url,base),opts);};
  vm.runInContext(fs.readFileSync('public/product.js','utf8'),dom.getInternalVMContext());
  return {w:dom.window,errors,requests};
}
function submit(w,amount,kind='receipt'){
  const d=w.document;d.querySelector('#demo-amount').value=amount;d.querySelector('#demo-kind').value=kind;
  d.querySelector('#demo-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
}
test('beranda produk publik terpisah dari ruang kerja dan login',async()=>{
  assert.match(html,/Pembukuan rapi/);assert.match(html,/data-open-demo/);assert.doesNotMatch(html,/src="\/app.js"/);
  for(const url of ['/app','/login','/product.css','/product.js','/sas-mark.svg'])assert.equal((await fetch(base+url)).status,200,url);
  const app=await(await fetch(base+'/app')).text();assert.match(app,/src="\/app.js"/);
  const login=await(await fetch(base+'/login')).text();assert.match(login,/location.href = '\/app'/);
  for(const page of [html,login]){
    assert.match(page,/bipi \(jaddadeveloper\)/);
    assert.match(page,/kemanfaatan bersama seluas-luasnya/);
    assert.match(page,/github\.com\/galihsidik86\/sikeu-tazkia/);
    assert.match(page,/Lisensi MIT/);
  }
  assert.equal((await fetch(base+'/halaman-tidak-ada')).status,404);
});
test('navigasi mobile dan tab contoh dapat digunakan dengan keyboard',()=>{
  const {w,errors}=browser(),d=w.document;
  d.querySelector('.menu-toggle').click();assert.equal(d.querySelector('.menu-toggle').getAttribute('aria-expanded'),'true');
  d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape'}));assert.equal(d.querySelector('.menu-toggle').getAttribute('aria-expanded'),'false');
  d.querySelector('#tab-spp').click();assert.equal(d.querySelector('#preview-value').textContent,'Rp150.000');
  d.querySelector('#tab-spp').dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
  assert.equal(d.querySelector('#tab-laporan').getAttribute('aria-selected'),'true');assert.equal(d.activeElement.id,'tab-laporan');
  assert.deepEqual(errors,[]);
});
test('demo membentuk jurnal contoh penerimaan/pengeluaran tanpa menulis ke server',()=>{
  const {w,requests,errors}=browser(),d=w.document;
  d.querySelector('[data-open-demo]').click();assert.ok(d.querySelector('#demo-dialog').hasAttribute('open'));
  submit(w,'1.250.000,50');assert.equal(d.querySelector('#demo-result').hidden,false);
  assert.match(d.querySelector('#demo-result').textContent,/Sumbangan tidak terikat/);
  assert.match(d.querySelector('#demo-result').textContent,/1\.250\.000,50/);
  submit(w,'500.000','expense');assert.match(d.querySelector('#demo-result').textContent,/Beban operasional sekolah/);
  assert.equal(requests.some(r=>r.method!=='GET'),false);
  d.querySelector('#demo-reset').click();assert.equal(d.querySelector('#demo-result').hidden,true);
  assert.deepEqual(errors,[]);
});
test('demo menolak input rusak, negatif dan berlebihan tanpa merender HTML pengguna',()=>{
  const {w}=browser(),d=w.document;
  submit(w,'500.000');assert.equal(d.querySelector('#demo-result').hidden,false);
  for(const amount of ['abc','-500','0','1e9','9999999999999999','<img src=x onerror=alert(1)>']){
    submit(w,amount);assert.equal(d.querySelector('#demo-error').hidden,false);assert.equal(d.querySelector('#demo-result').hidden,true);
  }
  assert.equal(d.querySelector('#demo-result img'),null);
});
test('tautan internal dan nama kontrol halaman produk memiliki target yang nyata',()=>{
  const d=new JSDOM(html).window.document;
  for(const a of d.querySelectorAll('a[href^="#"]'))assert.ok(d.getElementById(a.getAttribute('href').slice(1)));
  assert.equal(d.querySelectorAll('h1').length,1);
  for(const button of d.querySelectorAll('button'))assert.ok(button.textContent.trim()||button.getAttribute('aria-label'));
  assert.match(d.querySelector('#pilihan').textContent,/Pendaftaran banyak sekolah belum dibuka/);
});
test('paket ZIP memuat kode dan lisensi, tanpa env privat, data sekolah, sesi, git atau node_modules',async()=>{
  const response=await fetch(base+'/download/sas-opensource.zip');assert.equal(response.status,200);
  assert.match(response.headers.get('content-disposition'),/attachment/);
  const files=unzipSync(new Uint8Array(await response.arrayBuffer()));
  for(const f of ['server.js','package.json','package-lock.json','Dockerfile','docker-compose.yml','LICENSE','.env.example','.env.production.example','public/index.html','public/app.html','src/release.js'])assert.ok(files['sas-opensource/'+f],f);
  assert.match(strFromU8(files['sas-opensource/LICENSE']),/MIT License/);
  for(const name of Object.keys(files))assert.doesNotMatch(name,/\/(?:\.git|node_modules|data|release|backups)\/|\/\.env$/);
  assert.equal((await fetch(base+'/download/panduan-instalasi.md')).status,200);
});
