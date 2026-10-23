import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
const url = process.env.TEST_DATABASE_URL || 'postgres://sas:sas_local_password@127.0.0.1:5432/sas_test';
const testName = new URL(url).pathname;
if (!testName.endsWith('_test') || (process.env.DATABASE_URL && new URL(process.env.DATABASE_URL).pathname === testName)) {
  throw new Error('Tes membutuhkan database terpisah dengan nama berakhiran _test. DATABASE_URL aplikasi tidak boleh sama.');
}
const files = readdirSync('tests').filter(name => name.endsWith('.test.js')).map(name => `tests/${name}`);
const run = spawnSync(process.execPath, ['--test', '--test-concurrency=1', ...files], {
  stdio: 'inherit', env: { ...process.env, TEST_DATABASE_URL: url },
});
if (run.error) throw run.error;
process.exitCode = run.status ?? 1;
