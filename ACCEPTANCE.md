# Status penerimaan Tinitix — 7 Oktober 2026

Status layanan nyata dibedakan dari bukti lokal. Lulus tes lokal tidak menyelesaikan acceptance staging atau kesiapan penjualan nyata.

| ID | Status | Bukti / sisa pekerjaan |
| --- | --- | --- |
| B1 | Berjalan | Project Vercel `tinitix-staging` dibuat terpisah. PostgreSQL cloud, migrasi cloud, admin pemilik, dan deployment HTTPS belum selesai. |
| B2 | Berjalan | Blob `tinitix-staging-posters` terhubung ke Preview. Upload lewat admin staging dan email inbox nyata belum diuji; domain email belum dipilih. |
| B3 | Persiapan tersedia | Worker Node tersedia; Dockerfile dan Compose menyiapkan proses mandiri dengan restart. Host online dan uji laptop mati belum tersedia. |
| B4 | Lulus lokal, staging belum | Browser dengan PostgreSQL terisolasi: admin login/publish, tamu checkout couple, simulasi paid, dua QR, tautan email antrean, dua check-in dan penolakan scan ulang. Belum mengirim email nyata atau menguji kamera fisik. |
| B5 | Lulus PostgreSQL lokal | PostgreSQL 17, koneksi paralel: stok terakhir satu pemenang, QR bersamaan satu valid, checkout/settlement duplikat/expiry tetap konsisten. Perlu ulang pada deployment staging. |
| B6 | Ditunda pemilik | Pilihan gateway dan akun merchant belum ditetapkan. |
| B7 | Belum selesai | Prosedur awal di OPERATIONS.md; pencatatan kasus/refund terstruktur dan alur provider menunggu B6. |
| B8 | Persiapan tersedia | Pemeriksaan antrean/transaksi dan runbook deploy/rollback/restore tersedia. Monitor online, drill restore cloud, dan kebijakan bisnis final belum tersedia. |
| B9 | Implementasi tersedia | GitHub Actions menjalankan type-check, tes PostgreSQL, build, dan browser database terisolasi. Eksekusi pertama di GitHub perlu dicatat setelah push. |
| B10 | Lulus lokal | Search server, pagination 50 baris, ekspor streaming semua hasil. Tes 1.205 order termasuk timestamp mikrodetik, tidak ada duplikasi/hilang dan organisasi lain tidak terlihat. |
| B11 | Belum dapat dimulai | Menunggu gateway, operasional, rekonsiliasi, serta simulasi petugas. |

## Bukti yang sudah dijalankan

- `npm run typecheck`: lulus sebelum deployment.
- `npm test` dengan PGlite: 24 tes lulus.
- `npm test` dengan TEST_DATABASE_URL PostgreSQL 17: 24 tes lulus; setiap suite memakai schema unik dan menghapus hanya schema miliknya.
- `npm run test:browser:db`: satu alur lengkap lulus; source email dibaca dari antrean, bukan inbox provider.
- `npm run build`: lulus Next.js 16.3.5.
- Bug origin login yang ditemukan tes browser diperbaiki: request POST harus berasal dari origin APP_URL; origin asing tetap ditolak.

## Catatan bukti staging yang perlu diisi

Catat URL/commit deployment, waktu WIB, ID event/order, hasil yang diharapkan/aktual, dan referensi bukti tersensor. Jangan simpan password, QR, token akses, atau koneksi database di dokumen ini. Untuk uji email, penerimaan di inbox penguji harus dikonfirmasi secara terpisah dari respons provider. Untuk worker, rekam hasil dari perangkat lain saat laptop penguji mati.
