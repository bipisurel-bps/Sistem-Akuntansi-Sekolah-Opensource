'use strict';
// Hanya untuk cluster/database demo terpisah. Tidak menyediakan reset database.
const crypto=require('node:crypto');
const db=require('./index');
const initialize=require('./initialize');
const auth=require('../auth');
async function initializeDemo(){
  const name=(await db.query('SELECT current_database() AS name')).rows[0].name;
  if(!/^sas_demo(?:_test)?$/.test(name))throw new Error('Initializer demo hanya boleh mengakses sas_demo atau sas_demo_test.');
  const password=process.env.DEMO_READER_PASSWORD;
  if(!password||!/^[a-f0-9]{64}$/.test(password))throw new Error('DEMO_READER_PASSWORD wajib 64 karakter hex acak.');
  if(process.env.SEED_MODE!=='demo'||process.env.APP_DEMO_MODE==='true')throw new Error('Initializer perlu mode seed demo dan role pemilik, bukan runtime demo.');
  await initialize();
  await db.tx(async()=>{
    const unit=(await db.query('SELECT id FROM units ORDER BY id LIMIT 1')).rows[0];
    await db.query(`INSERT INTO users(nama,email,password_hash,role,unit_id,aktif)
      VALUES($1,$2,$3,'kepala_unit',$4,1) ON CONFLICT(email) DO NOTHING`,[
      'Pengamat Demo — Data Fiktif',auth.DEMO_EMAIL,auth.hashPassword(crypto.randomBytes(32).toString('hex')),unit.id]);
    const exists=(await db.query("SELECT 1 FROM pg_roles WHERE rolname='sas_demo_reader'")).rowCount;
    const sql=(await db.query(`SELECT format('${exists?'ALTER':'CREATE'} ROLE sas_demo_reader LOGIN PASSWORD %L', $1::text) AS sql`,[password])).rows[0].sql;
    await db.exec(sql);
    await db.exec(`ALTER ROLE sas_demo_reader NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
      ALTER ROLE sas_demo_reader SET default_transaction_read_only=on;
      REVOKE CREATE ON SCHEMA public FROM PUBLIC;
      REVOKE ALL ON ALL TABLES IN SCHEMA public FROM sas_demo_reader;
      REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM sas_demo_reader;
      GRANT USAGE ON SCHEMA public TO sas_demo_reader;
      GRANT SELECT ON ALL TABLES IN SCHEMA public TO sas_demo_reader;`);
  });
  console.log('Demo terpisah siap: data fiktif, pengamat kepala_unit, runtime PostgreSQL SELECT saja.');
}
if(require.main===module)initializeDemo().then(()=>db.close()).catch(async e=>{console.error(e.message);await db.close();process.exitCode=1;});
module.exports=initializeDemo;
