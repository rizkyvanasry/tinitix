# Setup staging tinitix

Status terbaru ada di [ACCEPTANCE.md](ACCEPTANCE.md). Project Vercel `tinitix-staging` dan Blob khusus Preview telah dibuat. [Preview HTTPS](https://tinitix-staging-preview.vercel.app) aktif dan dilindungi login Vercel; database cloud dan pengiriman email masih menunggu setup. Workspace Vercel bernama `naskara-ai`; project website lain di workspace itu tidak diubah.

## 1. Siapkan layanan

- Buat proyek Neon khusus `tinitix-staging`. Pada dialog Connect, pilih database staging dan salin connection string PostgreSQL dengan pooling dan pengaturan TLS dari penyedia ke `DATABASE_URL`. Jangan memakai database produksi. [Panduan Neon](https://neon.com/docs/get-started-with-neon/connect-neon).
- Buat akun Resend, tambahkan domain/subdomain yang kamu kuasai, pasang record DNS yang diminta, lalu tunggu status verified. Buat API key pengiriman; isi `RESEND_API_KEY` dan `EMAIL_FROM`, misalnya `tinitix Staging <tickets@staging.domainmu.id>`. Domain contoh harus diganti. [Verifikasi domain Resend](https://resend.com/docs/dashboard/domains/introduction).
- Buat proyek Vercel `tinitix-staging` dengan preset Next.js. Buat Blob store **Public**, hubungkan ke Preview, dan simpan `BLOB_READ_WRITE_TOKEN` untuk pengujian lokal. Implementasi poster menggunakan public Blob, JPEG/PNG/WebP, maksimal 2 MB. [Setup Blob](https://vercel.com/docs/vercel-blob/using-blob-sdk).

Akun, domain, dan biaya layanan dibuat/dipilih oleh pemilik proyek. Belum ada layanan berbayar yang dipesan oleh perubahan ini.

## 2. Isi konfigurasi lokal

`.env.local` sudah dibuat tanpa menimpa file yang ada. APP_SECRET dan CRON_SECRET telah dihasilkan secara acak tanpa dicetak. Pertahankan APP_SECRET karena dipakai untuk QR dan enkripsi antrean email.

| Variabel | Nilai lokal / staging |
| --- | --- |
| DATABASE_URL | Koneksi Neon staging |
| APP_URL | Lokal: http://127.0.0.1:3000; online: URL HTTPS Preview yang dipakai tim |
| APP_SECRET | Secret yang sama di aplikasi dan worker |
| PAYMENT_PROVIDER | simulation |
| RESEND_API_KEY | API key Resend |
| EMAIL_FROM | Alamat domain verified |
| BLOB_READ_WRITE_TOKEN | Token Blob staging |
| CRON_SECRET | Secret lokal yang telah dihasilkan |
| SUPPORT_EMAIL | Email bantuan tim |
| ADMIN_PASSWORD | Isi sementara, 14-128 karakter; hapus setelah bootstrap |
| WORKER_INTERVAL_MS | 30000 |

Jangan menambahkan prefix NEXT_PUBLIC_ pada secret. File .env.local sudah diabaikan .gitignore. Jangan menaruh file ini di dokumentasi atau mengirim isinya ke chat.

Setelah DATABASE_URL terisi, jalankan dari root proyek:

```powershell
npm run backend:check
npm run db:migrate
npm run admin:create -- alamat-admin@domainmu.id "Admin Staging"
npm run backend:check
```

Ganti alamat admin sebelum menjalankan. Pemeriksaan pertama wajar gagal jika migrasi belum ada. Hentikan langkah berikutnya jika migrasi gagal. admin:create membuat akun verified langsung; jalankan sekali untuk email baru, lalu kosongkan ADMIN_PASSWORD. Pastikan pemeriksaan terakhir menyatakan admin tersedia. Admin yang belum ada menggagalkan pemeriksaan.

Seeder tidak diperlukan untuk milestone ini: buat event melalui admin agar alur operasional benar-benar teruji.

## 3. Uji aplikasi dan worker lokal

Terminal pertama: `npm run dev`. Terminal kedua: `npm run worker`. Keduanya memakai PostgreSQL staging yang sama.

Worker menjalankan kedaluwarsa pesanan, membersihkan sesi/token/rate limit kedaluwarsa, dan mengirim maksimal 10 email per batch. Batch berjalan berurutan; interval adalah jeda setelah batch selesai. Ctrl+C menghentikan worker setelah batch aktif selesai. `npm run worker:once` cocok untuk pemeriksaan satu batch atau scheduler eksternal.

Tanpa konfigurasi Resend, worker tetap membersihkan reservasi tetapi email tidak dikirim. Respons maintenance `ok` berarti batch selesai, bukan semua email berhasil. Pengiriman gagal tetap dicatat sebagai retry; implementasi saat ini membatasi percobaan otomatis sampai 8 kali. Gunakan kirim ulang di halaman pesanan untuk membuat pekerjaan email baru setelah penyebab kegagalan diperbaiki; tiket tidak diterbitkan ulang.

## 4. Deploy Preview terbatas

Repository tersedia di https://github.com/rizkyvanasry/tinitix. Folder lokal sudah dihubungkan ke project `tinitix-staging`. Jika menyiapkan ulang di komputer lain:

```powershell
npx vercel login
npx vercel link
```

Pilih proyek staging. Di Project Settings > Environment Variables, isi variabel aplikasi pada scope **Preview**. Jangan unggah ADMIN_PASSWORD. Salin APP_SECRET yang sama dari lokal secara privat. Isi APP_URL dengan URL Preview yang akan dipakai; jika URL belum diketahui, buat deployment awal, lalu perbarui APP_URL ke URL tersebut dan deploy ulang. Gunakan alias staging tetap jika tersedia agar link email tetap menuju deployment aktif.

```powershell
npx vercel
```

Perintah ini membuat Preview; jangan gunakan `--prod` untuk milestone simulasi. Aplikasi memang memblokir pembayaran simulasi pada deployment production. Aktifkan Deployment Protection dan berikan akses kepada penguji, termasuk orang yang membuka link tiket lewat email. Jangan mengubah VERCEL_ENV untuk menyamarkan deployment production sebagai Preview. [Preview deployment](https://vercel.com/docs/deployments/overview), [Deployment Protection](https://vercel.com/docs/deployment-protection).

Sesudah APP_URL berubah, buat pesanan uji baru: URL dalam email yang sudah diantrekan tidak ikut berubah.

## 5. Jalankan worker online

Vercel Cron hanya memanggil deployment production; konfigurasi harian di vercel.json tidak menjalankan maintenance pada Preview. [Dokumentasi Cron](https://vercel.com/docs/cron-jobs).

Untuk staging yang bekerja ketika laptop mati, gunakan host proses Node yang selalu aktif dengan direktori kerja root proyek:

- Install: `npm ci --include=dev` (tsx saat ini berada di devDependencies).
- Start: `npm run worker`.
- Environment: DATABASE_URL, APP_SECRET, RESEND_API_KEY, EMAIL_FROM, WORKER_INTERVAL_MS, dan APP_URL yang sama dengan Preview. Worker tidak membutuhkan token Blob atau ADMIN_PASSWORD.
- Aktifkan restart otomatis pada kegagalan proses dan pantau log maintenance. Host worker belum dipilih/disediakan; proses lokal hanya cukup untuk sesi pengujian selama laptop tetap hidup.

Worker mengakses database langsung sehingga tidak tergantung akses HTTP melalui Deployment Protection. Jangan menyalakan worker terhadap database lain dengan APP_SECRET yang berbeda.

## 6. Bukti penerimaan milestone

Semua baris berikut **belum diuji pada layanan nyata**. Catat waktu, deployment, ID event/order, hasil aktual, dan bukti tersensor untuk setiap uji; jangan menyimpan QR atau tautan akses mentah dalam laporan bersama.

| Uji | Langkah dan hasil yang diharapkan |
| --- | --- |
| Operasional admin | Login /login lalu buka /admin; buat event masa depan, upload poster, isi kelima kategori, harga, kuota, dan periode aktif; publish. Event muncul di katalog tanpa mengedit kode. |
| Guest + couple | Buka sesi tamu, beli satu couple, bayar simulasi. Status paid; tepat dua QR berbeda. |
| Email nyata | Email diterima inbox penguji. Saat ini email berisi tautan aman menuju halaman QR, bukan QR inline/lampiran. Buka tautan sekali dalam 24 jam dan pastikan dua QR tampil. |
| Check-in | Login admin/petugas yang ditugaskan di /check-in; dua perangkat scan QR sama bersamaan. Tepat satu hasil valid, lainnya already_used. |
| Stok terakhir | Batasi satu kategori menjadi kuota satu; dua sesi tamu checkout bersamaan. Hanya satu reservasi berhasil. |
| Webhook duplikat | Ulangi event pembayaran simulasi yang sama melalui harness/API bertanda tangan. Jumlah tiket tetap, pembayaran tidak dihitung dua kali. |
| Email gagal | Pada staging terisolasi, buat pengiriman gagal dengan konfigurasi key uji tidak valid pada seluruh pengirim (web dan worker). Bayar simulasi: order tetap paid. Pulihkan key lalu retry/kirim ulang; jumlah dan identitas tiket tetap. Jangan memakai key produksi untuk skenario ini. |
| Reservasi kedaluwarsa | Buat pesanan tanpa bayar, tutup semua halaman, biarkan worker hidup >15 menit plus satu batch. Status expired dan reservasi released; stok dapat dibeli lagi. |
| Akses pesanan | Pada browser tanpa sesi/link akses, coba URL pesanan pembeli lain. Data pesanan harus ditolak. |
| Persistensi | Restart aplikasi dan worker; event, order paid, dan check-in masih ada. |

Tes otomatis PGlite tidak membuktikan konkurensi koneksi PostgreSQL nyata. Enam uji kritis di atas tetap harus diulang dengan staging sebenarnya. Milestone baru selesai setelah email diterima dan QR berhasil dipindai di URL staging, dengan worker online berjalan mandiri.

Gunakan `APP_URL` yang persis cocok dengan origin alias staging yang dibuka penguji. Pemeriksaan origin POST dan tautan email memakai konfigurasi tersebut.

Konfigurasi Docker worker dengan restart tersedia di `compose.worker.yml`; lihat [OPERATIONS.md](OPERATIONS.md). Konfigurasi ini harus dijalankan pada host online untuk memenuhi uji laptop mati.
