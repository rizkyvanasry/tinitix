import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, Check, ScanLine, Ticket, FileSpreadsheet, Clock3 } from 'lucide-react';
import './services.css';

export const metadata = { title: 'Layanan untuk Organizer', description: 'Kenalkan event, kelola tiket, sambut pengunjung, dan unduh laporan penjualan bersama Tinitix.' };

export default function Services() {
  return <div className="services-page">
    <section className="services-hero services-wrap">
      <div className="services-hero-copy">
        <span className="services-label">TINITIX UNTUK ORGANIZER</span>
        <h1>Ide besar lo.<br /><em>Panggung berikutnya.</em></h1>
        <p>Kelola tiket, pengunjung, dan laporan dalam satu tempat. Lebih banyak ruang untuk memikirkan pengalaman event lo.</p>
        <a href="#layanan" className="button">Kenali layanan kami <ArrowUpRight size={19} /></a>
      </div>
      <div className="services-hero-photo"><Image src="/images/organizer-concert.jpg" alt="Penonton menikmati konser dengan lampu panggung berwarna hangat" fill priority sizes="(max-width: 760px) 100vw, 50vw" /></div>
      <div className="services-hero-foot"><span>Dari ide pertama sampai pengunjung terakhir.</span><span>Halaman event / Tiket / Check-in / Laporan</span></div>
    </section>

    <section id="layanan" className="services-wrap services-intro">
      <h2>Di balik event yang seru,<br />ada persiapan yang rapi.</h2>
      <div><p>Tinitix membantu menghubungkan setiap tahap: orang menemukan event lo, memilih tiket, lalu datang membawa QR mereka.</p><p>Tim lo bisa mengelola informasi event, pesanan, dan akses masuk dari alur yang sama.</p></div>
    </section>

    <section className="services-wrap services-publish">
      <div className="services-poster-stage"><Image src="/posters/soundscape.svg" alt="Contoh poster Soundscape Festival di Tinitix" width={900} height={700} sizes="(max-width: 760px) 90vw, 45vw" /><span>Contoh materi event di Tinitix</span></div>
      <div className="services-feature-copy"><span className="services-label">HALAMAN EVENT</span><h2>Kesan pertama,<br />sesuai karakter lo.</h2><p>Jadikan halaman event tempat pengunjung mengenal acara sebelum memutuskan datang.</p><ul><li><Check />Poster dan banner dengan identitas event lo.</li><li><Check />Jadwal, lokasi, lineup, dan detail tiket yang jelas.</li><li><Check />Event yang dipublikasikan tampil di katalog.</li></ul><Link href="/" className="services-link">Jelajahi katalog event <ArrowUpRight size={18} /></Link></div>
    </section>

    <section className="services-ticket-band"><div className="services-wrap services-ticket-layout">
      <div><Ticket size={30} strokeWidth={1.5} /><h2>Tiket berbeda.<br />Tetap satu alur.</h2><p>Atur kategori, harga, dan kuota. Dari early bird hingga paket couple, pembeli memilih yang paling pas.</p></div>
      <div className="services-fact"><strong>15<span>menit</span></strong><h3>Waktu untuk menyelesaikan pesanan</h3><p>Stok ditahan saat checkout. Hitung mundur membantu pembeli mengetahui batas waktu reservasinya.</p><Clock3 size={23} /></div>
      <div className="services-fact"><strong>2<span>QR</span></strong><h3>Satu couple, dua tiket masuk</h3><p>Setiap orang mendapat QR berbeda. Masing-masing tiket dapat divalidasi saat tiba di lokasi.</p><Ticket size={23} /></div>
    </div></section>

    <section className="services-wrap services-operations">
      <div className="services-operations-heading"><span className="services-label">HARI ACARA & SESUDAHNYA</span><h2>Siap di pintu masuk.<br />Jelas di laporan.</h2></div>
      <div className="services-operation"><ScanLine size={36} strokeWidth={1.5} /><div><h3>Sambut pengunjung dengan scan QR.</h3><p>Tugaskan petugas untuk event lo. Validasi tiket secara online dan lihat hasil pemindaian langsung, termasuk penolakan QR yang sudah digunakan.</p></div></div>
      <div className="services-operation"><FileSpreadsheet size={36} strokeWidth={1.5} /><div><h3>Data pesanan yang bisa dibawa pulang.</h3><p>Cari pesanan dan unduh laporan Excel berdasarkan transaksi event. Enam lembar membantu tim membaca penjualan sampai detail tiket.</p><div className="services-report-groups"><div><h4>Ringkasan penjualan</h4><p>Summary · Sold By Type · Sold By Date · Sold By Payment Channel</p></div><div><h4>Detail transaksi</h4><p>Orders · Tickets</p></div></div></div></div>
    </section>

    <section className="services-wrap services-fees">
      <div><span className="services-label">RINCIAN BIAYA</span><h2>Totalnya jelas.<br />Sejak awal.</h2><p>Atur pajak dan biaya layanan pada event. Pembeli melihat rinciannya sebelum melanjutkan pesanan.</p><p className="services-payment-note">Saat ini pembayaran di Tinitix masih simulasi. Pilihan QRIS, transfer bank, dan e-wallet belum menerima pembayaran nyata.</p></div>
      <div className="services-fee-example"><span>CONTOH PERHITUNGAN</span><dl><div><dt>Harga tiket</dt><dd>Rp100.000</dd></div><div><dt>Pajak 10%</dt><dd>Rp10.000</dd></div><div><dt>Biaya layanan 3%</dt><dd>Rp3.000</dd></div><div className="services-fee-total"><dt>Total pesanan</dt><dd>Rp113.000</dd></div></dl><p>Pajak dan biaya layanan pada contoh dihitung dari harga tiket. Persentasenya dapat diatur oleh organizer.</p></div>
    </section>

    <section className="services-wrap services-closing"><span className="services-label">EVENT BERIKUTNYA DIMULAI DI SINI</span><h2>Bawa ide lo<br />ke depan penonton.</h2><p>Masuk ke akun organizer untuk mulai menyiapkan event lo bersama Tinitix.</p><Link href="/organizer/login" className="button">Get Started Now <ArrowUpRight size={21} /></Link><Link href="/organizer/help-center" className="services-link">Butuh panduan? Buka pusat bantuan</Link></section>
  </div>;
}
