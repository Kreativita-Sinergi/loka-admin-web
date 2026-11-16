# Revisi materi Instagram Loka Kasir

**Status: aktif di antrean Instagram/Threads. Sebanyak 85 posting dengan 408 slide diperbarui dan diverifikasi melalui API Loka pada 17 November 2026, pukul 06.14 WIB.** Caption, gambar, dan teks Threads sudah memakai revisi. ID serta jam tayang tetap. Total antrean tetap 92 posting, dua kali sehari pukul 14.00 dan 20.00 WIB, tanpa membuat duplikat. Bukti lengkap ada di [release-verification.json](release-verification.json).

Satu dari 86 materi sudah terbit pada 16 November sehingga versi tayangnya dipertahankan. Enam posting lain di luar revisi juga tetap. Versi asli tersimpan di `../2026-nov-dec/` sebagai arsip. Revisi lokal materi yang sudah terbit tersedia untuk perbandingan dan tidak dipasang atau diterbitkan ulang.

86 materi ditulis ulang menjadi **413 slide JPG 1080 × 1350**. Ada 24 carousel empat slide, 55 carousel lima slide, dan 7 carousel enam slide. Dari seluruh berkas lokal ini, 408 slide untuk 85 posting mendatang terpasang ke antrean; lima slide revisi materi arsip hanya tersedia secara lokal.

Delapan format: cek anggapan, bedah angka, checklist toko, obrolan kasir, dua sudut, kuis, cerita toko, dan apresiasi orang di balik usaha. Alur slide mengikuti bentuk konten: pertanyaan → pilihan → alasan; percakapan → masalah → perbaikan; atau kasus → rincian angka → hitungan → tindakan. Hook, penjelasan, dan penutup ditulis per materi. Ajakan terakhir dibuat relevan dengan topik. Pesan apresiasi dan hari raya tidak memakai promosi produk.

Visual memadukan biru Loka, navy, krem, dan hijau terang. Foto ilustratif, potongan ilustrasi 3D, chat bubble, kartu perbandingan, kuitansi, dan grafik batang menggantikan satu pola tiga slide yang berulang. Logo asli dan font Plus Jakarta Sans dipertahankan. Empat foto baru dibuat dengan **built-in image_gen**; keenam ilustrasi lama digunakan sebagai potongan gambar di format checklist. Foto bukan dokumentasi merchant atau testimoni pelanggan. Prompt final lengkap tersimpan di [image-prompts.json](image-prompts.json).

Konten berfokus pada situasi operasional yang bisa dipakai lintas waktu, tanpa meneruskan klaim berita atau jadwal acara yang belum diverifikasi ulang. Contoh angka diberi label simulasi. Sisa harga dikurangi biaya produk disebut sisa sebelum biaya lain, bukan laba bersih. Dukungan layanan pembayaran tetap dirujuk ke penyedia masing-masing.

- [index.html](index.html): galeri seluruh materi, semua slide, caption IG, teks Threads, pencarian dan filter format.
- [preview.jpg](preview.jpg): perbandingan 12 cover.
- `carousel-002.jpg`, `carousel-004.jpg`, `carousel-006.jpg`, `carousel-007.jpg`, `carousel-067.jpg`: contoh alur carousel lengkap.
- `campaign.json`, `rewrite.txt`, `calendar.md`: copy, pemetaan materi lama, dan referensi kalender.
- `media/`: seluruh JPG final. `assets/`: foto, ilustrasi, logo, dan font.
- `content-validation.json`, `layout-validation.json`, `media-manifest.json`, `audit.json`: hasil pemeriksaan data, layout, ukuran, dan kelengkapan media.
- `release-plan.json`, `release-verification.json`: pemetaan 85 ID target dan hasil verifikasi langsung terhadap API setelah pembaruan. Snapshot sebelum perubahan serta cache upload tersimpan di server pada `/tmp/loka-social-v2-20261117/`; tidak ada kredensial dalam berkas repo.

Sumber dapat dibangun ulang secara lokal:

```sh
python3 content.py
node render.cjs
python3 gallery.py
python3 audit.py
```

Renderer memerlukan Playwright dan Google Chrome. Default Playwright berada di `/private/tmp/loka-social-v2-tools/node_modules/playwright`; gunakan `LOKA_PLAYWRIGHT_PATH` untuk instalasi lain. Render memeriksa ruang teks, tabrakan blok, pemuatan gambar, dan batas footer untuk seluruh 413 slide. Revisi materi ini tidak mengubah kode aplikasi atau men-deploy frontend.
