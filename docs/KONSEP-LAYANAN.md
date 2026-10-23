# Konsep SAS Bersama dan SAS Mandiri

Status: rancangan produk untuk pengembangan berikutnya. Pembatasan fitur, pemisahan instansi, portal, dan migrasi antarmode dalam dokumen ini **belum diimplementasikan**. Angka kuota di bawah adalah usulan pilot, bukan janji layanan.

## Tujuan

Menyediakan pembukuan sekolah yang dapat diakses daring tanpa kemampuan mengelola server, sekaligus mendorong kepemilikan aplikasi dan data melalui instalasi mandiri. Satu basis kode MIT tetap tersedia untuk diunduh; layanan bersama memberikan sebagian fitur, sedangkan instalasi mandiri menyediakan seluruh fitur aplikasi yang telah dirilis.

| Pilihan | Sasaran | Infrastruktur | Kontribusi |
| --- | --- | --- | --- |
| SAS Bersama | Sekolah yang perlu mulai dengan pembukuan dasar | Dikelola penyelenggara | Penggunaan dasar gratis; dukungan mengikuti kapasitas |
| SAS Mandiri | Sekolah/yayasan yang membutuhkan fitur lengkap atau kendali lebih | Komputer/server/VPS milik sekolah | Kode gratis; bantuan instalasi berkontribusi seikhlasnya |

Tidak ada paket fitur berbayar pada rancangan ini. Besaran kontribusi tidak menjadi kunci aktivasi fitur. Biaya domain, VPS, penyimpanan, atau layanan pihak ketiga yang benar-benar dibutuhkan dijelaskan terpisah sebelum pekerjaan; kode tetap bisa dipasang sendiri tanpa bantuan penyelenggara.

## Batas fitur yang diusulkan

| Fitur | SAS Bersama | SAS Mandiri |
| --- | --- | --- |
| Profil instansi dan COA sekolah | Tersedia | Tersedia |
| Unit pembukuan | 1 sekolah/unit aktif | Multi-unit yayasan sesuai kemampuan instalasi |
| Pengguna aktif | Usulan 3: admin, operator, bendahara | Sesuai kebutuhan dan kapasitas |
| Penerimaan/pengeluaran kas dan bank | Tersedia | Tersedia |
| Jurnal double-entry, persetujuan dan jurnal balik | Tersedia | Tersedia |
| Buku besar, neraca saldo dan laporan keuangan ISAK 35 yang sudah ada | Tersedia untuk satu unit | Tersedia per unit dan konsolidasi |
| Kunci periode, tutup buku dan audit transaksi | Tersedia | Tersedia |
| Master siswa, tagihan SPP dan pembayaran/cicilan | Tersedia, alur sederhana | Tersedia |
| Pengakuan pendapatan yang diperlukan oleh metode tagihan | Tetap berfungsi | Tersedia |
| Ekspor data lengkap untuk pindah layanan | Selalu tersedia bagi admin instansi | Tersedia |
| Backup terjadwal | Dikelola platform; pemulihan melalui pengelola | Dikelola sekolah, dengan bantuan opsional |
| Impor siswa CSV | Tersedia | Tersedia |
| Rekonsiliasi mutasi bank CSV | Belum diaktifkan | Tersedia |
| Anggaran RKAT dan kontrol pagu | Belum diaktifkan | Tersedia |
| Modul pemotongan dan penyetoran pajak | Belum diaktifkan | Tersedia |
| Perhitungan/pembentukan jurnal CKPN otomatis | Belum diaktifkan; jurnal penyesuaian manual tetap tersedia | Tersedia |
| Konsolidasi dan transaksi antar-unit | Belum diaktifkan | Tersedia |
| Lampiran bukti transaksi | Ditunda pada pilot | Menunggu fitur dirilis; belum tersedia pada kode saat ini |

Kuota tidak membatasi jumlah jurnal dan tidak menghapus histori karena usia. Aktivasi sekolah baru mengikuti kapasitas pilot; jangan mengklaim jumlah sekolah atau pengguna bersamaan sebelum uji beban. Jika butuh lebih dari satu unit atau tiga pengguna, tawarkan instalasi mandiri. Jika layanan mencapai kapasitas, prioritaskan daftar tunggu instansi baru daripada memutus pembukuan sekolah yang sudah aktif.

Pembatasan fitur tidak boleh merusak dependensi akuntansi: tagihan yang membentuk pendapatan diterima di muka tetap memerlukan pengakuan pendapatan. Laporan, audit, tutup buku, koreksi jurnal, dan ekspor tidak dijadikan alasan memaksa sekolah pindah. Template COA BOS tidak berarti integrasi atau kepatuhan pelaporan ARKAS otomatis.

## Pengalaman pengguna

Portal publik pada `sas.DOMAIN` (placeholder sampai domain dipilih) menyediakan empat tindakan utama: **Gunakan SAS Bersama**, **Unduh Open Source**, **Minta Bantuan Instalasi**, dan **Baca Panduan**.

Pendaftaran layanan bersama:

1. Sekolah mengisi nama instansi, identitas sekolah, dan email penanggung jawab. Hindari meminta data siswa saat pendaftaran.
2. Email diverifikasi; pengelola meninjau permohonan dan kapasitas layanan.
3. Sistem membuat database instansi, satu unit, COA awal, serta periode yang dipilih. Tidak ada transaksi atau akun demo.
4. Admin menerima tautan aktivasi sekali pakai yang kedaluwarsa, membuat sandi sendiri, dan mengundang operator/bendahara.
5. Panduan membantu mengisi rekening dan saldo awal dengan jurnal seimbang sebelum mulai transaksi harian.

