# Verifikasi lokal SAS

Lingkungan: Termux Android ARM64, Node.js 24, PostgreSQL 18.6. Database aplikasi `sas`, database pengujian terpisah `sas_test`.

| Pemeriksaan | Hasil |
| --- | --- |
| `npm install` | Berhasil, tanpa kegagalan instalasi |
| `npm run db:init` | Migrasi dan seed pertama berhasil |
| Seed | 4 unit, 55 akun, 19 pengguna, 14 siswa, 27 tagihan, 85 jurnal |
| `npm test` | 92 tes lulus; tidak ada gagal/skipped (25 Oktober 2026) |
| Startup berulang | Data dan kredensial tersimpan tidak ditimpa |
| Login admin/operator melalui HTTP | Berhasil; cookie sesi dan `/api/auth/me` terverifikasi |
| `/`, `/login`, `/branding.js`, `/app.js` | HTTP 200, tidak mengandung branding instansi asal |
| `/api/config` | Nama aplikasi/yayasan/sekolah mengikuti environment; hanya tiga nilai publik |
| `/api/health` | HTTP 200 dan koneksi PostgreSQL berhasil |
| Proteksi konfigurasi produksi | Secret/sandi demo ditolak sebelum seed; data tetap tersimpan |
| Proteksi runner tes | Menolak database aplikasi sebagai target tes |
| `npm audit --omit=dev` | 0 kerentanan runtime |
| `docker compose config --quiet` | Valid dengan `.env` dan tanpa `.env` (`--env-file /dev/null`) |
| `npm run docs:manual` | Manual HTML SAS berhasil dirakit |
| `npm run docs:docx` | Manual Word SAS berhasil dirakit |
| Pemeriksaan sintaks Node | Seluruh JS/MJS pada src/public/scripts/tests lolos |
| Bootstrap `SEED_MODE=school` | Satu unit, tiga akun, master tanpa jurnal/siswa/tagihan demo |
| Panduan saldo awal | Validasi tanggal/nominal, D/K, saldo nol, otorisasi dan pengajuan ganda lulus |
| Piutang historis | Posting atomik, aging, cicilan, pembalikan dan tidak mengakui ulang pendapatan lulus |
| Interaksi formulir | Tiga tes HTTP/DOM melalui jsdom dan API/PostgreSQL nyata lulus |
| Halaman produk | Beranda publik, aplikasi terpisah, menu mobile, tab keyboard dan simulasi penerimaan/pengeluaran lulus tes HTTP/DOM |
| Unduhan sumber | ZIP berisi aplikasi/lisensi; tidak menyertakan env privat, database, sesi, Git atau node_modules |
| Atribusi SAS | Kredit bipi (jaddadeveloper), pesan kemanfaatan bersama, MIT dan sumber awal terverifikasi pada halaman publik/login serta halaman Tentang aplikasi |
| Demo hanya-baca | Login demo lama ditolak, seluruh mutasi HTTP demo 403, role PostgreSQL tanpa izin tulis, startup menolak role pemilik, dan UI menggunakan API/aset di prefix demo |
| Pembatasan login | IP mengikuti trust proxy Express; header X-Forwarded-For mentah tidak mengganti identitas limiter |

Panduan baru: [MULAI-PEMBUKUAN.md](MULAI-PEMBUKUAN.md). Saat pengembangan ini, contoh sekolah tanpa transaksi dijalankan terpisah pada `http://127.0.0.1:3001` dengan database `sas_school_preview`; database demo `sas` tetap berada pada port 3000. Ketersediaan kedua proses lokal mengikuti sesi Termux, bukan deployment publik.

Pada host Android, container Docker **tidak dijalankan** karena tidak tersedia daemon. Setelah push, workflow GitHub untuk snapshot `12807a8` berhasil menjalankan tes dan pemeriksaan Docker. Pada 24 Oktober 2026, deployment VPS Ubuntu 24.04 juga terverifikasi: container aplikasi non-root/read-only dan PostgreSQL 16 sehat, HTTPS/domain dan login admin lulus, serta backup PostgreSQL berhasil dipulihkan ke database sementara. Catatan lengkap: [operasional produksi](../deploy/PRODUKSI-SAS.md). Validasi rendering UI dengan browser nyata dan pembuatan PDF/screenshot baru belum dilakukan.

Audit penuh masih memiliki satu temuan high pada `image-size` transitif dari `html-to-docx` (devDependency untuk dokumen). Dependensi ini tidak masuk image produksi (`npm ci --omit=dev`).

Dokumen ini mencatat pemeriksaan adaptasi, bukan jaminan kesiapan produksi untuk seluruh kebijakan sekolah. Data contoh, master rekening, periode operasional dan kredensial harus disesuaikan sebelum transaksi riil.
