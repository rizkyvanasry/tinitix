import Link from 'next/link';
export const metadata={title:'Creator Help Center'};
const questions=[
 ['Bagaimana cara membuat event?','Masuk menggunakan akun admin organizer, buka dashboard, lalu pilih Buat event. Isi detail acara, upload poster/banner, atur tiket, dan simpan draft sebelum publish.'],
 ['Kenapa akun saya tidak bisa membuka dashboard?','Akun pembeli dan petugas memiliki akses berbeda dari admin organizer. Mendaftar akun pembeli tidak otomatis memberi izin untuk membuat event. Hubungi pengelola Tinitix untuk pengaturan akses organizer.'],
 ['Berapa ukuran poster dan banner?','Rekomendasi poster 900 ? 700 px dan banner 1440 ? 450 px. Upload JPEG, PNG, atau WebP dengan ukuran maksimal 2 MB per gambar.'],
 ['Apa beda kuota tiket dengan kapasitas orang?','Kuota dihitung per unit pembelian. Satu unit couple berlaku untuk dua orang. Kapasitas event membatasi total orang dari seluruh kategori.'],
 ['Kapan stok ditahan?','Saat pembeli berhasil klik Checkout, stok ditahan selama 15 menit. Waktu tidak diulang ketika halaman direfresh atau data pembeli dikirim. Reservasi yang berakhir tidak lagi mengurangi stok tersedia.'],
 ['Bagaimana mengatur pajak dan biaya layanan?','Edit event lalu isi Pajak (%) dan Biaya layanan (%). Default awal 10% dan 3%, masing-masing dari subtotal tiket. Perubahan tidak mengubah biaya pesanan yang sudah direservasi.'],
 ['Bagaimana mengunduh laporan?','Di dashboard, buka Laporan Excel, pilih event, lalu klik Unduh Excel. Pratinjau tabel dibatasi, tetapi file unduhan memuat seluruh data event.'],
 ['Bagaimana menyiapkan petugas check-in?','Petugas mendaftar dan memverifikasi email. Admin menugaskan akun tersebut ke event melalui tab Petugas. Petugas kemudian membuka halaman check-in; koneksi internet diperlukan.'],
 ['Apakah sudah bisa menerima uang dari pembeli?','Belum. Pembayaran saat ini masih simulasi. Jangan gunakan tahap pratinjau sebagai penjualan tiket berbayar.'],
];
export default function CreatorHelp(){return <article className="container article-page organizer-page"><span className="eyebrow blue-text">ORGANIZER / HELP CENTER</span><h1>Panduan untuk<br/>di balik acara.</h1><p>Jawaban untuk menyiapkan event, mengelola tiket, dan menjalankan check-in.</p>{questions.map(([title,body])=><details className="creator-faq" key={title}><summary>{title}</summary><p>{body}</p></details>)}<div className="creator-actions"><Link className="button" href="/organizer/create-event">Mulai buat event</Link><Link className="text-link" href="/help#support">Bantuan lebih lanjut</Link></div></article>;}
