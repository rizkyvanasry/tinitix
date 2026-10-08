# Status penerimaan Tinitix — 7 Oktober 2026

Status layanan nyata dibedakan dari bukti lokal. Lulus tes lokal tidak menyelesaikan acceptance staging atau kesiapan penjualan nyata.

| ID | Status | Bukti / sisa pekerjaan |
| --- | --- | --- |
| B1 | Lulus staging | [Preview HTTPS](https://tinitix-staging-preview.vercel.app) terhubung ke Neon PostgreSQL khusus staging. Migrasi `001_initial`, `002_order_listing`, dan `003_report_payments` diterapkan; pemeriksaan database, migrasi, dan admin terverifikasi berhasil. Login admin di deployment Preview merespons HTTP 200. |
| B2 | Berjalan | Blob `tinitix-staging-posters` terhubung ke Preview. Domain tinitix.id dilaporkan Verified oleh pemilik. Resend menerima dua email uji couple pada 8 Oktober; penguji mengonfirmasi tautan email berhasil menampilkan dua QR pada 8 Oktober. Upload lewat admin staging belum diuji. |
| B3 | Container terverifikasi, host belum | CI berhasil membangun image Node 24, menjalankan satu batch worker dengan PostgreSQL, dan menjalankan ops:check. Compose mengatur restart proses. Host online, uji crash/restart, dan uji laptop mati belum tersedia. |
| B4 | Lulus lokal, staging belum | Browser dengan PostgreSQL terisolasi: admin login/publish, tamu checkout couple, simulasi paid, dua QR, tautan email antrean, dua check-in dan penolakan scan ulang. Belum mengirim email nyata atau menguji kamera fisik. |
| B5 | Lulus PostgreSQL lokal | PostgreSQL 17, koneksi paralel: stok terakhir satu pemenang, QR bersamaan satu valid, checkout/settlement duplikat/expiry tetap konsisten. Perlu ulang pada deployment staging. |
| B6 | Ditunda pemilik | Pilihan gateway dan akun merchant belum ditetapkan. |
| B7 | Belum selesai | Prosedur awal di OPERATIONS.md; pencatatan kasus/refund terstruktur dan alur provider menunggu B6. |
| B8 | Persiapan tersedia | Pemeriksaan antrean/transaksi dan runbook deploy/rollback/restore tersedia. Monitor online, drill restore cloud, dan kebijakan bisnis final belum tersedia. |
| B9 | Lulus CI | GitHub Actions menjalankan type-check, tes PostgreSQL, build, dan browser database terisolasi. [Run dengan patch dependency dan worker berhasil](https://github.com/rizkyvanasry/tinitix/actions/runs/37516248884). |
| B10 | Lulus lokal dan smoke staging | Search server, pagination 50 baris, ekspor streaming semua hasil. Tes 1.205 order termasuk timestamp mikrodetik, tidak ada duplikasi/hilang dan organisasi lain tidak terlihat. Workbook enam sheet diuji dengan 1.205 pesanan paid dan 2.410 tiket; unduhan live staging HTTP 200 dan keenam sheet berhasil dibaca. |
| B11 | Belum dapat dimulai | Menunggu gateway, operasional, rekonsiliasi, serta simulasi petugas. |

## Bukti yang sudah dijalankan

- `npm run typecheck`: lulus sebelum deployment.
- `npm test` dengan PGlite: 24 tes lulus.
- `npm test` dengan TEST_DATABASE_URL PostgreSQL 17: 24 tes lulus; setiap suite memakai schema unik dan menghapus hanya schema miliknya.
- `npm run test:browser:db`: satu alur lengkap lulus; source email dibaca dari antrean, bukan inbox provider.
- `npm run build`: lulus lokal Next.js 16.3.5; patch Next.js 16.3.6 kemudian lulus build serta seluruh tes pada CI dan build deployment Vercel.
- Bug origin login yang ditemukan tes browser diperbaiki: request POST harus berasal dari origin APP_URL; origin asing tetap ditolak.

## Catatan bukti staging yang perlu diisi

Catat URL/commit deployment, waktu WIB, ID event/order, hasil yang diharapkan/aktual, dan referensi bukti tersensor. Jangan simpan password, QR, token akses, atau koneksi database di dokumen ini. Untuk uji email, penerimaan di inbox penguji harus dikonfirmasi secara terpisah dari respons provider. Untuk worker, rekam hasil dari perangkat lain saat laptop penguji mati.

Dependency: lockfile diperbarui ke Next.js 16.3.6 dan patch transitive; npm audit pada lockfile menghasilkan nol temuan. CI dan worker menggunakan Node.js 24 sesuai engine dependency. Validasi patch dilakukan pada CI cloud karena disk lokal hampir penuh.

## Deployment yang aktif

- Alias staging: https://tinitix-staging-preview.vercel.app
- Deployment Preview aktif: `tinitix-staging-rf4zw8wn1-naskara-ai.vercel.app`, ID `dpl_Cp4CQuhmMspc4gV7qcZiTFXY4bQT`.
- Commit sumber deployment: `8a94574` (aplikasi laporan dari `ca1811b`, berikut pembaruan dokumentasi). Redeploy 8 Oktober mengaktifkan konfigurasi email Preview; pembaruan dokumentasi setelahnya tidak mengubah aplikasi.
- Diverifikasi ulang 7 Oktober 2026, sekitar 23.12 WIB: Vercel Ready / Preview; login admin HTTP 200; katalog HTTP 200 dengan enam event; unduhan laporan HTTP 200 dan workbook terbaca dengan keenam sheet.
- Event yang dipakai untuk smoke laporan: `event_da88b1fb469c3a897c5198d6`. Workbook saat verifikasi berisi satu order dan satu tiket. Pemeriksaan ini tidak membuat pembelian atau mengubah data pelanggan.
- Database mengonfirmasi `001_initial.sql`, `002_order_listing.sql`, dan `003_report_payments.sql` sudah diterapkan. Tidak perlu menerapkan ulang migrasi 003.
- Akses masih dilindungi login Vercel. Penguji email/ponsel harus memiliki akses Preview; sukses kirim provider saja tidak membuktikan tautan dapat dibuka penguji.
- APP_SECRET/CRON_SECRET tersimpan sebagai secret Preview. Blob khusus poster terhubung. Kredensial admin hanya tersimpan lokal dan diabaikan Git; file login/cookie sementara verifikasi sudah dihapus.
- RESEND_API_KEY (huruf besar) dan EMAIL_FROM tersedia sebagai Sensitive pada Preview. Domain tinitix.id Verified menurut konfirmasi pemilik. Resend menerima dua email uji; penguji mengonfirmasi tautan email menampilkan dua QR. Host worker masih menunggu. Nama lama resend_api_key huruf kecil tidak dipakai aplikasi.
- Project website `naskara-ai` tidak diubah; nama workspace Vercel tersebut menaungi project terpisah `tinitix-staging`.

## Urutan lanjutan pemilik (7 Oktober 2026)

| Langkah | Status | Bukti / ketergantungan |
| --- | --- | --- |
| 1. Preview, migrasi, login, katalog, Excel | Selesai | Bukti live dan commit tercatat di atas. |
| 2. Domain pengirim dan inbox nyata | Lulus staging | Domain Verified, konfigurasi Preview aktif, dua email diterima API Resend; pemilik mengonfirmasi tautan email menampilkan dua QR pada 8 Oktober 2026. |
| 3. Worker selalu online | Menunggu host | Dockerfile dan restart policy tersedia; belum ada host yang dapat diakses. Harus dibuktikan crash/restart, expiry, dan retry email dari perangkat lain. |
| 4. Uji lapangan staging | Belum selesai | Otomasi browser PostgreSQL terisolasi sudah lulus, termasuk couple, check-in dan Excel. Dua ponsel fisik, inbox nyata, host mandiri, dan perebutan stok melalui deployment masih perlu dijalankan. |
| 5. Gateway dan aturan bisnis | Ditunda pemilik | Pemilik menegaskan kembali pembayaran nyata tetap ditunda pada sesi ini. |
| 6. Pembayaran nyata dan rekonsiliasi | Ditunda | Menunggu langkah 5. |
| 7. Pilot berbayar | Belum dapat dimulai | Menunggu langkah 4 dan 6 serta monitor, restore, kebijakan final, dan latihan petugas. |

### Checklist bukti lapangan

Isi setiap baris dengan waktu WIB, ID event/order, hasil aktual, dan referensi bukti tersensor. Jangan menyalin tautan akses atau QR.

- [x] Domain pengirim berstatus terverifikasi pada Resend (konfirmasi pemilik); konfigurasi pengiriman diterima provider.
- [ ] Event uji dipublikasikan admin; satu pembelian couple dibayar simulasi.
- [x] Provider menerima email; penguji mengonfirmasi keberhasilan alur email dengan balasan "ok qr sudah tampil" pada 8 Oktober 2026.
- [x] Tautan email dibuka penguji dan dua QR tampil; API order juga mengonfirmasi dua ID tiket berbeda.
- [ ] Ponsel A dan B check-in; scan ulang ditolak. Scan serentak QR sama menghasilkan satu valid.
- [ ] Dua checkout serentak memperebutkan satu stok; hanya satu reservasi berhasil.
- [ ] Worker online melepaskan reservasi setelah expiry tanpa kunjungan website dan saat laptop mati.
- [ ] Crash worker di host menghasilkan restart dan batch berikutnya berhasil.
- [ ] Gangguan email sementara diuji secara terkendali; retry berhasil tanpa menerbitkan tiket ulang.
- [ ] Order, pembayaran simulasi, tiket, check-in, dan laporan Excel cocok; temuan kritis dicatat dan diselesaikan.


## Bukti email staging - 8 Oktober 2026

- Nama variabel secret diperbaiki dengan menambahkan RESEND_API_KEY sesuai huruf besar yang dibaca aplikasi; nilai secret tidak ditampilkan atau disimpan di Git.
- Pembelian uji pada event Midnight Frequency: order `TIX_478ab67d751811e33f727c8e`, satu Presale 1 Couple Ticket. Checkout HTTP 201, pembayaran simulasi HTTP 200; pembacaan API order mengonfirmasi paid dan dua ID tiket berbeda.
- Setelah redeploy, maintenance terautentikasi HTTP 200 mengembalikan `sent: 2, configured: true`. Kedua email checkout/pembayaran untuk penguji tercatat sent; ini membuktikan penerimaan API provider, bukan penerimaan inbox.
- Tiga email sebelum Resend aktif berisi tautan kedaluwarsa (lebih dari 24 jam) ditandai expired dan dicatat di audit_logs. Pesan disimpan sebagai bukti dan tidak dikirim ulang.
- Pengiriman ini dipicu manual lewat endpoint maintenance. Belum membuktikan worker online mandiri, retry setelah gangguan, atau operasi saat laptop mati.
- Tautan menggunakan alias Preview HTTPS yang masih dilindungi login Vercel. Pada 8 Oktober 2026, pemilik menjawab "ok qr sudah tampil" setelah diminta memeriksa email dan membuka tautannya. Uji email sampai dua QR dinyatakan lulus berdasarkan konfirmasi penguji; pemindaian fisik belum diuji.
