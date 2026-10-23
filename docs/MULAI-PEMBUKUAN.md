# Memulai pembukuan tanpa jurnal lama

SAS menyediakan menu **Mulai Pembukuan** untuk admin, staf akuntansi, dan bendahara. Panduan ini tersedia pada aplikasi satu instansi saat ini; implementasi layanan banyak sekolah masih mengikuti rencana arsitektur terpisah.

## Sekolah baru tanpa data demo

Untuk database yang masih kosong, gunakan `.env` dengan:

```dotenv
SEED_MODE=school
SCHOOL_NAME="Nama Sekolah Anda"
INSTITUTION_NAME="Nama Instansi Anda"
```

Jalankan `npm run db:init` lalu `npm start`, atau `docker compose up -d --build` pada volume baru. Mode ini menyiapkan satu unit, 55 akun, periode tahun berjalan, kategori kas, rekening kas operasional, dan tiga akun: `admin1`, `operator`, serta `bendahara1` pada domain `SEED_EMAIL_DOMAIN`. Sandi awal mengikuti `SEED_PASSWORD`; produksi membutuhkan sandi unik minimal 12 karakter. Ganti kredensial sebelum digunakan bersama.

Tidak ada siswa, tagihan, atau jurnal demo. Login pertama pada unit yang belum mempunyai jurnal mengarah ke panduan. Mengubah `SEED_MODE` tidak membersihkan database yang sudah terisi. Jangan menjalankan `reset`/`seed` pada data riil untuk membuka panduan. Pada instalasi demo yang sudah terisi, gunakan unit sekolah baru dari Master Data untuk mencoba alurnya.

## Tiga langkah

1. **Tanggal mulai.** Tentukan tanggal transaksi pertama yang akan dicatat di SAS. Saldo awal adalah posisi tepat sebelum transaksi pertama pada tanggal tersebut. Tidak perlu mengetik ulang seluruh transaksi masa lalu.
2. **Saldo yang dimiliki.** Masukkan kas, bank, aset, utang, dan rincian piutang SPP. Isi aset neto dengan/tanpa pembatasan. Tombol hitung membantu menurunkan aset neto tanpa pembatasan dari aset dikurangi kewajiban dan dana dengan pembatasan; tetap periksa bukti dan klasifikasinya.
3. **Periksa dan ajukan.** Tinjau total aset, kewajiban, aset neto dan pasangan debit–kredit. Centang konfirmasi pemeriksaan bukti, lalu ajukan jurnal pembuka.

Nominal memakai rupiah dengan format Indonesia, misalnya `1.250.000,50`. Kolom aset/kewajiban kosong dianggap nol. Aset neto harus dikonfirmasi dengan angka, termasuk `0` jika tidak ada. Aset neto tanpa pembatasan boleh negatif jika memang defisit. Aset kontra seperti akumulasi penyusutan diisi sebagai nilai pengurang positif pada kolomnya.

Total aset harus sama dengan kewajiban ditambah aset neto. Selisih ditampilkan dan pengajuan yang tidak seimbang ditolak server. Jangan membuat nominal perkiraan hanya untuk menghilangkan selisih.

Jika semua saldo nol dan sudah dikonfirmasi, SAS hanya menyimpan tanggal mulai; tidak membuat jurnal kosong. Rekening kas operasional tetap tersedia agar transaksi pertama dapat dicatat.

## Piutang SPP lama

Masukkan siswa terlebih dahulu melalui **Piutang SPP → Siswa**, kemudian pilih siswa pada panduan saldo awal. Untuk setiap siswa, isi sisa tagihan dan jatuh tempo lama. Panduan menerima satu jumlah sisa historis per siswa dengan tanggal jatuh tempo yang diverifikasi; untuk rincian banyak tagihan/umur tunggakan per siswa gunakan pendampingan migrasi terperinci.

Fitur ini hanya untuk layanan pendidikan sebelum tanggal mulai yang pendapatannya sudah diakui. Tagihan masa depan atau SPP diterima di muka tidak boleh diperlakukan sebagai piutang historis ini. Saldo piutang agregat akun 1131, CKPN awal 1139, dan pendapatan diterima di muka SPP 2120 sengaja tidak dapat diisi melalui kolom umum agar tidak menghasilkan buku pembantu yang berbeda dengan buku besar. Kondisi tersebut perlu pengaturan terperinci bersama bendahara.

Saat jurnal disetujui, tagihan historis muncul pada daftar tagihan dan aging. Tagihan dapat dicicil/dilunasi lewat alur pembayaran SPP. Sistem tidak mengamortisasi ulang pendapatan historisnya. Saldo kas/bank yang diisi juga dihubungkan ke rekening unit bila belum tersedia; lengkapi nama bank dan nomor rekening melalui Kas & Bank.

## Persetujuan dan koreksi

Jurnal pembuka disimpan berstatus **Menunggu**, belum memengaruhi saldo laporan. Bendahara/admin memeriksa dan menyetujui melalui Jurnal Umum. Hanya setelah posting, saldo masuk laporan dan tagihan historis diterbitkan. Semua perubahan terkait berada dalam satu transaksi database.

Transaksi harian unit menunggu persetujuan jurnal pembuka. Setelah pengaturan awal tersimpan, server juga menolak transaksi bertanggal sebelum tanggal mulai pembukuan. Ini mencegah pencatatan ganda sebelum posisi saldo awal yang sudah dipilih.

Jika data belum benar, bendahara/admin dapat menolak jurnal; panduan kemudian dapat diisi ulang. Jurnal yang sudah ditolak tetap tersimpan untuk jejak pemeriksaan. Jurnal yang sudah diposting tidak dapat diedit. Pembalikan pembuka hanya diizinkan sebelum ada jurnal posted/pending/reversed lain yang menyentuh unit; tagihan historis pembuka ikut dibatalkan. Setelah ada transaksi lanjutan, koreksi memerlukan pendampingan agar buku besar dan buku pembantu tetap cocok. Panduan tidak dapat digunakan untuk menambahkan saldo awal kedua kalinya.

## Pengujian

Tes meliputi bootstrap sekolah tanpa demo, penghitungan/validasi nominal dan tanggal, otorisasi unit, saldo tidak seimbang, pengajuan bersamaan, penolakan lalu pengisian ulang, periode terkunci, saldo nol, pembayaran/aging piutang historis dan pembalikan. Tes DOM menjalankan skrip antarmuka dengan API Express dan PostgreSQL sebenarnya; pemeriksaan ini bukan pengganti inspeksi tampilan pada browser/perangkat nyata.
