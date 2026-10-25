'use strict';
const db=require('../db');
const auth=require('../auth');
async function verifyDemoSafety(){
  const result=await db.query(`SELECT current_user AS role, current_setting('default_transaction_read_only') AS read_only,
    (SELECT rolsuper FROM pg_roles WHERE rolname=current_user) AS superuser,
    has_schema_privilege(current_user,'public','CREATE') AS can_create,
    EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND
      (has_table_privilege(current_user,quote_ident(schemaname)||'.'||quote_ident(tablename),'INSERT') OR
       has_table_privilege(current_user,quote_ident(schemaname)||'.'||quote_ident(tablename),'UPDATE') OR
       has_table_privilege(current_user,quote_ident(schemaname)||'.'||quote_ident(tablename),'DELETE') OR
       has_table_privilege(current_user,quote_ident(schemaname)||'.'||quote_ident(tablename),'TRUNCATE'))) AS can_write`);
  const row=result.rows[0];
  if(row.read_only!=='on'||row.superuser||row.can_create||row.can_write)throw new Error('Demo ditolak: gunakan role PostgreSQL khusus dengan SELECT saja dan default_transaction_read_only=on.');
  await auth.getDemoUser();
}
module.exports=verifyDemoSafety;
