# Laporan Excel EO

Dashboard admin → Laporan Excel → pilih event → Unduh Excel.
Laporan diperbarui setiap 30 detik selama halaman dibuka. Unduhan mengambil snapshot transaksi terbaru secara konsisten dalam satu transaksi PostgreSQL REPEATABLE READ.

Workbook XLSX memiliki enam sheet: Summary, Sold By Type, Sold By Date, Sold By Payment Channel, Orders, Tickets. Struktur kolom mengikuti contoh pemilik; data pelanggan dari contoh tidak diimpor. Pratinjau dibatasi 50 baris per sheet, sedangkan unduhan mencakup seluruh baris, termasuk lebih dari 500 order. Batas maksimum satu sheet Excel adalah 1.048.575 baris data ditambah header; permintaan yang melebihi batas ditolak dengan pesan jelas.

- Orders memuat semua status. Pending yang sudah melewati waktu reservasi ditampilkan sebagai expired meskipun worker belum memperbaruinya.
- Ringkasan penjualan hanya menghitung paid. Payment review tetap terlihat di Orders dan tidak dihitung sebagai penjualan tiket berhasil.
- Sold By Date memakai waktu pembayaran diterima server dalam zona waktu event. Waktu order tetap ada di Orders dan Tickets.
- Satu paket couple dihitung sebagai dua tiket. Harga per kategori adalah harga paket; nominal per tiket dibagi dalam rupiah utuh agar totalnya tepat sama dengan order.
- Quantity / Total Ticket memakai kuota kategori dikali jumlah orang per paket. Kapasitas venue bersama tetap membatasi checkout.
- Pembatalan tiket tidak otomatis mengembalikan uang. Tiket cancelled masih tercatat sebagai tiket yang pernah diterbitkan dan pembayarannya tetap masuk penjualan paid.
- Nama lengkap ditempatkan di First Name, Last Name kosong karena form belum mengumpulkan nama terpisah. Nama tiket saat ini mengikuti nama pembeli.
- Demografi, analitik view/visitor, UTM, Instagram, dan kolom lain yang belum dikumpulkan tetap kosong. Kolom kosong bukan angka nol.
- Simulation adalah pembayaran uji. Biaya simulasi nol dan Net Payout merupakan nilai simulasi, bukan dana yang sudah dicairkan. Pemetaan channel, pajak, biaya, refund, dan pencairan provider nyata harus dilengkapi saat integrasi gateway.
- Entrant Code berisi ID laporan tiket. Workbook tidak memuat token akses pesanan, hash token, maupun QR untuk check-in.

Hanya admin terverifikasi dari organisasi pemilik event yang dapat membaca/mengunduh laporan. Respons memakai Cache-Control private/no-store. File Excel yang sudah diunduh adalah snapshot dan tidak berubah otomatis.

Tes laporan mencakup 1.205 pesanan paid, 2.410 tiket couple dengan harga paket ganjil, peralihan tanggal UTC ke WIB, status expired, scan, isolasi organisasi, header workbook, dan teks pembeli yang diawali tanda formula. Tes browser database memeriksa pembelian sampai check-in dan unduhan Excel dari dashboard.
