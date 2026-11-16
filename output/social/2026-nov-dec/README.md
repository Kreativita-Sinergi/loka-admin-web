# Loka Kasir — tambahan posting November & Desember 2026

Status: **86 posting berhasil dijadwalkan dan diverifikasi melalui API Loka pada 16 November 2026.** Semua posting tambahan mengaktifkan Threads. Hasil verifikasi menunjukkan tepat dua jadwal per hari selama 46 hari, dan enam posting lama tetap ada.

Materi riset per 16 November 2026. 86 posting tambahan: 24 untuk 16–30 November dan 62 untuk 1–31 Desember. Bersama enam posting lama, jadwal menjadi dua kali sehari pada 14.00 dan 20.00 WIB selama 46 hari. Tanggal yang sudah lewat tidak diisi ulang.

- `index.html`: galeri lengkap, tiga slide tiap posting, caption Instagram, dan teks Threads.
- `calendar.md`: jadwal, topik, dan sumber berita primer.
- `campaign.json`: copy terstruktur beserta jadwal dan nama gambar.
- `media/`: 258 JPG final, 1080 × 1350, 4:5.
- `assets/`: enam ilustrasi final, logo Loka asli, serta font Plus Jakarta Sans yang digunakan feed lama.
- `illustration-prompts.json`: prompt lengkap tiap ilustrasi; dibuat dengan **built-in image_gen**, menggunakan posting lama hanya sebagai referensi gaya.
- `carousel.html`, `render.cjs`, `content.py`: sumber komposisi dan copy yang dapat diedit. Renderer memakai Playwright/Chrome dari instalasi lokal; sesuaikan lokasi dependensi bila dipindahkan ke mesin lain.
- `media-manifest.json`, `layout-validation.json`: ukuran/hash berkas dan pemeriksaan tata letak.
- `verification.json`, `scheduled.json`, `uploaded.json`: bukti hasil API setelah proses penjadwalan selesai.

Visual mengikuti warna biru Loka, judul putih tebal, font Jakarta, karakter pemilik usaha 3D, kartu putih, dan footer @lokakasir.id. Enam adegan: kedai, belanja stok, hampers, pembayaran, evaluasi laporan, dan kerja tim. Tipografi dan logo disusun deterministik di HTML/CSS, bukan digambar oleh generator gambar.

Berita ditarik menjadi pelajaran operasional: harga pangan → biaya resep/HPP; cuaca → belanja sesuai kebutuhan; penguatan ritel → pencatatan; QRIS antarnegara → kesiapan dan verifikasi pembayaran; Harbolnas → syarat promo dan evaluasi margin. Konten musiman bergerak dari persiapan Desember ke pesanan hampers, Hari Ibu, Natal, stok opname, dan evaluasi tahun. Contoh angka diberi label simulasi dan sisa harga dikurangi biaya produk tidak disebut laba bersih.

Tidak ada perubahan kode aplikasi atau deployment frontend. Posting ditambahkan melalui API admin yang sudah ada.
