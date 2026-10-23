# Halaman pengantar SAS

Halaman ini membantu pengunjung memahami aplikasi sebelum masuk ke ruang kerja. Gaya editorial memakai warna plum, latar hangat, tipografi serif dan ilustrasi antarmuka berbasis HTML/CSS; tidak membutuhkan gambar besar. Animasi menghormati preferensi pengurangan gerak.

## Alur pengunjung

- `/`: manfaat, contoh tampilan, langkah pembukuan awal, pilihan SAS Mandiri/Bersama, FAQ dan ajakan mencoba.
- Tombol **Coba demo interaktif**: simulasi jurnal penerimaan/pengeluaran di perangkat pengunjung. Bukan transaksi nyata; tidak dikirim ke database dan tidak tersimpan setelah halaman dimuat ulang.
- `/app`: ruang kerja aplikasi yang sudah ada, dengan pemeriksaan sesi/akses tetap berlaku.
- `/login`: masuk untuk pengguna yang sudah mempunyai akun.
- `/download/sas-opensource.zip`: unduh sumber SAS untuk instalasi mandiri.
- `/download/panduan-instalasi.md`: unduh README sebagai panduan.

Tautan hash lama (`/#/…`) diarahkan ke `/app#/…`. SAS Bersama ditandai **dalam persiapan**; belum ada pendaftaran atau isolasi banyak sekolah independen. Halaman tidak menawarkan fitur itu sebagai layanan aktif.

## Kontak bantuan

Isi `SUPPORT_EMAIL` pada environment dengan alamat publik yang benar, lalu restart server. Tanpa alamat ini, dialog bantuan menampilkan informasi bahwa kontak akan diumumkan serta tautan panduan; tidak membuat alamat palsu. Bantuan instalasi dapat memakai kontribusi sukarela, sedangkan domain/VPS tetap biaya pihak ketiga. Lisensi kode tetap MIT.

## Paket kode unduhan

Jalankan `npm run release` setelah mengubah sumber pada proses yang sudah berjalan. `npm start` dan `npm run dev` menjalankannya otomatis; Docker membangunnya saat image dibuat. Output berada di `release/sas-opensource.zip` dan tidak dilacak Git. Ekstrak folder `sas-opensource`, baca README, lalu ikuti instalasi Docker atau manual.

Builder `src/release.js` memakai daftar direktori/berkas sumber yang diizinkan. Paket tidak menyertakan `.env` privat, `.git`, database, backup, sesi, `node_modules` atau symlink. Contoh environment ikut disertakan. Jangan menyimpan rahasia di berkas sumber: sumber memang dapat diunduh publik. Endpoint tidak menerima path berkas dari pengguna. Jika arsip belum dibangun, unduhan mengembalikan status 503.

## Pemeriksaan

Tes otomatis memeriksa pemisahan halaman/aplikasi, tautan, navigasi keyboard, menu mobile, simulasi seimbang dan validasi input, serta isi paket unduhan. Rendering browser nyata dan screenshot belum diverifikasi pada host Android ini. Jalankan pemeriksaan visual desktop/mobile sebelum publikasi. Font memakai Google Fonts dengan fallback lokal; aset utama halaman tidak bergantung pada gambar eksternal.
