# Operasional Tinitix

Dokumen ini menyiapkan prosedur. Hosting worker, notifikasi insiden, restore backup cloud, dan kebijakan bisnis final belum diverifikasi. Pembayaran nyata ditunda atas arahan pemilik.

## Worker mandiri

`render.yaml` mendefinisikan worker staging khusus (`tinitix-staging-worker`) di Render, region Singapore, memakai `Dockerfile.worker`, satu instance pada compute `0.5c-512mb`, dan deploy setelah pemeriksaan CI lulus. Paket compute ini berbayar; biaya final harus dibaca pada layar Render sebelum membuat service. Blueprint tidak menyimpan nilai secret. Saat membuat Blueprint dari repo GitHub, Render meminta `DATABASE_URL`, `APP_SECRET`, `RESEND_API_KEY`, dan `EMAIL_FROM`. Pakai database Neon staging, APP_SECRET yang sama dengan Preview Vercel, key Resend milik domain tinitix.id, dan `Tinitix <info@tinitix.id>`. `APP_URL` dan interval 30 detik sudah ada di Blueprint. Jangan menyalin credential ke Git atau chat.

Setelah service live, periksa log `maintenance: ok` berulang. Untuk acceptance, buat satu reservasi uji tanpa membayar, tutup browser/laptop, lalu periksa dari perangkat lain bahwa status menjadi expired dan stok kembali. Uji restart dengan menghentikan proses secara terkendali melalui fasilitas Render, lalu pastikan instance pulih dan batch berikutnya berhasil. Catat bukti di ACCEPTANCE.md. Jangan menganggap keberhasilan Blueprint sebagai bukti worker online sebelum pemeriksaan ini.

Jalankan di host Docker yang selalu hidup. Buat `.env.worker.local` pada host secara privat dengan `DATABASE_URL`, `APP_SECRET`, `APP_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, dan `WORKER_INTERVAL_MS=30000` yang sesuai staging. APP_SECRET wajib sama dengan aplikasi. File ini diabaikan Git dan build Docker.

```sh
docker compose -f compose.worker.yml up -d --build
docker compose -f compose.worker.yml logs --tail=100 worker
```

`restart: unless-stopped` memulai ulang proses yang crash. Worker mencoba lagi saat batch gagal. Verifikasi di host: hentikan paksa proses container, pastikan restart count bertambah dan batch berikutnya berhasil. Kemudian buat order tanpa pembayaran, tutup browser dan matikan laptop penguji; setelah expiry dan satu batch, periksa reservasi dilepas dari perangkat lain. Catat waktu dan ID order. Konfigurasi Docker saja belum membuktikan worker sudah online.

## Pemantauan

`npm run ops:check` mengeluarkan ringkasan JSON tanpa email, QR, atau credential. Exit code 1 menandai email habis retry, antrean terlambat lebih dari lima menit, payment_review, jumlah tiket tidak cocok, expiry tertunda, atau database tidak dapat diperiksa. Pasang command ini pada monitoring host dan hubungkan hasil gagal ke saluran operator. Saluran dan operator belum ditentukan.

Jika email gagal, periksa provider dan domain pengirim, lalu kirim ulang lewat admin setelah penyebab diperbaiki. Jangan menerbitkan tiket ulang. Gunakan log aplikasi/worker dengan waktu dan ID deployment; jangan menyalin QR, tautan akses, atau payload email ke laporan insiden.

## Transaksi yang perlu ditinjau

1. Cari order berstatus `payment_review`; simpan ID order, ID transaksi provider, nominal, waktu, operator, dan alasan di catatan insiden terbatas.
2. Setelah gateway tersedia, konfirmasi status langsung ke provider. Jangan mengubah `orders.status` lewat SQL untuk memaksa penerbitan tiket.
3. Refund manual memerlukan referensi refund provider, nominal, waktu, bukti, dan persetujuan operator yang berwenang. Cocokkan kembali dengan laporan provider. Fitur pencatatan refund terstruktur belum diimplementasikan.
4. Pembatalan event: hentikan penjualan, identifikasi semua order terdampak, tetapkan kebijakan refund dan komunikasi, lalu rekonsiliasi satu per satu. Status event cancelled menolak check-in; status ini sendiri tidak memindahkan uang.
5. Pembayaran sukses tanpa tiket harus ditinjau operator sebelum tindakan apa pun. Periksa kapasitas dan duplikasi, lalu selesaikan melalui prosedur provider yang disepakati.

## Deploy dan rollback

Setiap PR menjalankan CI dengan PostgreSQL terisolasi. Sebelum deploy: semua checks hijau, backup tersedia, daftar migrasi ditinjau, environment Preview benar, dan APP_URL cocok dengan alias staging. Jalankan migrasi terlebih dahulu. Migrasi 002 dan 003 hanya menambah index. Migrasi 003 sudah diterapkan pada staging; versi aplikasi aktif dan bukti pemeriksaan dicatat di ACCEPTANCE.md.

Deploy dengan `npx vercel --target preview`, lalu uji login, checkout simulasi, email, dan check-in. Catat commit serta URL deployment. Untuk rollback aplikasi, alihkan alias staging kembali ke URL deployment terakhir yang telah diuji melalui `vercel alias set`. Jangan menjalankan SQL downgrade atau mengembalikan backup di atas database aktif secara otomatis; pilih perbaikan maju jika skema telah berubah. Pertahankan APP_SECRET agar QR dan email lama tetap dapat digunakan.

## Backup dan restore

Aktifkan backup/PITR dari penyedia PostgreSQL dan tetapkan retensi bersama pemilik. Ambil logical backup memakai `pg_dump --format=custom --no-owner`; simpan file di penyimpanan privat terenkripsi, di luar repo. Gunakan secret manager untuk koneksi.

Pulihkan dengan `pg_restore --no-owner --no-acl` ke database kosong yang terpisah. Bandingkan jumlah dan nilai agregat orders, order_items, reservations, tickets, check_ins, payment_events, dan schema_migrations sebelum/sesudah. Dengan APP_SECRET yang sama, uji pembukaan order serta verifikasi QR lama pada lingkungan restore yang tidak mengirim email atau menerima pembayaran. Catat durasi restore dan usia backup. Jangan mengklaim restore berhasil sampai drill ini dijalankan pada backup layanan cloud yang dipakai.

## Sebelum pilot berbayar

Pemilik perlu menetapkan identitas penyelenggara, kontak dukungan, waktu layanan, biaya/pajak, kebijakan refund/pembatalan/perubahan jadwal, retensi data, dan penanganan insiden. Halaman terms/privacy masih menjelaskan pratinjau sampai keputusan tersebut disahkan. Gateway, refund, pemantauan, restore, dan simulasi petugas menjadi gerbang pilot. Batasi stok pilot dan rekonsiliasi pembayaran, jumlah tiket, serta check-in setiap hari. Jangan mulai pilot ketika bug kritis terbuka.
