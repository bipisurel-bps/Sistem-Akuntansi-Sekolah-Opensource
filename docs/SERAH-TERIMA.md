# Serah-terima SAS untuk pengembangan dan deployment

Status diperiksa: **24 Oktober 2026**. Snapshot awal halaman produk: `ac73715`; pengembangan setelahnya termasuk atribusi bipi (jaddadeveloper) dan halaman Tentang dicatat pada riwayat pengembangan/Git. Dokumen ini boleh dibagikan bersama repositori/ZIP sumber. Tidak berisi kredensial produksi.

## Ringkasan untuk rekan pengembang

SAS adalah adaptasi aplikasi akuntansi multi-unit untuk sekolah Indonesia. Basisnya [galihsidik86/sikeu-tazkia](https://github.com/galihsidik86/sikeu-tazkia), snapshot `c9d14ea3ea5556a7b8e047601bf03ddac4f47405`, dengan lisensi MIT. Atribusi asli dipertahankan. Produk ini boleh dikembangkan dalam repositori mandiri; jangan menyatakan seluruh kode dibuat dari nol.

Target dekat: satu sekolah/yayasan memasang SAS pada server sendiri. **Kode saat ini satu instansi dengan multi-unit, belum SaaS banyak sekolah independen.** Jangan menempatkan sekolah-sekolah yang tidak terkait dalam satu instalasi lalu menganggapnya sudah memiliki isolasi tenant.

Lisensi aktif **MIT**. Setelah mempertimbangkan AGPLv3, pemilik memutuskan tetap memakai MIT untuk memudahkan adopsi dan kemanfaatan bersama. Nama pengembangan SAS: **bipi (jaddadeveloper)**. Pemberitahuan MIT dan hak cipta pengembang awal tetap dipertahankan.

## Yang sudah tersedia

- Mesin warisan: jurnal double-entry, persetujuan/posting, kas/bank, piutang, anggaran, pajak, laporan, konsolidasi dan tutup buku.
- Adaptasi SAS: identitas fleksibel, contoh unit sekolah dan akun BOS/uang pangkal/belanja sekolah.
- Alur baru **Mulai Pembukuan** bagi sekolah tanpa jurnal: tanggal mulai, saldo awal, piutang historis, pemeriksaan dan pengajuan jurnal pembuka.
- Halaman produk, demo jurnal tanpa akun, login dan unduhan sumber.
- Docker Compose PostgreSQL + aplikasi serta workflow tes/build/deploy yang perlu ditinjau sebelum diaktifkan.

Belum tersedia: pendaftaran SAS Bersama, isolasi banyak sekolah independen, integrasi Dapodik/ARKAS, dan lampiran bukti transaksi. Rekening/akun BOS bukan jaminan kepatuhan pelaporan BOS. Tarif pajak dan kebijakan akuntansi harus diperiksa sebelum transaksi riil.

## Lokasi dan peta kode

Folder pada perangkat pengembangan awal: `/data/data/com.termux/files/home/sas-opensource`. Lokasi ini khusus perangkat tersebut; pada komputer/VPS lain bebas dipilih. Remote GitHub belum dikonfigurasi ketika catatan dibuat.

| Lokasi | Isi |
| --- | --- |
| `server.js`, `src/config.js` | Routing, server, sesi, identitas dan environment |
| `src/routes/`, `src/services/` | API dan aturan bisnis akuntansi |
| `src/db/` | Skema, migrasi, inisialisasi dan seed |
| `public/index.html`, `product.css`, `product.js` | Halaman produk dan demo lokal |
| `public/app.html`, `app.js`, `opening.js` | Ruang kerja dan panduan saldo awal |
| `tests/`, `.github/workflows/` | Tes dan workflow CI/deployment |
| `deploy/`, `docker-compose.yml`, `Dockerfile` | Instalasi dan pembaruan server |

Halaman: `/` pengantar, `/app` ruang kerja, `/login` masuk, `/api/health` kesehatan server/database. Unduhan: `/download/sas-opensource.zip`. ZIP berisi sumber, bukan database sekolah; dibangun lewat `npm run release`, otomatis sebelum `npm start`/`npm run dev` dan pada build Docker.

## Melanjutkan di GitHub

Pemilik membuat repositori kosong, misalnya `sas-opensource`, tanpa README/license otomatis. Dari folder proyek lokal:

```sh
git status --short
git remote -v
git remote add origin https://github.com/USERNAME/sas-opensource.git
git push -u origin main
```

Ganti `USERNAME` dengan pemilik sebenarnya. Jika `origin` sudah ada, periksa tujuannya dan jangan menjalankan `remote add` lagi. Jangan menghapus riwayat SAS yang sekarang. Bila memakai ZIP, paket memang tidak menyertakan `.git`: lakukan `git init -b main`, `git add .`, dan commit awal sebelum mengatur remote. Pertahankan catatan asal kode.

Undang rekan melalui akses Collaborator GitHub. Rekan dapat clone, membuat branch fitur, lalu mengajukan pull request. Atur review dan pemeriksaan tes wajib pada branch `main`. Jangan masukkan `.env`, token, SSH key, backup atau data sekolah ke Git. Berikan akses menggunakan akun/kunci masing-masing, bukan membagikan sandi pemilik.

## Menjalankan untuk pengembangan

Pilihan termudah pada mesin yang memiliki Docker Engine dan Compose:

```sh
docker compose up -d --build
docker compose ps
```

Buka `http://127.0.0.1:3000/`. Konfigurasi bawaan adalah demo lokal, bukan produksi. Akun demo dan panduan instalasi manual ada di [README](../README.md). Untuk manual: Node sesuai `package.json` (22.22.2+ pada jalur 22, atau 24.15+), PostgreSQL 16+, `npm ci`, salin `.env.example`, siapkan database, sesuaikan environment, `npm run db:init`, lalu `npm start`.

Tes memakai database terpisah dengan nama berakhiran `_test`; jalankan `npm test`. Runner membuat ulang skema database tes. **Jangan gunakan database aplikasi atau data sekolah untuk tes.**

## Deployment internet pertama: build langsung di VPS

Prasyarat: VPS Linux dengan Docker Engine/Compose, Git, domain yang sudah diarahkan ke IP VPS, serta Caddy atau Nginx sebagai reverse proxy. Aplikasi ini tidak dapat dijalankan lengkap hanya melalui GitHub Pages karena membutuhkan server Node dan PostgreSQL.

1. Clone repositori milik pemilik ke lokasi yang dapat dikelola akun deploy, misalnya `/opt/sas-opensource`. Jangan memakai repositori upstream sebagai target deployment SAS.
2. Dari root proyek, salin `.env.production.example` menjadi `.env`, batasi izin berkas (`chmod 600 .env`), lalu edit secara privat. Isi rahasia berbeda untuk `POSTGRES_PASSWORD`, `SESSION_SECRET` dan `SEED_PASSWORD`. `openssl rand -hex 32` dapat dipakai untuk membuat nilai acak; jangan memasukkannya ke chat/Git.
3. Pastikan `NODE_ENV=production`, `SEED_MODE=school`, `COOKIE_SECURE=true`, `TRUST_PROXY=true`. Isi nama instansi/sekolah, `SEED_EMAIL_DOMAIN` dan opsional `SUPPORT_EMAIL`. Gunakan password PostgreSQL alfanumerik untuk URL Compose. Untuk cara manual tanpa Docker, sesuaikan `DATABASE_URL` juga.
4. Biarkan `APP_IMAGE` tidak diatur untuk jalur build lokal VPS. Jalankan `docker compose config --quiet`, lalu `docker compose up -d --build`. Startup menginisialisasi database kosong; tidak menimpa database yang sudah terisi. Jangan membagikan output konfigurasi lengkap karena dapat memuat rahasia.
5. Pasang reverse proxy pada **host VPS**. Contoh konfigurasi Caddy host, ganti domain berikut:

```caddyfile
sas.domain-anda.id {
    reverse_proxy 127.0.0.1:3000
}
```

6. Buka HTTP/HTTPS pada firewall sesuai kebutuhan proxy (80/443); batasi SSH. Jangan membuka PostgreSQL/5432 atau port aplikasi/3000 ke publik. Compose sudah mengikat aplikasi ke loopback dan tidak menerbitkan port database.
7. Uji `https://sas.domain-anda.id/api/health`, beranda, demo, login, `/app`, dan unduhan ZIP. Akun pertama mode school memakai `admin1@<SEED_EMAIL_DOMAIN>` dengan `SEED_PASSWORD` yang ditetapkan. Verifikasi cookie login melalui HTTPS, ganti sandi awal, cek peran pengguna dan jalankan satu siklus transaksi percobaan sebelum data riil.

Catatan Caddy: `deploy/Caddyfile` yang ada menggunakan upstream `app:3000`, untuk proxy container pada jaringan Docker yang sama. **Compose saat ini tidak menyediakan layanan Caddy atau variabel DOMAIN.** Untuk jalur host di atas, gunakan contoh `127.0.0.1:3000`; jangan langsung memakai konfigurasi container itu.

## Backup, pembaruan dan risiko yang harus diperiksa

Sebelum upgrade, simpan backup database dan `.env` secara privat di luar repositori; salin backup ke tempat lain di luar VPS. Contoh akun/database default:

```sh
docker compose exec -T db pg_dump -U sas sas > sas-backup.sql
chmod 600 sas-backup.sql
```

Sesuaikan nama role/database jika diubah. Batasi izin direktori backup sebelum membuat berkas. Uji pemulihan pada database terpisah. Setelah backup dan review perubahan, pembaruan manual dapat memakai `git pull --ff-only` lalu `bash deploy/deploy.sh`. Perubahan skema harus diuji di staging; tidak ada rollback database otomatis.

**Jangan menjalankan `npm run seed`, `npm run reset`, migrasi `--fresh`, atau `docker compose down -v` pada data riil.** Mode `school` berlaku saat database kosong; mengganti environment tidak membersihkan database demo yang sudah terisi.

Sebelum mengaktifkan deploy otomatis, rekan perlu meninjau hal-hal berikut:

- Workflow build/GHCR dan tes berjalan terpisah; deployment **belum menunggu tes lulus**. Tambahkan gerbang tes/review dan persetujuan environment produksi.
- Workflow deploy menggunakan `git reset --hard origin/main`: perubahan lokal pada berkas terlacak di VPS akan hilang. Jangan mengedit kode produksi langsung. Langkah ini tidak dijalankan saat penulisan catatan ini.
- Host SSH saat ini didaftarkan melalui `ssh-keyscan` tanpa verifikasi sidik jari independen. Verifikasi/pin host key sebelum produksi.
- `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, opsional `VPS_PORT` dan `VPS_APP_DIR` hanya di GitHub Actions Secrets. Tanpa secrets, langkah deploy dilewati. Jalur GHCR juga memerlukan `APP_IMAGE` dan izin VPS menarik image, atau paket image publik.
- Migrasi saat ini menjalankan `schema.sql`, belum sistem migrasi berurutan berversi. Rancang migrasi berikutnya agar kompatibel dengan data lama dan uji restore/rollback.
- Lakukan review keamanan auth, pembatasan percobaan login, sesi, otorisasi dan perlindungan perubahan data sebelum menerima data sekolah riil. Dokumen ini bukan hasil audit keamanan menyeluruh.

## Bukti pengujian dan pekerjaan berikutnya

Verifikasi terakhir kode aplikasi: **83 tes lulus** pada Termux Android, Node 24 dan PostgreSQL 18.6; HTTP/DOM diuji dengan jsdom, audit runtime pada pemeriksaan sebelumnya 0 kerentanan. Detail: [VERIFIKASI.md](VERIFIKASI.md). Ini hasil lokal, bukan klaim tes pada VPS tujuan.

Belum diverifikasi: rendering browser nyata desktop/mobile, runtime container pada host pengembangan Android, pengiriman workflow GitHub aktual, deployment domain/VPS, uji beban dan restore produksi. Audit penuh masih mencatat temuan high transitif `image-size` pada tool dokumen dev; dependency runtime diperiksa terpisah.

Prioritas rekan: jalankan CI dan staging pada Linux → periksa tampilan serta alur akuntansi bersama bendahara → amankan deployment/backup → baru buka pilot satu instansi. Pengembangan SAS Bersama memerlukan pekerjaan isolasi tenant tersendiri.

Bacaan lanjut: [riwayat pengembangan](RIWAYAT-PENGEMBANGAN.md), [adaptasi](ADAPTASI.md), [panduan saldo awal](MULAI-PEMBUKUAN.md), [halaman produk](HALAMAN-PRODUK.md), [deployment](../deploy/README.md), [konsep layanan](KONSEP-LAYANAN.md), dan [arsitektur rencana](ARSITEKTUR-LAYANAN.md).
