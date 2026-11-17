# Komisi Mitra Loka Kasir — 18 November 2026, 10.00 WIB

**Terjadwal di panel admin untuk 18 November 2026 pukul 10.00 WIB**, Instagram dan Threads. ID postingan: `585b598a-2371-4801-9ae4-7c43e3831442`. Jadwal 93 postingan lainnya dipertahankan. Bukti hasil baca ulang API: [schedule-verification.json](schedule-verification.json).

[Preview lima slide](preview.jpg) · [Galeri gambar](index.html) · [Caption Instagram](caption-instagram.txt) · [Caption Threads](caption-threads.txt).

## Pesan

Komisi menjadi pesan sampul dan caption: 50% nilai bersih selama 12 bulan pertama per pelanggan sejak pembayaran langganan pertamanya, kemudian 20%. Pembayaran Pro bulanan/tahunan pertama dan perpanjangan yang memenuhi syarat menghasilkan komisi. Nilai bersih setelah biaya pembayaran dan pajak yang berlaku. Paket tiga tahun/tambahan outlet dikecualikan.

Slide ketiga menggunakan simulasi aritmetika berlabel ilustrasi: nilai bersih Rp100.000 × 50% = Rp50.000. Ini contoh rumus, bukan proyeksi penghasilan atau harga paket. Slide keempat menjelaskan masa tahan 30 hari, minimum Rp100.000, pemeriksaan identitas/rekening dan jadwal pencairan bulanan sekitar tanggal 10. Caption memuat pembatalan saat refund/penyalahgunaan dan larangan referral toko sendiri.

CTA: https://app.lokakasir.id/mitra/daftar. Kuota maksimal 100 mitra total melalui verifikasi tim; tanpa klaim 100 slot tersisa.

## Aset visual

Dibuat dengan **built-in image_gen**, dua foto konseptual baru yang berbeda dari ilustrasi rekrutmen pertama. Model dan usaha bersifat fiktif; tidak digunakan sebagai testimonial atau bukti pembayaran.

- [Foto mitra dan pemilik toko roti](assets/bakery-partner.png)
- [Foto kalender dan catatan komisi](assets/commission-desk.png)
- [Prompt final](image-prompts.json)
- [Asal dan hash gambar](generation-receipts.json)

Lima gambar JPEG final tersimpan di `media/commission-1.jpg` sampai `media/commission-5.jpg`; urutan unggah ada di `post.json`. Setiap gambar 1080×1350 RGB. Logo dan font memakai aset merek yang sudah ada. QR pada slide 5 mengarah ke URL pendaftaran yang sama.

## Validasi

`audit.json`: lima JPEG berbeda, dimensi/format benar, gambar baru tidak menggunakan ulang PNG postingan pertama, panjang caption 1161/2200 dan Threads 432/500, serta simulasi benar. `layout-validation.json`: seluruh gambar termuat, tanpa teks meluap atau bertabrakan. Preview diperiksa secara visual.

Aturan aktif diverifikasi lewat `/sales/recruitment`: 50%, 20%, hold 30 hari, payout minimum Rp100.000, kuota maksimum 100. Akun Instagram/Threads terhubung dan URL pendaftaran merespons sebelum penjadwalan. Lima media beserta urutannya dan status scheduled dibaca kembali melalui admin API; tidak ada postingan lain yang diubah.

Render ulang pada workspace ini: `node output/social/sales-commission-20261118/render.cjs` (memakai Playwright/Chrome lokal dan paket qrcode dari proyek web yang sudah ada).
