# tinitix

Platform penemuan event dan tiket berbasis Next.js, React, dan PostgreSQL. Termasuk checkout tamu, reservasi stok, tiket QR, check-in petugas, akun pengguna, dan dashboard admin.

Pembayaran saat ini hanya simulasi lokal/preview. Integrasi gateway nyata ditunda; checkout produksi tetap diblokir.

## Pratinjau tanpa database

```powershell
npm ci
npm run dev
```

Buka http://127.0.0.1:3000. Tanpa `DATABASE_URL`, katalog memakai event contoh; transaksi dan autentikasi tidak aktif.

## Setup backend lokal

1. Salin `.env.example` ke `.env.local` jika file lokal belum ada. Jangan menimpa konfigurasi yang sudah terisi.
2. Isi `DATABASE_URL` dengan koneksi PostgreSQL untuk development/staging, termasuk nama database dan pengaturan TLS dari penyedia.
3. Isi `APP_URL=http://127.0.0.1:3000`, `PAYMENT_PROVIDER=simulation`, dan `APP_SECRET` acak minimal 32 karakter.
4. Untuk membuat secret, jalankan perintah berikut di terminal pribadi, lalu simpan hasilnya di `.env.local`. Buat nilai terpisah untuk `APP_SECRET` dan `CRON_SECRET`.

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Pertahankan `APP_SECRET`: nilai ini dipakai untuk tanda tangan tiket dan enkripsi email. Jangan bagikan secret melalui chat, log, atau variabel `NEXT_PUBLIC_*`.

```powershell
npm run backend:check
npm run db:migrate
npm run db:seed -- --demo
```

Pemeriksaan pertama akan melaporkan migrasi yang belum diterapkan. `db:migrate` mengubah skema pada database yang ditunjuk `DATABASE_URL`. Seeder khusus demo menolak mode produksi dan melewati event yang sudah ada.

Untuk membuat admin, isi `ADMIN_PASSWORD` sementara di `.env.local` (14-128 karakter), lalu:

```powershell
npm run admin:create -- admin@example.com "Admin tinitix"
npm run backend:check
```

Ganti alamat email dengan milik admin. Hapus `ADMIN_PASSWORD` setelah akun dibuat. Jalankan ulang server development setelah konfigurasi berubah.

## Pemeriksaan kesiapan

```powershell
npm run backend:check
npm run backend:check -- --production
```

Perintah ini hanya membaca database dan tidak mencetak nilai konfigurasi. Pemeriksaan mencakup bentuk URL, panjang secret, koneksi PostgreSQL, catatan migrasi, serta keberadaan admin terverifikasi. Exit code `1` berarti masih ada penghalang; peringatan layanan opsional tidak menggagalkan mode lokal.

Flag `--production` memuat environment produksi dan memeriksa persyaratan produksi. Pemeriksaan produksi tetap gagal selama gateway nyata belum diimplementasikan. Konfigurasi yang tersedia tidak membuktikan kredensial email/blob valid atau layanan sudah dapat dipakai.

## Email, poster, dan maintenance

- `RESEND_API_KEY` dan `EMAIL_FROM`: diperlukan untuk mengirim email. Verifikasi domain pengirim pada layanan email. Tanpa konfigurasi ini, email tetap masuk antrean; outbox pratinjau hanya tersedia untuk admin di luar produksi.
- `BLOB_READ_WRITE_TOKEN`: diperlukan untuk upload poster ke Vercel Blob. Poster demo lokal tetap berfungsi tanpa token.
- `CRON_SECRET`: melindungi `GET /api/cron/maintenance` melalui header `Authorization: Bearer <secret>`. Endpoint membersihkan data kedaluwarsa dan mencoba ulang antrean email.
- `vercel.json` saat ini menjadwalkan maintenance sekali sehari. Sesuaikan frekuensi saat menyiapkan operasional; konfigurasi ini belum menjamin retry email yang cepat. Satu pemanggilan memproses maksimal 10 email. Aksi API tertentu juga memicu pemrosesan email setelah respons.
- `SUPPORT_EMAIL`: alamat dukungan yang tampil pada aplikasi.

## Verifikasi

```powershell
npm run typecheck
npm test
npm run build
```

Tes backend memakai PGlite secara default. Jika `TEST_DATABASE_URL` diisi pada environment proses, suite yang sama memakai PostgreSQL nyata dengan schema acak terisolasi; tidak memakai `DATABASE_URL` aplikasi. Tes mencakup stok, scan bersamaan, idempotensi, webhook simulasi, tiket, autentikasi, dan ekspor 1.205 order.

CI GitHub Actions menyediakan PostgreSQL 17 dan menjalankan type-check, tes, build, serta browser dengan database. Untuk menjalankan browser database lokal, isi `TEST_DATABASE_URL` ke server tes lalu jalankan `npm run test:browser:db`. Runner membuat dan membersihkan schema sendiri, menyiapkan admin uji, menjalankan server port 3100, serta mematikan email/upload eksternal. Browser Chromium harus terpasang. Alur ini menguji admin publish, checkout couple, pembayaran simulasi, link email antrean, dan check-in; penerimaan inbox nyata tetap perlu diuji di staging.

Untuk tes browser, jalankan server development pada port 3000 di terminal terpisah:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH='C:\Tiketing Platform\.playwright'
npx playwright install chromium
npx playwright test
```

Tes browser mengharapkan mode pratinjau tanpa `DATABASE_URL` dan enam event contoh. Jalankan dengan konfigurasi preview yang terpisah dari database staging. Instalasi browser lokal di `.playwright/` diabaikan Git.

## Struktur

- `app/`: halaman, styling, dan API Next.js.
- `components/`: antarmuka katalog, checkout, admin, dan check-in.
- `lib/`: autentikasi, stok/pesanan, pembayaran, email, dan database.
- `db/migrations/`: migrasi SQL berurutan.
- `scripts/`: pemeriksaan kesiapan, migrasi, seeding, bootstrap admin.
- `tests/`: tes backend serta alur browser.

## Batas kesiapan produksi

Build yang lolos bukan berarti penjualan nyata aktif. Aktivasi produksi masih memerlukan gateway, kredensial layanan, database yang dimigrasikan, domain publik HTTPS, dan pengujian staging menyeluruh. Data demo tidak boleh dipakai sebagai event jualan nyata.

## Milestone staging

Ikuti [panduan setup staging](STAGING.md) untuk Neon, Resend, Vercel Preview, penyimpanan poster, worker, dan daftar bukti uji penerimaan.

Jalankan `npm run worker` pada proses Node terpisah untuk maintenance berulang tanpa kunjungan website. `npm run worker:once` menjalankan satu batch. Worker menunggu 30 detik setelah batch selesai, menangani penghentian SIGINT/SIGTERM, dan memakai konfigurasi database serta APP_SECRET yang sama dengan aplikasi. Vercel Cron bukan scheduler untuk Preview.

Status per milestone dan bukti uji tersedia di [ACCEPTANCE.md](ACCEPTANCE.md). Konfigurasi worker mandiri, monitoring, rollback, dan drill restore ada di [OPERATIONS.md](OPERATIONS.md).