Pada pilot, gunakan alamat `app.DOMAIN/s/<slug-sekolah>` agar sertifikat dan DNS sederhana. Konteks sekolah pada alamat harus diverifikasi terhadap sesi pengguna. Perubahan slug/ID melalui URL tidak memberi akses ke instansi lain. Subdomain per sekolah dapat ditambahkan ketika diperlukan.

Halaman fitur mandiri menjelaskan manfaat dan kebutuhan instalasi dengan bahasa sederhana. Contoh ajakan:

> Membutuhkan multi-unit, anggaran, rekonsiliasi bank, atau fitur pajak? Unduh SAS Mandiri dan jalankan di server sekolah. Jika membutuhkan bantuan instalasi, kami dapat membantu dengan kontribusi seikhlasnya.

Ajakan ditempatkan pada halaman perbandingan, pengaturan, atau menu fitur yang belum aktif. Respons penolakan akses langsung dari API harus menjelaskan alasan fitur tidak aktif, bukan hanya mengandalkan menu tersembunyi. Ekspor data tidak melewati formulir kontribusi.

## Bantuan instalasi seikhlasnya

Alur permintaan: konsultasi kebutuhan → pemeriksaan infrastruktur → penyepakatan pekerjaan dan biaya pihak ketiga → penjadwalan → instalasi → verifikasi bersama → serah terima → kontribusi sukarela.

Lingkup standar: memasang rilis SAS, mengatur HTTPS dan backup, membuat admin, mendemonstrasikan transaksi dan laporan, lalu menyerahkan panduan pembaruan/pemulihan. Migrasi data layanan bersama dapat disertakan jika disepakati. Penyesuaian fitur khusus dibahas sebagai pekerjaan terpisah agar antrean bantuan tetap dapat dikelola.

Nominal kontribusi diisi bebas, tanpa nominal minimum wajib; opsi belum dapat berkontribusi tetap diterima dan mengikuti antrean kapasitas. Waktu pengerjaan dan dukungan setelah serah terima disepakati, tidak dijanjikan otomatis tanpa batas. Donasi tidak perlu menjadi payment gateway atau langganan pada rilis awal.

Domain/VPS diupayakan terdaftar atas nama sekolah; akses admin diserahkan ke sekolah. Rahasia akses dikirim melalui sarana privat berumur pendek, tidak melalui formulir publik atau tiket dukungan. Akses sementara teknisi dicabut setelah serah terima, kecuali sekolah meminta pemeliharaan lanjutan.

## Kepemilikan dan perpindahan data

Sekolah memiliki dan dapat mengekspor data pembukuannya. Admin sekolah bisa meminta ekspor kapan saja, termasuk ketika instansi berada pada status baca-saja. Paket migrasi mencakup seluruh data bisnis instansi: COA, unit, periode, siswa, tagihan, pembayaran, jurnal/baris jurnal, referensi, serta audit bisnis. Jika suatu fitur mandiri diaktifkan kemudian, ekspor harus tetap membawa datanya.

Ekspor bukan unduhan seluruh database server: sesi, token undangan/reset, rahasia platform, dan data instansi lain tidak boleh ikut. Hash sandi pengguna dikecualikan dari paket portabel; setelah impor, administrator mengundang ulang pengguna untuk membuat sandi. Atribusi aktor audit dan relasi ID tetap dipertahankan.

Pemindahan final memakai jeda tulis singkat dengan waktu batas yang disepakati. Ekspor menyertakan versi aplikasi/skema, jumlah record, checksum, serta ringkasan saldo dan posisi piutang. Impor dilakukan ke database mandiri baru; duplikasi atau database tujuan yang tidak kosong ditolak pada versi awal.

Setelah saldo dan laporan cocok serta sekolah menyetujui serah terima, instalasi mandiri menjadi sumber pencatatan utama. Layanan bersama tetap baca-saja dengan akses ekspor selama usulan 30 hari. Penghapusan data hanya melalui prosedur yang disetujui penanggung jawab dan diselaraskan dengan retensi backup yang diumumkan.

## Usulan kebijakan operasional pilot

- Pembukaan awal 3–5 sekolah yang bersedia memberi umpan balik; batas ini untuk pendampingan, bukan klaim kapasitas server.
- Backup harian terenkripsi di penyimpanan berbeda dari VPS; retensi usulan 30 hari.
- Target awal pemulihan: kehilangan data maksimum 24 jam dan pemulihan 8 jam; **target internal yang harus diuji**, belum SLA untuk pengguna.
- Penanggung jawab data sekolah dan pengelola layanan harus jelas; siapkan pemberitahuan privasi, cakupan akses dukungan, serta prosedur insiden sebelum menerima data riil.
- Indikator layanan: tingkat kegagalan login/transaksi, durasi laporan, kapasitas DB/backup, umur antrean, permintaan instalasi, dan hasil uji restore.

## Tahap pelaksanaan

| Tahap | Hasil yang harus selesai sebelum lanjut |
| --- | --- |
| 1. Fondasi | Mode instalasi, kebijakan fitur server, pemisahan DB instansi, pengujian isolasi |
| 2. Portal dan provisioning | Persetujuan sekolah, bootstrap tanpa demo, undangan pengguna, panel platform |
| 3. Kelengkapan operasional | Ekspor/impor lintas instalasi, backup/restore, monitoring dan dokumentasi dukungan |
| 4. Pilot tertutup | Uji alur harian, laporan akuntansi, isolasi dua sekolah dan simulasi pemulihan |
| 5. Pembukaan bertahap | Domain/VPS siap, kuota ditetapkan dari pengukuran, panduan dan antrean bantuan aktif |

Rincian teknis: [ARSITEKTUR-LAYANAN.md](ARSITEKTUR-LAYANAN.md). Angka kuota, retensi, nama domain, serta target pemulihan tetap dapat disesuaikan sebelum pilot.
