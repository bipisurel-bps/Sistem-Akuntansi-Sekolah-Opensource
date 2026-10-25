'use strict';
process.env.DATABASE_URL=process.env.TEST_DATABASE_URL;
process.env.NODE_ENV='development';
process.env.APP_DEMO_MODE='false';
process.env.APP_BASE_PATH='';
process.env.SEED_MODE='demo';
process.env.SEED_PASSWORD='sasDemo123!';
process.env.SEED_EMAIL_DOMAIN='sekolah.example';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {spawn,spawnSync}=require('node:child_process'),{once}=require('node:events'),crypto=require('node:crypto'),net=require('node:net');
const {Client}=require('pg'),{JSDOM,VirtualConsole}=require('jsdom');
const db=require('../src/db'),migrate=require('../src/db/migrate'),seed=require('../src/db/seed'),auth=require('../src/auth');
const {RateLimiter}=require('../src/middleware/rateLimiter');
const servers=[],windows=[];
const reader='sas_demo_test_'+crypto.randomBytes(5).toString('hex');
const password=crypto.randomBytes(32).toString('hex');
let primary,demo,readerUrl,readerCreated=false;
async function server(env={}){
 const socket=net.createServer();socket.listen(0,'127.0.0.1');await once(socket,'listening');const port=socket.address().port;await new Promise(resolve=>socket.close(resolve));
 const proc=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:String(port),HOST:'127.0.0.1',COOKIE_SECURE:'false',...env},stdio:['ignore','pipe','pipe']});servers.push(proc);
 await new Promise((resolve,reject)=>{let errors='';const timer=setTimeout(()=>reject(new Error('Server tes demo timeout')),10000);proc.stderr.on('data',x=>{errors+=x;});proc.stdout.on('data',x=>{if(String(x).includes('berjalan di')){clearTimeout(timer);resolve();}});proc.once('exit',()=>{clearTimeout(timer);reject(new Error(errors));});proc.once('error',reject);});
 return 'http://127.0.0.1:'+port;
}
test.before(async()=>{
 await migrate({fresh:true});await seed();
 await db.query(`INSERT INTO users(nama,email,password_hash,role,unit_id,aktif) VALUES($1,$2,$3,'kepala_unit',NULL,1)`,['Pengamat Fiktif',auth.DEMO_EMAIL,auth.hashPassword(crypto.randomBytes(16).toString('hex'))]);
 await db.query(`INSERT INTO users(nama,email,password_hash,role,unit_id,aktif) VALUES($1,$2,$3,'bendahara',NULL,1)`,['Legacy Demo','demo@sistemakuntansisekolah.web.id',auth.hashPassword('FormerDemo-TestOnly!')]);
 const sql=(await db.query("SELECT format('CREATE ROLE "+reader+" LOGIN PASSWORD %L', $1::text) AS sql",[password])).rows[0].sql;
 await db.exec(sql);readerCreated=true;
 await db.exec(`ALTER ROLE ${reader} SET default_transaction_read_only=on; REVOKE CREATE ON SCHEMA public FROM PUBLIC; GRANT USAGE ON SCHEMA public TO ${reader}; GRANT SELECT ON ALL TABLES IN SCHEMA public TO ${reader};`);
 const url=new URL(process.env.TEST_DATABASE_URL);url.username=reader;url.password=password;readerUrl=url.toString();
 primary=await server();demo=await server({APP_DEMO_MODE:'true',APP_BASE_PATH:'/demo',DATABASE_URL:readerUrl});
});
test.after(async()=>{
 for(const w of windows)w.close();
 for(const proc of servers)if(proc.exitCode===null){const done=once(proc,'exit');proc.kill();await done;}
 if(readerCreated)await db.exec(`DROP OWNED BY ${reader}; DROP ROLE IF EXISTS ${reader};`);await db.close();
});
test('jalur demo lama tidak membuat pengguna/sesi produksi dan akun legacy tidak dapat login biasa',async()=>{
 const before=(await db.query('SELECT count(*) n FROM users')).rows[0].n;
 assert.equal((await fetch(primary+'/api/auth/demo-login',{method:'POST'})).status,410);
 const response=await fetch(primary+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'demo@sistemakuntansisekolah.web.id',password:'FormerDemo-TestOnly!'})});
 assert.equal(response.status,401);assert.equal(await auth.getUser((await db.query("SELECT id FROM users WHERE email='demo@sistemakuntansisekolah.web.id'")).rows[0].id),null);
 assert.equal((await db.query('SELECT count(*) n FROM users')).rows[0].n,before);
 assert.equal((await fetch(primary+'/api/reports/executive')).status,401);
});
test('demo membaca data fiktif tanpa cookie sesi; aset dan API tidak keluar dari base path',async()=>{
 const me=await fetch(demo+'/demo/api/auth/me');assert.equal(me.status,200);assert.equal(me.headers.get('set-cookie'),null);
 const data=await me.json();assert.equal(data.isDemo,true);assert.equal(data.user.role,'kepala_unit');
 assert.equal((await fetch(demo+'/api/auth/me')).status,404);
 const app=await(await fetch(demo+'/demo/app')).text();assert.match(app,/src="\/demo\/runtime.js"/);assert.match(app,/src="\/demo\/app.js"/);
 for(const path of ['/demo/runtime.js','/demo/style.css','/demo/api/reports/executive','/demo/api/piutang/students'])assert.equal((await fetch(demo+path)).status,200,path);
 assert.equal((await(await fetch(demo+'/demo/api/piutang/students')).json()).length,14);
 assert.match((await fetch(demo+'/demo/app')).headers.get('x-robots-tag'),/noindex/);
});
test('semua metode mutasi ditolak pada demo termasuk login, sandi, master dan jurnal',async()=>{
 const before=(await db.query('SELECT count(*) n FROM journals')).rows[0].n;
 for(const [method,path] of [['POST','/api/journals'],['PUT','/api/master/units/1'],['DELETE','/api/journals/1'],['PATCH','/api/master/units/1'],['POST','/api/auth/login'],['POST','/api/auth/demo-login'],['POST','/api/auth/change-password']]){
  const response=await fetch(demo+'/demo'+path,{method,headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(response.status,403,method+' '+path);
 }
 assert.equal((await db.query('SELECT count(*) n FROM journals')).rows[0].n,before);
 assert.equal((await fetch(demo+'/demo/api/admin/backups')).status,403);
});
test('role PostgreSQL demo tidak dapat menulis meskipun flag read-only koneksi dimatikan',async()=>{
 const client=new Client({connectionString:readerUrl});await client.connect();
 try{await assert.rejects(()=>client.query("UPDATE users SET nama='Tidak boleh' WHERE false"),e=>['25006','42501'].includes(e.code));
  await client.query('SET default_transaction_read_only=off');
  await assert.rejects(()=>client.query("UPDATE users SET nama='Tidak boleh' WHERE false"),e=>e.code==='42501');
 }finally{await client.end();}
});
test('startup demo menolak koneksi database pemilik yang memiliki hak tulis',()=>{
 const run=spawnSync(process.execPath,['server.js'],{env:{...process.env,APP_DEMO_MODE:'true',APP_BASE_PATH:'/demo'},encoding:'utf8',timeout:10000});
 assert.notEqual(run.status,0);assert.match(run.stderr,/Demo ditolak/);
});
test('initializer demo menolak database non-demo sebelum migrasi atau seed',async()=>{
 const before=(await db.query('SELECT count(*) n FROM journals')).rows[0].n;
 await assert.rejects(()=>require('../src/db/initializeDemo')(),/hanya boleh mengakses sas_demo/);
 assert.equal((await db.query('SELECT count(*) n FROM journals')).rows[0].n,before);
});
test('limiter memakai IP tepercaya Express, bukan header spoof, dan reset berhasil',()=>{
 const limiter=new RateLimiter({max:2,windowMs:60000});const req={ip:'192.0.2.1',headers:{'x-forwarded-for':'198.51.100.1'}};
 limiter.recordFailure(req);req.headers['x-forwarded-for']='198.51.100.2';limiter.recordFailure(req);
 let status,passed=false;const res={setHeader(){},status(n){status=n;return this;},json(){return this;}};
 req.headers['x-forwarded-for']='198.51.100.3';limiter.middleware()(req,res,()=>{passed=true;});assert.equal(status,429);assert.equal(passed,false);
 limiter.reset(req);limiter.middleware()(req,res,()=>{passed=true;});assert.equal(passed,true);
});
test('antarmuka demo menampilkan penanda fiktif/hanya-baca, dashboard, dan menyembunyikan administrasi',async()=>{
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM(await(await fetch(demo+'/demo/app')).text(),{url:demo+'/demo/app',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});windows.push(dom.window);
 dom.window.fetch=(path,options)=>{assert.ok(path.startsWith('/demo/'),path);return fetch(new URL(path,demo),options);};
 const context=dom.getInternalVMContext();vm.runInContext(await(await fetch(demo+'/demo/runtime.js')).text(),context);
 for(const name of ['branding.js','opening.js','app.js'])vm.runInContext(fs.readFileSync('public/'+name,'utf8'),context,{filename:name});
 await new Promise((resolve,reject)=>{const end=Date.now()+10000;const timer=setInterval(()=>{const d=dom.window.document;if(d.querySelector('.demo-notice')&&d.querySelector('#main')?.textContent.includes('Dashboard')){clearInterval(timer);resolve();}else if(Date.now()>end){clearInterval(timer);reject(new Error(d.body.textContent.slice(-800)));}},25);});
 const d=dom.window.document;assert.match(d.querySelector('.demo-notice').textContent,/data fiktif/);assert.equal(d.querySelector('#pwdBtn'),null);assert.equal(d.querySelector('[data-nav="admin"]'),null);assert.equal(d.querySelector('[data-nav="master"]'),null);assert.equal(d.querySelector('[data-nav="mulai"]'),null);assert.deepEqual(errors,[]);
});
test('kontak hanya email, klaim cloud belum tersedia ditandai rencana, dan tidak ada password demo di sumber',()=>{
 const html=fs.readFileSync('public/index.html','utf8');assert.match(html,/mailto:jaddadeveloper@gmail\.com/);assert.doesNotMatch(html,/wa\.me|whatsapp|support@sistemakuntansisekolah/i);assert.match(html,/Rancangan isolasi data/);assert.doesNotMatch(html,/Sangat aman|Backup otomatis harian ke cloud/);
 assert.doesNotMatch(fs.readFileSync('src/auth.js','utf8'),/hashPassword\('/);
});
