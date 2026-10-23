'use strict';
// Paket sumber dibuat pada build/startup, tidak menerima path dari HTTP.
const fs = require('fs');
const path = require('path');
const { zipSync } = require('fflate');
const root = path.resolve(__dirname, '..');
const roots = ['src','public','scripts','tests','docs','deploy','.github'];
const files = ['package.json','package-lock.json','server.js','Dockerfile','docker-compose.yml',
  '.dockerignore','.gitignore','.gitattributes','.env.example','.env.production.example','README.md','LICENSE','CONTRIBUTING.md'];
function buildRelease() {
  const entries = {}; let size = 0;
  function add(relative) {
    const absolute = path.join(root, relative);
    if (!fs.existsSync(absolute)) return;
    const stat = fs.lstatSync(absolute);
    if (stat.isSymbolicLink()) return;
    if (stat.isDirectory()) {
      for (const name of fs.readdirSync(absolute)) {
        if (name.startsWith('.') || ['node_modules','data','backups','release'].includes(name)) continue;
        add(path.join(relative, name));
      }
    } else if (stat.isFile()) {
      // Contoh env hanyalah dua file root yang diaudit, bukan file rahasia di subfolder.
      if (path.basename(relative).startsWith('.env') && !['.env.example','.env.production.example'].includes(relative)) return;
      if (/\.(log|dump|db|pem|key|zip)$/i.test(relative)) return;
      size += stat.size;
      if (size > 32 * 1024 * 1024) throw new Error('Paket sumber melewati batas 32 MB.');
      entries['sas-opensource/' + relative.split(path.sep).join('/')] = fs.readFileSync(absolute);
    }
  }
  for (const item of [...roots, ...files]) add(item);
  fs.mkdirSync(path.join(root,'release'),{recursive:true});
  const output = path.join(root,'release','sas-opensource.zip');
  const temp = output + '.tmp';
  fs.writeFileSync(temp, zipSync(entries,{level:6})); fs.renameSync(temp,output);
  console.log('✓ Paket kode SAS siap di /download/sas-opensource.zip');
  return output;
}
if (require.main === module) buildRelease();
module.exports = buildRelease;
