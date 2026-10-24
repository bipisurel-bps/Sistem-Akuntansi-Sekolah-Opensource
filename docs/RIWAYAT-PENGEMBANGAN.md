# Riwayat pengembangan SAS

Catatan ini merangkum pengembangan fork SAS, bukan seluruh sejarah basis kode. Tanggal mengikuti commit lokal. Daftar lengkap: `git log --oneline`; rincian perubahan: `git show <commit>`.

## 24 Oktober 2026 — atribusi pengembangan

- Menambahkan nama bipi (jaddadeveloper) dan pesan kemanfaatan bersama pada footer halaman produk, login dan ruang kerja aplikasi.
- Menambahkan halaman `/app#/tentang` yang menjelaskan pengembangan SAS, apresiasi basis sikeu-tazkia, serta lisensi MIT yang tetap berlaku.
- Menambahkan pengujian atribusi; pesan sosial tidak menjadi pembatasan penggunaan nonkomersial.
- Mempertahankan MIT sesuai keputusan pemilik; keseluruhan suite lulus 83 tes.

## 24 Oktober 2026 — dokumentasi serah-terima (`b7874cf`)

- Menambahkan panduan untuk melanjutkan pengembangan, membuat repositori GitHub mandiri, dan menyiapkan deployment internet.
- Mencatat batas fitur, status pengujian dan pekerjaan sebelum produksi.
- Tidak mengubah lisensi maupun menjalankan deployment.

## 23 Oktober 2026 — halaman produk (`ac73715`)

- Menjadikan `/` halaman pengantar SAS: manfaat, contoh antarmuka, FAQ dan pilihan penggunaan.
- Memindahkan shell aplikasi ke `/app`; login berhasil menuju ruang kerja tersebut. Tautan hash lama diarahkan ke alamat baru.
- Menambahkan simulasi jurnal di browser tanpa akun dan tanpa menulis ke database.
- Menambahkan unduhan sumber ZIP dan panduan instalasi; paket mengecualikan env privat, database, backup dan Git.
- Menambahkan enam tes halaman produk; keseluruhan suite saat itu lulus 82 tes.

## 23 Oktober 2026 — mulai pembukuan (`dba0a66`)

- Menambahkan `SEED_MODE=school` untuk menyiapkan master tanpa transaksi demo pada database kosong.
- Menambahkan panduan tanggal mulai, saldo awal, pemeriksaan debit/kredit dan pengajuan jurnal pembuka.
- Menghubungkan piutang SPP historis ke tagihan saat jurnal disetujui, tanpa mengakui ulang pendapatan historis.
- Menambahkan pemeriksaan otorisasi, pengajuan ganda, pembalikan dan interaksi formulir.
- Keseluruhan suite saat itu lulus 76 tes.

## 23 Oktober 2026 — konsep layanan (`e5e2ebc`)

- Menyusun konsep SAS Mandiri dan layanan SAS Bersama dengan fitur terbatas.
- Mendokumentasikan rancangan isolasi instansi dan bantuan instalasi dengan kontribusi sukarela.
- Ini dokumen rencana; bukan implementasi layanan multi-sekolah.

## 23 Oktober 2026 — adaptasi awal (`a3c51da`)

- Mengadaptasi basis sikeu-tazkia menjadi Sistem Akuntansi Sekolah (SAS) Open Source.
- Menggeneralisasi identitas melalui environment, istilah sekolah, contoh unit dan master COA.
- Menyesuaikan konfigurasi instalasi, startup database, Docker, tes dan dokumentasi.
- Mempertahankan mesin akuntansi serta pemberitahuan lisensi MIT asal.

Commit ini merupakan impor awal ke Git baru. Jumlah berkas/baris yang ditampilkan `git show --stat a3c51da` mencakup kode warisan; **bukan ukuran kontribusi baru SAS**.

## Asal kode

Basis: [galihsidik86/sikeu-tazkia](https://github.com/galihsidik86/sikeu-tazkia), snapshot `c9d14ea3ea5556a7b8e047601bf03ddac4f47405`. Riwayat Git asal tidak ikut pada repositori lokal yang diinisialisasi ulang. Detail adaptasi ada di [ADAPTASI.md](ADAPTASI.md); pemberitahuan hak cipta asli tetap berada di [LICENSE](../LICENSE).

Lisensi saat catatan ini dibuat masih MIT. AGPLv3 telah dibahas tetapi belum diterapkan. Setiap perubahan berikutnya perlu mencatat dampak pada data, konfigurasi, pengujian dan atribusi bila relevan.
