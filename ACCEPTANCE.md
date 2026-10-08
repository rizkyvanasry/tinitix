# Status penerimaan Tinitix — 9 Oktober 2026

Status layanan nyata dibedakan dari bukti lokal. Lulus tes lokal tidak menyelesaikan acceptance staging atau kesiapan penjualan nyata.

| ID | Status | Bukti / sisa pekerjaan |
| --- | --- | --- |
| B1 | Lulus staging | [Preview HTTPS](https://tinitix-staging-preview.vercel.app) terhubung ke Neon PostgreSQL khusus staging. Migrasi `001_initial`, `002_order_listing`, dan `003_report_payments` diterapkan; pemeriksaan database, migrasi, dan admin terverifikasi berhasil. Login admin di deployment Preview merespons HTTP 200. |
| B2 | Lulus staging | Blob `tinitix-staging-posters` terhubung ke Preview. Domain tinitix.id dilaporkan Verified oleh pemilik. Resend menerima dua email uji couple pada 8 Oktober; penguji mengonfirmasi tautan email berhasil menampilkan dua QR pada 8 Oktober. Upload poster dan banner melalui admin staging lulus 9 Oktober; kedua gambar tampil pada detail event. |
| B3 | Host ditunda pemilik | CI berhasil membangun image Node 24, menjalankan satu batch worker dengan PostgreSQL, dan menjalankan ops:check. Compose mengatur restart proses. Render berbayar ditunda pemilik 8 Oktober; host online, uji crash/restart, dan uji laptop mati belum tersedia. |
| B4 | Otomasi staging lulus; kamera belum | Pada 9 Oktober: admin create/edit/publish, tamu checkout couple, simulasi paid, dua PNG QR dibaca, dua sesi scan serentak, dan penolakan scan ulang lulus di Preview. Alur inbox sebelumnya dikonfirmasi pemilik 8 Oktober. Kamera dua ponsel belum diuji. |
| B5 | Konkurensi staging lulus; host mandiri belum | Preview/Neon: dua checkout stok terakhir menghasilkan 201/409, scan QR bersamaan satu valid, pembayaran bersamaan hanya satu tiket. Suite transaksi 20/20 juga lulus pada schema Neon terisolasi, termasuk checkout/settlement/expiry paralel. Expiry tanpa kunjungan dan laptop mati masih menunggu worker online. |
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
- Deployment Preview aktif: `tinitix-staging-rjg1qa76e-naskara-ai.vercel.app`, ID `dpl_FroYj6XnukZXS46qjyYMzfFmPnw2`.
- Commit sumber deployment aktif: `5de83c4`. Build dan TypeScript Vercel berhasil; alias diperbarui 9 Oktober untuk reservasi sebelum data pembeli, timer server, pajak, dan biaya layanan. Migrasi `004_buyer_details` serta `005_checkout_holds_fees` diterapkan. Pengujian browser lengkap sebelumnya (00.59?01.01 WIB) memakai commit `1cdc78b`; hasil tersebut tidak dianggap pengujian ulang alur baru.
- Riwayat smoke 7 Oktober 2026, sekitar 23.12 WIB: Vercel Ready / Preview; login admin HTTP 200; katalog HTTP 200 dengan enam event; unduhan laporan HTTP 200 dan workbook terbaca dengan keenam sheet.
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
| 3. Worker selalu online | Ditunda pemilik | Dockerfile dan restart policy tersedia; belum ada host yang dapat diakses. Harus dibuktikan crash/restart, expiry, dan retry email dari perangkat lain. |
| 4. Uji lapangan staging | Belum selesai | Otomasi browser PostgreSQL terisolasi sudah lulus, termasuk couple, check-in dan Excel. Pada 9 Oktober, otomasi Preview/Neon termasuk perebutan stok dan Excel sudah lulus. Inbox nyata dikonfirmasi 8 Oktober. Dua ponsel fisik dan host mandiri masih perlu diuji. |
| 5. Gateway dan aturan bisnis | Ditunda pemilik | Pemilik menegaskan kembali pembayaran nyata tetap ditunda pada sesi ini. |
| 6. Pembayaran nyata dan rekonsiliasi | Ditunda | Menunggu langkah 5. |
| 7. Pilot berbayar | Belum dapat dimulai | Menunggu langkah 4 dan 6 serta monitor, restore, kebijakan final, dan latihan petugas. |

### Checklist bukti lapangan

Isi setiap baris dengan waktu WIB, ID event/order, hasil aktual, dan referensi bukti tersensor. Jangan menyalin tautan akses atau QR.

- [x] Domain pengirim berstatus terverifikasi pada Resend (konfirmasi pemilik); konfigurasi pengiriman diterima provider.
- [x] Event uji dipublikasikan admin; satu pembelian couple dibayar simulasi (9 Oktober).
- [x] Provider menerima email; penguji mengonfirmasi keberhasilan alur email dengan balasan "ok qr sudah tampil" pada 8 Oktober 2026.
- [x] Tautan email dibuka penguji dan dua QR tampil; API order juga mengonfirmasi dua ID tiket berbeda.
- [ ] Ponsel A dan B check-in; scan ulang ditolak. Scan serentak QR sama menghasilkan satu valid.
- [x] Dua checkout serentak memperebutkan satu stok; hanya satu reservasi berhasil (Preview/Neon, 9 Oktober).
- [ ] Worker online melepaskan reservasi setelah expiry tanpa kunjungan website dan saat laptop mati.
- [ ] Crash worker di host menghasilkan restart dan batch berikutnya berhasil.
- [ ] Gangguan email sementara diuji secara terkendali; retry berhasil tanpa menerbitkan tiket ulang.
- [x] Order, pembayaran simulasi, tiket, check-in, dan enam sheet Excel cocok (9 Oktober); bug urutan kategori diperbaiki. Kamera fisik tetap belum diverifikasi.


## Bukti email staging - 8 Oktober 2026

- Nama variabel secret diperbaiki dengan menambahkan RESEND_API_KEY sesuai huruf besar yang dibaca aplikasi; nilai secret tidak ditampilkan atau disimpan di Git.
- Pembelian uji pada event Midnight Frequency: order `TIX_478ab67d751811e33f727c8e`, satu Presale 1 Couple Ticket. Checkout HTTP 201, pembayaran simulasi HTTP 200; pembacaan API order mengonfirmasi paid dan dua ID tiket berbeda.
- Setelah redeploy, maintenance terautentikasi HTTP 200 mengembalikan `sent: 2, configured: true`. Kedua email checkout/pembayaran untuk penguji tercatat sent; ini membuktikan penerimaan API provider, bukan penerimaan inbox.
- Tiga email sebelum Resend aktif berisi tautan kedaluwarsa (lebih dari 24 jam) ditandai expired dan dicatat di audit_logs. Pesan disimpan sebagai bukti dan tidak dikirim ulang.
- Pengiriman ini dipicu manual lewat endpoint maintenance. Belum membuktikan worker online mandiri, retry setelah gangguan, atau operasi saat laptop mati.
- Tautan menggunakan alias Preview HTTPS yang masih dilindungi login Vercel. Pada 8 Oktober 2026, pemilik menjawab "ok qr sudah tampil" setelah diminta memeriksa email dan membuka tautannya. Uji email sampai dua QR dinyatakan lulus berdasarkan konfirmasi penguji; pemindaian fisik belum diuji.


## Pengerjaan 1?3: hasil otomatis 9 Oktober 2026

Pemilik belum memiliki dua ponsel dan meminta pengujian otomatis dilanjutkan. Bukti tersensor: [hasil 13 pemeriksaan](docs/staging-acceptance-2026-10-09.json). Alur berjalan di alias Preview dengan database Neon dan Blob nyata, pembayaran simulasi, serta dua sesi browser terpisah.

| Pekerjaan | Hasil |
| --- | --- |
| 1. Admin EO | Login, buat draft, upload poster/banner, sembunyikan draft dari katalog, edit, publish, tampilkan gambar publik, dan proteksi kuota di bawah penjualan lulus. Bug kategori tertukar ketika editor dibuka ulang diperbaiki pada `1cdc78b`. |
| 2. Check-in otomatis | Pembelian couple menghasilkan dua PNG QR dengan isi berbeda. Dua sesi memindai QR pertama bersamaan: satu `valid`, satu `already_used`. QR kedua valid melalui UI; scan ulang ditolak. Dua ponsel/kamera fisik belum diuji. |
| 3. Stok dan laporan | Dua checkout satu stok: HTTP 201/409. Dua simulasi pembayaran bersamaan: HTTP 200/409 (`Pesanan tidak dapat dibayar` setelah paid), dengan satu tiket untuk order tersebut. Pencarian order dan ekspor enam sheet lewat UI lulus. |

- Event QA: `event_fab0fb1e9bb809636afd5eed`, slug `qa-acceptance-1791482369813`; ditutup setelah tes. Data QA dipertahankan untuk audit.
- Couple: `TIX_c4233264382af1d704648033`; single stok terakhir: `TIX_bc009f7685daae22c802fdc2`.
- API laporan, Excel, dan query database read-only cocok: 2 pesanan paid, 3 tiket, total Rp45.002, 2 check-in, 2 reservasi converted, 0 reservasi aktif, 2 payment events. Harga couple Rp35.001 dibagi ke dua tiket tanpa selisih pembulatan.
- Empat email QA berstatus sent di database. Ini bukti penerimaan provider, bukan konfirmasi inbox tambahan untuk event QA ini.
- Suite transaksi pada schema Neon terisolasi: 20/20 lulus pada 8 Oktober, termasuk checkout/pembayaran duplikat/expiry bersamaan. Regression test urutan kategori dan type-check lulus. [CI commit aplikasi berhasil](https://github.com/rizkyvanasry/tinitix/actions/runs/37757087199).
- Batas uji QR: isi PNG dibaca dengan mode `PURE_BARCODE`. Deteksi posisi QR pada beberapa PNG tidak konsisten dalam percobaan decoder; keberhasilan pembacaan isi tidak membuktikan fokus/deteksi kamera. Lanjutkan uji kamera dua ponsel, layar/cetakan, dan jarak pemindaian sebelum acceptance lapangan lengkap.
- Render dan pembayaran nyata tetap ditunda. Hasil ini tidak menyatakan siap penjualan berbayar atau worker sudah online.


## Perubahan alur pembeli ? 9 Oktober 2026

Halaman kategori tiket sekarang meneruskan pilihan ke halaman `/events/[slug]/buyer`. Data pembeli berisi nama sesuai KTP/SIM, satu alamat email tanpa konfirmasi ulang, telepon wajib, jenis kelamin, dan kanal pilihan QRIS/transfer bank/e-wallet. Kanal masih simulasi; tidak ada QRIS atau rekening pembayaran nyata. Migrasi `004_buyer_details` menambah kolom nullable untuk pesanan lama. Jenis kelamin masuk kolom Gender pada Excel; kanal pilihan dicatat di Remark dengan penanda simulasi.

Bukti 13 pemeriksaan di atas berlaku untuk alur sebelum perubahan ini. Fixture pengujian disesuaikan; suite dan uji browser belum dijalankan ulang untuk alur halaman pembeli baru.

Deployment alur pembeli baru: build dan TypeScript lulus di Vercel, migrasi 004 diterapkan, alias Preview aktif. Tes browser tidak dijalankan pada perubahan ini.


## Reservasi sebelum data pembeli dan biaya ? 9 Oktober 2026

Checkout dari kategori membuat pesanan reservasi tanpa data pribadi, melalui transaksi yang mengunci baris event. Stok aktif langsung diperhitungkan untuk checkout lain. Halaman pembeli menggunakan cookie akses pesanan dan timer berdasarkan expires_at server (15 menit); refresh dan submit data pembeli tidak memperpanjang waktu. Reservasi kedaluwarsa tidak dihitung sebagai stok terpakai, termasuk ketika worker ditunda. Pembayaran ditolak sebelum data pembeli lengkap.

Pajak default 10% dan biaya layanan default 3%, masing-masing dari subtotal tiket, dibulatkan ke rupiah. EO dapat mengubah persentase di editor event. Angka disimpan pada pesanan saat reservasi sehingga perubahan event tidak mengubah pesanan yang sudah ada. Pesanan lama tetap memakai total lama dan biaya nol. Migrasi tambahan: `005_checkout_holds_fees`. Excel menampilkan biaya/pajak dan mengalokasikannya ke tiket dengan total rupiah tetap cocok.

Perubahan ini belum diuji ulang melalui browser atau uji konkurensi; bukti pengujian sebelumnya tetap berlaku hanya untuk versi yang dicatat pada masing-masing bukti.

Deploy reservasi dan biaya: Preview Ready, build dan TypeScript lulus pada commit `1223ea1`. Tes browser dan konkurensi alur reservasi baru belum dijalankan.

## Navigasi Organizer ? 9 Oktober 2026

Menu Organizer menggantikan Jelajahi Event pada header, dengan halaman Create Event, Our Services, dan Creator Help Center. Build serta TypeScript Vercel lulus; pengujian browser belum dijalankan untuk perubahan navigasi ini.
