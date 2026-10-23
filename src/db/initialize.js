'use strict';
const db = require('./index');
const migrate = require('./migrate');
const seed = require('./seed');

async function initialize() {
  await db.tx(async () => {
    // Serialisasi startup replica pada database yang sama.
    await db.query('SELECT pg_advisory_xact_lock(7352026)', []);
    await migrate();
    const row = await db.prepare('SELECT COUNT(*) AS n FROM users').get();
    if (row.n > 0) { console.log('✓ Database terisi; seed dilewati.'); return; }
    const existing = await db.prepare('SELECT (SELECT COUNT(*) FROM units) + (SELECT COUNT(*) FROM accounts) + (SELECT COUNT(*) FROM journals) AS n').get();
    if (existing.n > 0) throw new Error('Database berisi data tanpa pengguna. Inisialisasi dibatalkan; periksa administrator.');
    await seed();
  });
}
if (require.main === module) {
  initialize().then(() => db.close()).catch(async error => {
    console.error(error.message); await db.close(); process.exitCode = 1;
  });
}
module.exports = initialize;
