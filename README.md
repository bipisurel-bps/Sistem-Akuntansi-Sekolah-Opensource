# Sistem Akuntansi Sekolah (SAS) Open Source

Sistem keuangan dan akuntansi multi-unit untuk sekolah, madrasah, dan pesantren (Double-entry & ISAK 35). Dibangun dengan Node.js, Express, PostgreSQL, HTML, dan JavaScript. Bahasa antarmuka Indonesia; nilai uang disimpan sebagai BIGINT sen.

Dikembangkan oleh **bipi (jaddadeveloper)** untuk kemanfaatan bersama seluas-luasnya, berbasis [galihsidik86/sikeu-tazkia](https://github.com/galihsidik86/sikeu-tazkia). Lisensi MIT dan pemberitahuan hak cipta asal tetap dipertahankan.

Rencana layanan: [konsep SAS Bersama dan SAS Mandiri](docs/KONSEP-LAYANAN.md) serta [arsitektur teknis](docs/ARSITEKTUR-LAYANAN.md). Dokumen tersebut adalah rancangan pengembangan; kode saat ini masih instalasi satu instansi dengan multi-unit, belum layanan banyak sekolah independen.

Untuk teman yang akan melanjutkan proyek: baca [catatan serah-terima](docs/SERAH-TERIMA.md) dan [riwayat pengembangan SAS](docs/RIWAYAT-PENGEMBANGAN.md). README berisi panduan penggunaan/instalasi; riwayat perubahan dicatat terpisah dan detail teknisnya tersedia di Git.

## Halaman pengantar produk

Buka `/` untuk mengenal manfaat, fitur, contoh tampilan, FAQ, dan pilihan penggunaan SAS. Pengunjung dapat mencoba simulasi jurnal tanpa akun dan tanpa menyimpan transaksi. Tombol **Buka aplikasi** menuju `/app`; pengguna terdaftar masuk melalui `/login`. Pendaftaran SAS Bersama belum tersedia.

Unduhan `/download/sas-opensource.zip` berisi sumber aplikasi ini beserta lisensi dan panduan instalasi, bukan data sekolah atau konfigurasi privat. Paket dibuat dengan `npm run release`, otomatis sebelum `npm start`/`npm run dev` dan saat build Docker. Atur `SUPPORT_EMAIL` bila tersedia alamat publik untuk bantuan instalasi. Lihat [panduan halaman produk](docs/HALAMAN-PRODUK.md).

## Quickstart Docker

Pasang Docker Engine/Desktop dan Compose v2, lalu dari folder proyek jalankan:

```sh
docker compose up -d
```

Buka **http://127.0.0.1:3000/login**. Compose membangun image lokal, menunggu PostgreSQL sehat, menjalankan migrasi, dan mengisi data contoh hanya jika database kosong. Restart atau build ulang **tidak menjalankan ulang seed** pada database terisi. Inisialisasi memakai transaksi dan advisory lock agar dua startup tidak mengisi seed bersamaan.

Opsional sebelum menjalankan Compose, salin `.env.example` menjadi `.env` dan ubah identitas sekolah atau `APP_PORT`. PostgreSQL berada di jaringan internal Docker. Volume `pgdata` menyimpan database dan `appdata` menyimpan backup.

```sh
cp .env.example .env
docker compose up -d --build
docker compose logs -f app
docker compose ps
```

`docker compose down` menghentikan layanan dan mempertahankan volume. **Jangan memakai `down -v` jika ingin menyimpan data.**

## Akun percobaan

Sandi awal semua akun: **`sasDemo123!`**, atau nilai `SEED_PASSWORD` saat inisialisasi pertama.

| Email | Peran | Akses |
| --- | --- | --- |
| `admin1@sekolah.example` | Administrator | Master, pengguna, seluruh unit |
| `operator@sekolah.example` | Staf akuntansi | Input dan pengajuan transaksi unit SMA |
| `stafakuntansi1@sekolah.example` | Staf akuntansi | Input dan pengajuan transaksi unit SD |
| `kasir1@sekolah.example` | Kasir | Penerimaan/pengeluaran dan pembayaran |
| `bendahara1@sekolah.example` | Bendahara | Persetujuan dan posting |
| `pengurusyayasan1@sekolah.example` | Pengurus yayasan | Pengawasan dan persetujuan |

Seed menyediakan 19 pengguna: tiga per peran asli, ditambah operator. Domain email bisa diganti melalui `SEED_EMAIL_DOMAIN` sebelum inisialisasi. Nama dan sandi contoh bukan kredensial produksi.

## Instalasi manual

Prasyarat: Node.js **22.22.2+ pada jalur 22 LTS atau 24.15+**, npm, PostgreSQL **16+**. Siapkan role `sas` dan database miliknya menggunakan administrator PostgreSQL:

```sh
createuser -P sas
createdb -O sas sas
createdb -O sas sas_test
npm install
cp .env.example .env
# Sesuaikan DATABASE_URL dan TEST_DATABASE_URL dengan password PostgreSQL Anda.
npm run db:init
npm start
```

`db:init` menjalankan migrasi dan seed pertama dengan aman. Untuk menjalankan langkah tersebut terpisah pada database percobaan yang kosong:

```sh
npm run migrate
npm run seed
npm run dev
```

**`npm run seed` mengosongkan data sebelum mengisi contoh; `npm run reset` juga menghapus skema. Jangan gunakan keduanya pada database sekolah yang sudah dipakai.** Data contoh berperiode 2026 (ditambah Desember 2025 terkunci), sehingga dapat langsung dipakai mempelajari alur transaksi. Tambahkan periode sesuai tahun operasional melalui Master Data.

## Sekolah yang belum mempunyai jurnal

Pada database kosong, atur `SEED_MODE=school` di `.env` sebelum `npm run db:init` atau startup Docker pertama. SAS membuat satu unit dan tiga akun (admin1/operator/bendahara1), master COA serta kas operasional, tanpa transaksi demo. Login pertama membuka menu **Mulai Pembukuan**: tentukan tanggal mulai → isi saldo dan piutang per siswa → periksa keseimbangan → ajukan jurnal pembuka untuk persetujuan bendahara/admin. Saldo nol juga didukung.

Mengganti `SEED_MODE` tidak menimpa database yang telah terisi. Untuk mencoba pada instalasi demo, tambahkan unit kosong dari Master Data. Panduan lengkap dan batas dukungan saldo historis: [MULAI-PEMBUKUAN.md](docs/MULAI-PEMBUKUAN.md).

## Konfigurasi instansi

```dotenv
APP_NAME="Sistem Akuntansi Sekolah (SAS) Open Source"
INSTITUTION_NAME="Yayasan Pendidikan Contoh"
SCHOOL_NAME="Sekolah SAS"
```

Identitas dibaca lewat `/api/config`, hanya berisi tiga nama publik di atas. Login, judul tab, dashboard, sidebar, dan footer cetak mengikuti konfigurasi. Restart server setelah mengubah `.env`. Nama unit seed mengikuti konfigurasi saat inisialisasi; perubahan berikutnya pada nama unit dilakukan melalui Master Data agar nama tersimpan tidak ditimpa.

## Fitur

- Unit SD, SMP, SMA dan yayasan pusat, dengan laporan konsolidasi dan eliminasi antar-unit.
- Bagan akun nirlaba dengan aset neto tanpa/dengan pembatasan, kas operasional, rekening BOS, piutang SPP, uang pangkal/gedung, gaji, buku, dan kegiatan pembelajaran.
- Jurnal double-entry: draft, pengajuan, persetujuan, posting, jurnal balik, kunci periode dan jejak audit.
- Kas/bank, kategori transaksi, saldo dan rekonsiliasi CSV.
- Siswa, impor CSV, tagihan SPP, cicilan, keringanan, aging, CKPN dan pengakuan pendapatan bertahap.
- Anggaran RKAT, persetujuan, realisasi dan kontrol pagu belanja.
- Laporan posisi keuangan, penghasilan komprehensif, perubahan aset neto, dan arus kas; cetak PDF browser dan ekspor Excel.
- Dashboard, backup otomatis dan tutup buku tahunan.
- Modul pencatatan PPh 21/23 dengan tarif yang dapat dikonfigurasi.

Modul BOS menyediakan rekening dan akun, **belum integrasi ARKAS atau pelaporan BOS resmi**. COA dan kebijakan pengakuan pendapatan perlu disesuaikan sekolah. Contoh SPP memakai tagihan per semester dengan amortisasi bulanan. Kolom API `nim` dipakai sebagai NIS/NISN dan `prodi` sebagai kelas/jurusan demi kompatibilitas; format CSV lama tetap diterima. Untuk uang pangkal/gedung gunakan kategori kas atau jurnal umum dan pilih akun sesuai kebijakan sekolah.

## Pengujian

```sh
# TEST_DATABASE_URL di .env harus menunjuk database khusus tes bernama *_test.
npm test
curl http://127.0.0.1:3000/api/health
```

Runner menolak database tes dengan nama sama seperti database aplikasi. Tes membuat ulang skema database tes; jangan arahkan ke data riil. Suite mencakup akuntansi, anggaran, piutang, pajak, laporan, seed sekolah, inisialisasi ulang dan login HTTP admin/operator.

Audit dependensi runtime dapat diperiksa dengan `npm audit --omit=dev`. Saat adaptasi, runtime bersih; audit penuh masih melaporkan satu kerentanan pada `image-size` transitif dari pembuat DOCX (`html-to-docx`, devDependency). Tool dokumen tidak masuk image produksi; gunakan sumber gambar tepercaya ketika membuat dokumen.

## Penggunaan bersama / produksi

Salin `.env.production.example`, isi rahasia acak dan `SEED_PASSWORD` unik minimal 12 karakter. Gunakan reverse proxy HTTPS; aktifkan `COOKIE_SECURE=true` dan `TRUST_PROXY=true` ketika proxy dipercaya. Untuk percobaan HTTP lokal, biarkan keduanya `false` agar cookie sesi dapat tersimpan. `SESSION_SECRET` produksi wajib minimal 32 karakter. Password PostgreSQL dalam URL harus di-URL-encode; Compose contoh mengasumsikan password alfanumerik.

Seed memuat transaksi fiktif. Sebelum operasional: backup, jalankan `npm run clean` untuk pratinjau pembersihan, baca rinciannya, lalu gunakan `npm run clean -- --confirm` hanya jika memang ingin menghapus data contoh. Proses ini menyimpan master dan admin; periksa rekening contoh, ubah sandi admin, buat operator sekolah asli, dan isi periode serta saldo awal yang sesuai.

Panduan deployment dan backup: [deploy/README.md](deploy/README.md). Struktur kode dan catatan adaptasi: [docs/ADAPTASI.md](docs/ADAPTASI.md). Manual HTML tersedia di [docs/manual/index.html](docs/manual/index.html).

## Menghubungkan GitHub milik Anda

Riwayat Git telah diinisialisasi ulang pada branch `main` dan belum memiliki remote. Buat repositori GitHub kosong tanpa README tambahan, lalu jalankan:

```sh
git remote add origin https://github.com/USERNAME/sas-opensource.git
git push -u origin main
```

Jika belum ada commit lokal, gunakan `git add .` dan `git commit -m "Initial SAS Open Source adaptation"` sebelum push. Workflow build image memakai nama repositori Anda. Deployment otomatis memerlukan secrets VPS yang sengaja disetel pemilik; lihat panduan deployment.

## Lisensi

MIT — lihat [LICENSE](LICENSE).
