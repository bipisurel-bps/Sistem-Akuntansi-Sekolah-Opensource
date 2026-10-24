# Deployment SAS

Stack menggunakan PostgreSQL 16 dan image aplikasi yang dibangun dari kode lokal. Panduan awal ada di README utama. Tidak ada image upstream atau domain instansi yang harus dipakai.

## Produksi dengan reverse proxy

1. Clone repositori GitHub milik Anda ke `/opt/sas-opensource`.
2. Salin `.env.production.example` menjadi `.env`; isi `POSTGRES_PASSWORD`, `SESSION_SECRET`, dan `SEED_PASSWORD` acak. Sesuaikan identitas dan domain email.
3. Jalankan `docker compose up -d --build`.
4. Arahkan reverse proxy HTTPS ke `127.0.0.1:3000`. Contoh Caddy:

```caddyfile
sas.sekolah.example {
  reverse_proxy 127.0.0.1:3000
}
```

Compose tidak membuka port PostgreSQL. Port aplikasi hanya terikat ke loopback. Untuk pembaruan gunakan `git pull --ff-only` lalu `bash deploy/deploy.sh`. Skrip menjalankan migrasi tanpa reset; startup melewati seed pada database terisi.

Workflow `.github/workflows/build-image.yml` membangun `ghcr.io/<pemilik>/<repo>`. Untuk menarik image tersebut, atur `APP_IMAGE` di `.env` dan gunakan `bash deploy/deploy-ghcr.sh`. Secrets opsional workflow: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_PORT`, `VPS_APP_DIR`. Tanpa secrets, langkah deployment dilewati. Kunci deploy harus khusus server tujuan; masukkan ke GitHub Actions Secrets, bukan ke berkas proyek.

## Backup

Untuk membatasi resource pada VPS bersama, tersedia override `deploy/compose.production.yml`: batas memori 512 MiB per layanan, CPU 0,75 per layanan, rotasi log, serta filesystem aplikasi read-only (volume data tetap dapat ditulis). Uji kapasitas sebelum menambah sekolah/pengguna. Tambahkan pada `.env` produksi:

```dotenv
COMPOSE_PROJECT_NAME=sas
COMPOSE_FILE=docker-compose.yml:deploy/compose.production.yml
APP_PORT=3300
```

Gunakan `docker compose config --quiet` untuk validasi. Jangan menampilkan konfigurasi lengkap pada log publik karena berisi rahasia. Contoh Caddy **host** tersedia pada `deploy/Caddy.host.example`; `deploy/Caddyfile` yang lama ditujukan untuk proxy container di jaringan aplikasi. Compose tidak memasang Caddy otomatis.

Backup PostgreSQL penuh dapat dijalankan dengan `sudo bash deploy/backup-postgres.sh`. Output privat disimpan pada `/var/backups/sas` (direktori 700, berkas 600). Skrip memakai lock dan tidak menghapus backup lama; atur pemantauan disk, salinan off-site serta kebijakan retensi terpisah. Jadwalkan melalui systemd/cron pada VPS, bukan melalui proses browser. Jangan memasukkan backup ke repositori.

```sh
docker compose exec -T db pg_dump -U sas sas > sas-backup.sql
```

Simpan salinan di luar VPS. Backup JSON otomatis aplikasi tersedia pada volume `appdata`; backup PostgreSQL di atas mencakup skema dan data untuk pemulihan penuh. Uji restore ke database terpisah sebelum mengandalkannya. Sebelum upgrade, backup database dan `.env`. Jangan menjalankan `seed`, `reset`, atau `docker compose down -v` pada database riil.
