# Status penerimaan Tinitix — 7 Oktober 2026

Status layanan nyata dibedakan dari bukti lokal. Lulus tes lokal tidak menyelesaikan acceptance staging atau kesiapan penjualan nyata.

| ID | Status | Bukti / sisa pekerjaan |
| --- | --- | --- |
| B1 | Lulus staging | [Preview HTTPS](https://tinitix-staging-preview.vercel.app) terhubung ke Neon PostgreSQL khusus staging. Migrasi `001_initial` dan `002_order_listing` diterapkan; pemeriksaan database, migrasi, dan admin terverifikasi berhasil. Login admin di deployment Preview merespons HTTP 200. |
| B2 | Berjalan | Blob `tinitix-staging-posters` terhubung ke Preview. Upload lewat admin staging dan email inbox nyata belum diuji; domain email belum dipilih. |
| B3 | Container terverifikasi, host belum | CI berhasil membangun image Node 24, menjalankan satu batch worker dengan PostgreSQL, dan menjalankan ops:check. Compose mengatur restart proses. Host online, uji crash/restart, dan uji laptop mati belum tersedia. |
| B4 | Lulus lokal, staging belum | Browser dengan PostgreSQL terisolasi: admin login/publish, tamu checkout couple, simulasi paid, dua QR, tautan email antrean, dua check-in dan penolakan scan ulang. Belum mengirim email nyata atau menguji kamera fisik. |
| B5 | Lulus PostgreSQL lokal | PostgreSQL 17, koneksi paralel: stok terakhir satu pemenang, QR bersamaan satu valid, checkout/settlement duplikat/expiry tetap konsisten. Perlu ulang pada deployment staging. |
| B6 | Ditunda pemilik | Pilihan gateway dan akun merchant belum ditetapkan. |
| B7 | Belum selesai | Prosedur awal di OPERATIONS.md; pencatatan kasus/refund terstruktur dan alur provider menunggu B6. |
| B8 | Persiapan tersedia | Pemeriksaan antrean/transaksi dan runbook deploy/rollback/restore tersedia. Monitor online, drill restore cloud, dan kebijakan bisnis final belum tersedia. |
| B9 | Lulus CI | GitHub Actions menjalankan type-check, tes PostgreSQL, build, dan browser database terisolasi. [Run dengan patch dependency dan worker berhasil](https://github.com/rizkyvanasry/tinitix/actions/runs/37516248884). |
| B10 | Lulus lokal | Search server, pagination 50 baris, ekspor streaming semua hasil. Tes 1.205 order termasuk timestamp mikrodetik, tidak ada duplikasi/hilang dan organisasi lain tidak terlihat. |
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
- Deployment Preview aktif: `tinitix-staging-2i6vs4vbp-naskara-ai.vercel.app` (redeploy aplikasi commit `e686831` setelah koneksi Neon).
- Perubahan setelah commit aplikasi tersebut hanya menambah pemeriksaan CI dan laporan bukti.
- Akses dilindungi login Vercel. `/api/auth/me` merespons normal dan login admin lewat API berhasil di Preview. Database masih belum berisi event atau data pembeli nyata.
- APP_SECRET/CRON_SECRET disimpan sebagai secret pada Preview dengan izin pemilik. Blob khusus poster terhubung ke Preview. Password sementara admin hanya tersimpan dalam file lokal terabaikan Git `.vercel/admin-login.txt`.
- Deployment pertama otomatis dibuat Vercel sebagai Production pada project staging baru; deployment Preview terpisah di atas yang dipakai untuk tahap simulasi. Project website `naskara-ai` tidak diubah.
