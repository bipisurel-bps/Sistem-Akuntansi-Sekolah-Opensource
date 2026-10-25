# Demo publik hanya-baca

Demo tersedia di `/demo/app` melalui container aplikasi dan cluster PostgreSQL tersendiri. Ini bukan tenant atau akun bendahara pada database produksi. Data contoh dibuat oleh seed; jangan memasukkan data sekolah nyata ke cluster demo.

## Lapisan perlindungan

- Runtime demo memakai `APP_DEMO_MODE=true` dan `APP_BASE_PATH=/demo`. Semua metode perubahan data ditolak server, termasuk login sandi dan ganti sandi.
- Pengamat menggunakan peran aplikasi `kepala_unit`, tidak mempunyai password publik, dan tidak dibuat melalui permintaan pengunjung.
- Runtime PostgreSQL menggunakan `sas_demo_reader`: hanya SELECT, bukan superuser/pemilik, tanpa izin CREATE. `default_transaction_read_only=on` menjadi lapisan tambahan; mencabut flag read-only tidak memberikan izin UPDATE.
- Startup demo memeriksa hak database dan menolak berjalan jika koneksinya mempunyai hak tulis. Runtime tidak menjalankan migrasi, seed, penyimpanan sesi, audit login pengunjung, atau backup produksi.
- Cluster, network, volume, dan password demo terpisah. Aplikasi demo tidak mendapat password database produksi atau password pemilik database demo.
- Sesi produksi tidak digunakan oleh demo; proxy membuang Cookie/Authorization ke upstream demo dan Set-Cookie dari responsnya. UI menampilkan data fiktif/hanya-baca; perubahan tetap diblokir server walaupun pengguna memodifikasi UI. Prefix satu domain bukan batas origin browser; isolasi yang diterapkan di sini adalah pemisahan runtime/database dan pembatasan hak akses.

## Instalasi di VPS

Simpan `.env` demo privat di `/opt/sas-demo/.env`, direktori 700 dan berkas 600. Isi `DEMO_OWNER_PASSWORD`, `DEMO_READER_PASSWORD`, dan `DEMO_SEED_PASSWORD` dengan nilai hex acak 64 karakter yang berbeda. Opsional `SAS_DEMO_IMAGE` menunjuk image sumber SAS yang sudah diuji. Jangan memakai nilai dari `.env` produksi.

Contoh perintah dari root sumber SAS:

```sh
sudo docker compose -p sas-demo --env-file /opt/sas-demo/.env -f deploy/compose.demo.yml build app
sudo docker compose -p sas-demo --env-file /opt/sas-demo/.env -f deploy/compose.demo.yml up -d db --wait
sudo docker compose -p sas-demo --env-file /opt/sas-demo/.env -f deploy/compose.demo.yml --profile setup run --rm initialize
sudo docker compose -p sas-demo --env-file /opt/sas-demo/.env -f deploy/compose.demo.yml up -d app --wait
curl -fsS http://127.0.0.1:3301/demo/api/health
```

Initializer hanya menerima database `sas_demo` atau `sas_demo_test`, tidak menyediakan opsi reset, dan tidak menimpa seed terisi. Ia memakai koneksi pemilik pada job terpisah; job tidak dihidupkan sebagai layanan runtime.

Setelah pemeriksaan lulus, tambahkan routing `/demo/*` pada Caddy host sesuai `Caddy.demo.host.example`, validasi konfigurasi lengkap, lalu reload. Prefix `/demo` harus diteruskan ke aplikasi tanpa dipotong. Tidak perlu DNS subdomain. Instalasi mandiri yang hanya menjalankan Compose utama belum menyertakan demo penuh; jalankan stack demo ini jika membutuhkan tombol `/demo/app` lokal.

## Migrasi dari demo lama

Nonaktifkan akun `demo@sistemakuntansisekolah.web.id` pada database utama dan cabut sesinya. Jangan menghapus akun/jurnal sekolah atau mereset database utama. Login biasa menolak identitas demo lama, dan `/api/auth/demo-login` tidak lagi membuat akun/sesi produksi (HTTP 410).

Pada pemutakhiran VPS, simpan snapshot dan stash perubahan lokal sebelum fast-forward ke hasil merge yang sudah diuji. Jangan memakai `git reset --hard` untuk menghilangkan perubahan yang belum diintegrasikan.

Kontak bantuan: **jaddadeveloper@gmail.com**. WhatsApp tidak digunakan. Penyiapan tautan email tidak berarti aplikasi telah memiliki SMTP atau pengiriman email otomatis.
