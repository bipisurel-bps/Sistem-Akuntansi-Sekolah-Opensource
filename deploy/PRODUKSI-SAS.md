# Operasional instalasi SAS

Deployment awal diperiksa pada 24 Oktober 2026.

## Alamat dan instalasi

- Situs: https://sistemakuntansisekolah.web.id/
- Login: https://sistemakuntansisekolah.web.id/login
- VPS: Ubuntu 24.04, aplikasi berada di `/opt/sas-opensource`.
- Compose project `sas`, memakai `docker-compose.yml` dan `deploy/compose.production.yml` melalui `.env` privat.
- Aplikasi hanya mendengarkan `127.0.0.1:3300`; Caddy host meneruskan domain HTTPS ke port ini. Database hanya berada dalam jaringan Docker SAS dan tidak membuka port host.
- Mode awal `school`: satu unit, tiga pengguna, tanpa siswa, tagihan maupun jurnal demo. Instalasi ini **bukan layanan banyak sekolah independen** dan tidak menyediakan pendaftaran publik.
- Batas awal masing-masing layanan: 512 MiB RAM dan 0,75 CPU. Aplikasi memakai pengguna non-root dan filesystem read-only; volume data tetap dapat ditulis.

Konfigurasi/kredensial tidak masuk Git atau ZIP. Jangan menjalankan perintah yang menampilkan seluruh environment atau Docker inspect lengkap pada log publik.

## Akses awal

Identitas login admin: `admin1@sistemakuntansisekolah.web.id`. Password acak tidak ditulis dalam dokumen ini. Salinan privat akses awal berada pada akun administrator VPS di `~/.config/sas/initial-admin.txt`; pemilik menerima salinan privat di perangkatnya. Ganti sandi melalui aplikasi setelah login, lalu sesuaikan akun operator/bendahara sebelum penggunaan riil. Tidak ada layanan email otomatis yang disetel pada deployment awal.

SSH memakai key khusus deployment SAS pada perangkat pemilik. Dokumen Word password transit sudah dihapus setelah key terverifikasi. Pemasangan key tidak menonaktifkan metode login SSH yang sebelumnya ada.

## Pemeriksaan dan pembaruan

Dari folder instalasi pada VPS:

```sh
sudo docker compose ps
curl -fsS http://127.0.0.1:3300/api/health
sudo systemctl status caddy --no-pager
```

Sebelum pembaruan, buat backup dan tinjau perubahan/migrasi. Setelah tes lulus:

```sh
sudo bash deploy/backup-postgres.sh
git pull --ff-only
sudo docker compose build app
sudo docker compose up -d --wait --wait-timeout 180
curl -fsS https://sistemakuntansisekolah.web.id/api/health
```

Jangan memakai `reset`, `seed`, migrasi `--fresh`, atau `docker compose down -v` pada data riil. Workflow GitHub build/test tidak otomatis berarti VPS ikut diperbarui: secrets deployment VPS belum disetel pada proses ini. Workflow deploy yang tersedia masih perlu peninjauan gerbang tes dan verifikasi host SSH sebelum diaktifkan.

## Backup dan pemulihan

- `sas-postgres-backup.timer` menjalankan backup PostgreSQL setiap hari sekitar 02.15 WIB (jeda acak maksimal lima menit).
- Backup SQL terkompresi berada di `/var/backups/sas`, direktori 700 dan berkas 600; salinan konfigurasi awal juga disimpan secara privat di sana.
- Backup otomatis JSON aplikasi tetap berada pada volume aplikasi, terpisah dari backup PostgreSQL penuh.
- Backup SQL awal berhasil dipulihkan pada database uji terpisah; database uji telah dihapus. Ulangi latihan restore setelah perubahan penting.
- **Salinan off-site belum disetel.** Siapkan tujuan penyimpanan dan kebijakan retensi/pemantauan disk. Skrip backup PostgreSQL tidak menghapus backup lama otomatis.

```sh
sudo systemctl list-timers sas-postgres-backup.timer --no-pager
sudo systemctl show sas-postgres-backup.service -p Result -p ExecMainStatus
```

Backup konfigurasi Caddy sebelum penambahan SAS ada di `/var/backups/sas-deploy`. Tidak ada layanan aplikasi lain yang dihentikan/dibuat ulang pada pemasangan awal; Caddy dimuat ulang setelah validasi. Untuk rollback mendatang, pilih image/commit yang sudah diuji dan periksa kompatibilitas skema; rollback kode tidak otomatis mengembalikan database.

## Hasil verifikasi awal

HTTPS valid, pengalihan HTTP ke HTTPS, halaman utama/login/aplikasi, aset produk, health check dan unduhan sumber lulus pemeriksaan HTTP. Login admin melalui domain, akses API terautentikasi, cookie Secure/HttpOnly/SameSite dan logout lulus. Kedua container sehat; startup mode sekolah dan restore backup terverifikasi pada PostgreSQL 16.

Pengujian visual browser nyata, uji beban, audit keamanan menyeluruh, serta kesesuaian seluruh kebijakan akuntansi sekolah belum dilakukan. Gunakan sebagai pilot satu instansi dan lakukan pemeriksaan bersama bendahara sebelum memasukkan data operasional riil.
