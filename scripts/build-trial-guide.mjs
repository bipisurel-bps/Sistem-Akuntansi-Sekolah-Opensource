// Sumber tunggal HTML -> dokumen Word. Tidak memerlukan browser atau database.
import HTMLtoDOCX from 'html-to-docx';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { unzipSync, strFromU8 } from 'fflate';

const source = new URL('../docs/PANDUAN-UJI-COBA.html', import.meta.url);
const target = new URL('../docs/Panduan-Uji-Coba-SAS.docx', import.meta.url);
const html = await readFile(source, 'utf8');
const buffer = await HTMLtoDOCX(html, null, {
  title: 'Panduan Uji Coba Sistem Akuntansi Sekolah (SAS)',
  creator: 'bipi (jaddadeveloper)',
  subject: 'Demo hanya-baca dan praktik transaksi pada instalasi percobaan',
  lang: 'id-ID',
  font: 'Arial', fontSize: 22,
  margins: { top: 1134, right: 1000, bottom: 1134, left: 1000 },
  footer: true, pageNumber: true,
  table: { row: { cantSplit: true } },
});
const files = unzipSync(new Uint8Array(buffer));
const xml = strFromU8(files['word/document.xml']);
for (const term of ['Jalur A', 'Jalur B', '10.900.000', 'jaddadeveloper@gmail.com', 'Lembar hasil uji coba']) {
  if (!xml.includes(term)) throw new Error('Konten DOCX tidak lengkap: ' + term);
}
if (!files['[Content_Types].xml'] || !files['word/styles.xml']) throw new Error('Struktur DOCX tidak lengkap.');
await writeFile(target, buffer);
console.log(`Panduan Word siap: ${fileURLToPath(target)} (${Math.round(buffer.length / 1024)} KB)`);
