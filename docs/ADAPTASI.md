# Catatan adaptasi SAS

Basis: `https://github.com/galihsidik86/sikeu-tazkia`, commit `c9d14ea3ea5556a7b8e047601bf03ddac4f47405`, lisensi MIT. Hak cipta asli pada LICENSE dipertahankan. Riwayat Git clone dihapus sesuai permintaan dan diinisialisasi ulang pada `main`.

## Struktur

| Lokasi | Tanggung jawab |
| --- | --- |
| `server.js` | Express, sesi PostgreSQL, API, health dan frontend |
| `src/config.js` | Identitas instansi, koneksi DB, cookie dan server |
| `src/auth.js`, `src/sessionStore.js` | Hash sandi, peran dan penyimpanan sesi |
| `src/routes/` | Auth, master, jurnal, kas/bank, piutang, pajak, anggaran, laporan dan admin |
| `src/services/` | Aturan akuntansi dan transaksi bisnis |
| `src/db/schema.sql` | Skema PostgreSQL multi-unit; nilai uang BIGINT sen |
| `src/db/migrate.js`, `seed.js`, `initialize.js` | Migrasi, data contoh, startup pertama |
| `public/` | SPA HTML/vanilla JS, login, CSS dan identitas publik |
| `tests/` | Aturan akuntansi dan integrasi SAS |
| `deploy/`, `.github/workflows/` | Deployment opsional ke infrastruktur pemilik fork |

## Inventaris identitas upstream

Identitas khusus ditemukan pada `.env.production.example`, issue templates, workflows, CONTRIBUTING, Dockerfile, README, LICENSE, deploy/README, docker-compose, docs/README, manual HTML beserta bagian pendahuluan/lampiran, package.json/lock, public/app.js/index.html/login.html, skrip pembuat manual/screenshot, server.js, src/db/clean.js/schema.sql/seed.js, dan tests/critical.test.js/features.test.js. Manual PDF/DOCX serta gambar screenshot juga menyertakan tampilan lama.

Kode, konfigurasi, seed, tes, dokumentasi teks dan pembuat manual telah digeneralisasi. Referensi upstream tersisa hanya untuk atribusi pada README, dokumen ini, serta pemberitahuan hak cipta wajib di LICENSE. PDF/DOCX dan screenshot lama dikeluarkan dari distribusi aktif agar tidak menampilkan identitas instansi asal; pada workspace adaptasi salinannya disimpan di `../sas-upstream-artifacts-c9d14ea/`. Manual HTML dibangun ulang dengan teks SAS; gambar baru dapat dibuat melalui `npm run docs:screenshots` pada lingkungan yang memiliki browser Playwright.

## Batas kompatibilitas

Tabel `students` serta kolom `nim`, `prodi`, `angkatan` tetap dipertahankan. Antarmuka menggunakan siswa, NIS/NISN, kelas/jurusan, dan angkatan. Parser CSV menerima `nis`, `nisn`, `kelas`, `jurusan`, serta nama kolom lama. Tagihan masih berbasis semester dengan tenor bulanan; ini bukan modul kurikulum atau integrasi Dapodik/ARKAS.

Klasifikasi aset neto dan aturan double-entry dipertahankan. COA sekolah menambah 1124 (BOS), 4210 (uang pangkal/gedung), 4310 (pendapatan BOS dengan pembatasan), 5410 (buku/bahan ajar), dan 5420 (kegiatan pembelajaran). Data awal adalah contoh kebijakan, bukan penetapan kebijakan sekolah. Tarif pajak bawaan perlu diperiksa dan disesuaikan oleh pengelola.
