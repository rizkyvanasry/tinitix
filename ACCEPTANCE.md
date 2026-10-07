# Status penerimaan Tinitix — 7 Oktober 2026

Status layanan nyata dibedakan dari bukti lokal. Lulus tes lokal tidak menyelesaikan acceptance staging atau kesiapan penjualan nyata.

| ID | Status | Bukti / sisa pekerjaan |
| --- | --- | --- |
| B1 | Lulus staging | [Preview HTTPS](https://tinitix-staging-preview.vercel.app) terhubung ke Neon PostgreSQL khusus staging. Migrasi `001_initial`, `002_order_listing`, dan `003_report_payments` diterapkan; pemeriksaan database, migrasi, dan admin terverifikasi berhasil. Login admin di deployment Preview merespons HTTP 200. |
| B2 | Berjalan | Blob `tinitix-staging-posters` terhubung ke Preview. Upload lewat admin staging dan email inbox nyata belum diuji; domain email belum dipilih. |
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
- Deployment Preview aktif: `tinitix-staging-q45i4on7s-naskara-ai.vercel.app`, ID `dpl_5XGyz7DqPY8hLqpnxp963hXZZRXQ`.
- Commit aplikasi: `ca1811b5f85921482a74c9bc96e25b494cc785f5` (laporan penjualan dan ekspor Excel). Pembaruan dokumen penerimaan setelah commit ini tidak mengubah aplikasi.
- Diverifikasi ulang 7 Oktober 2026, sekitar 23.12 WIB: Vercel Ready / Preview; login admin HTTP 200; katalog HTTP 200 dengan enam event; unduhan laporan HTTP 200 dan workbook terbaca dengan keenam sheet.
- Event yang dipakai untuk smoke laporan: `event_da88b1fb469c3a897c5198d6`. Workbook saat verifikasi berisi satu order dan satu tiket. Pemeriksaan ini tidak membuat pembelian atau mengubah data pelanggan.
- Database mengonfirmasi `001_initial.sql`, `002_order_listing.sql`, dan `003_report_payments.sql` sudah diterapkan. Tidak perlu menerapkan ulang migrasi 003.
- Akses masih dilindungi login Vercel. Penguji email/ponsel harus memiliki akses Preview; sukses kirim provider saja tidak membuktikan tautan dapat dibuka penguji.
- APP_SECRET/CRON_SECRET tersimpan sebagai secret Preview. Blob khusus poster terhubung. Kredensial admin hanya tersimpan lokal dan diabaikan Git; file login/cookie sementara verifikasi sudah dihapus.
- RESEND_API_KEY dan EMAIL_FROM belum terpasang pada Preview. Domain pengirim, inbox penguji, dan host worker belum dikonfirmasi.
- Project website `naskara-ai` tidak diubah; nama workspace Vercel tersebut menaungi project terpisah `tinitix-staging`.

## Urutan lanjutan pemilik (7 Oktober 2026)

| Langkah | Status | Bukti / ketergantungan |
| --- | --- | --- |
| 1. Preview, migrasi, login, katalog, Excel | Selesai | Bukti live dan commit tercatat di atas. |
| 2. Domain pengirim dan inbox nyata | Menunggu akses | Perlu domain yang dikuasai pemilik, akses DNS/Resend, konfigurasi pengirim, serta konfirmasi inbox penguji. |
| 3. Worker selalu online | Menunggu host | Dockerfile dan restart policy tersedia; belum ada host yang dapat diakses. Harus dibuktikan crash/restart, expiry, dan retry email dari perangkat lain. |
| 4. Uji lapangan staging | Belum selesai | Otomasi browser PostgreSQL terisolasi sudah lulus, termasuk couple, check-in dan Excel. Dua ponsel fisik, inbox nyata, host mandiri, dan perebutan stok melalui deployment masih perlu dijalankan. |
| 5. Gateway dan aturan bisnis | Ditunda pemilik | Pemilik menegaskan kembali pembayaran nyata tetap ditunda pada sesi ini. |
| 6. Pembayaran nyata dan rekonsiliasi | Ditunda | Menunggu langkah 5. |
| 7. Pilot berbayar | Belum dapat dimulai | Menunggu langkah 4 dan 6 serta monitor, restore, kebijakan final, dan latihan petugas. |

### Checklist bukti lapangan

Isi setiap baris dengan waktu WIB, ID event/order, hasil aktual, dan referensi bukti tersensor. Jangan menyalin tautan akses atau QR.

- [ ] Domain pengirim berstatus terverifikasi pada Resend; alamat pengirim sesuai domain.
- [ ] Event uji dipublikasikan admin; satu pembelian couple dibayar simulasi.
- [ ] Provider menerima email; penguji secara terpisah mengonfirmasi inbox, bukan hanya antrean/provider.
- [ ] Tautan dari inbox dibuka pada perangkat penguji dan menampilkan dua QR berbeda.
- [ ] Ponsel A dan B check-in; scan ulang ditolak. Scan serentak QR sama menghasilkan satu valid.
- [ ] Dua checkout serentak memperebutkan satu stok; hanya satu reservasi berhasil.
- [ ] Worker online melepaskan reservasi setelah expiry tanpa kunjungan website dan saat laptop mati.
- [ ] Crash worker di host menghasilkan restart dan batch berikutnya berhasil.
- [ ] Gangguan email sementara diuji secara terkendali; retry berhasil tanpa menerbitkan tiket ulang.
- [ ] Order, pembayaran simulasi, tiket, check-in, dan laporan Excel cocok; temuan kritis dicatat dan diselesaikan.
