# Instagram Loka Kasir — gambar khusus tiap posting

**Status: aktif dan terverifikasi melalui API Loka pada 17 November 2026, pukul 07.10 WIB.** Sebanyak 85 posting mendatang sudah memakai 408 slide versi 3, dengan caption, teks Threads, ID, dan jadwal tetap.

Versi 3 memberi **85 posting mendatang 85 gambar baru**, masing-masing dibuat khusus untuk topiknya dengan **built-in image_gen**. Gambar sumber berada di `assets/art/002.png` sampai `assets/art/086.png`; prompt final lengkap ada di [image-prompts.json](image-prompts.json). Berkas `001.png` hanya untuk materi arsip yang sudah terbit dan tidak ikut penggantian antrean.

Caption, teks Threads, ID posting, waktu tayang, serta urutan cerita mengikuti versi 2. Sebanyak **408 slide untuk 85 posting** dipasang ke antrean yang sama; posting yang sudah terbit dan enam posting di luar revisi dipertahankan. Status penerapan dan bukti verifikasi langsung dari API ada di [release-verification.json](release-verification.json). Total dalam rentang kalender tetap 92 posting, pukul 14.00 dan 20.00 WIB setiap hari.

Delapan pendekatan gambar mencakup foto editorial, still life, ilustrasi 3D, diorama isometrik, clay, komik, kolase fotografi, dan gouache. Subjek, lokasi, aktivitas, produk, serta sudut pandang ditentukan per posting. Gambar hanya digunakan ulang di dalam carousel miliknya sendiri. Foto dan ilustrasi menggambarkan adegan fiktif, bukan dokumentasi atau testimoni merchant.

Dua contoh yang diminta pengguna:

- Nomor 9: adegan toko yang penuh dus dan stok belum terjual menggantikan sampul dua kartu berwarna hijau.
- Nomor 21: kolase kue, kopi, dan sandwich menggantikan sampul A/B/C.

Lihat [sebelum dan sesudah](comparison.jpg), [semua carousel](index.html), [85 gambar sumber](art-gallery.html), atau [ringkasan sampul](preview.jpg).

Logo asli Loka dan Plus Jakarta Sans dipertahankan. Gambar menjadi fokus sampul lewat foto memenuhi halaman, bidang gambar lebar, bingkai ilustrasi, atau judul di bawah foto. Slide isi memakai gambar posting yang sama sebagai foto pendamping atau latar ringan. Semua JPG final berukuran **1080 × 1350**. Ada 413 JPG lokal termasuk lima slide revisi arsip yang tidak diterapkan ke posting terbit.

Pemeriksaan mencakup 85 hash sumber yang berbeda, tidak ada penggunaan gambar lama untuk posting mendatang, urutan dan jumlah media, dimensi, batas caption, simulasi hitungan, teks terpotong, serta tabrakan layout. Enam lembar gambar sumber dan enam lembar sampul ditinjau berdampingan; catatannya tersimpan di [visual-review.json](visual-review.json). Galeri juga diperiksa di desktop dan ponsel.

- `art-manifest.json`: pemetaan gambar sumber, topik, ukuran, dan hash.
- `media-manifest.json`, `layout-validation.json`, `audit.json`: hasil pemeriksaan 413 slide.
- `art-contact-01.jpg` sampai `art-contact-06.jpg`: lembar gambar sumber.
- `cover-contact-01.jpg` sampai `cover-contact-06.jpg`: lembar sampul final.
- `release-plan.json`, `release-verification.json`: ID target dan verifikasi penerapan melalui API Loka.
- `campaign.json`, `content.py`, `art-directions.txt`: copy terstruktur dan arahan gambar.

Sumber dapat dibangun ulang dari folder ini:

```sh
python3 content.py
node render.cjs
python3 gallery.py
python3 audit.py
```

Renderer memakai Playwright lokal dan Google Chrome. Default Playwright berada di `/private/tmp/loka-social-v2-tools/node_modules/playwright`; `LOKA_PLAYWRIGHT_PATH` dapat menunjuk instalasi lain. `node render.cjs --comparison`, `--art-contact`, dan `--cover-contact` membuat lembar tinjauan. Gambar sumber dibuat melalui tool bawaan, satu panggilan per gambar, dengan prompt yang tersimpan; tidak memakai fallback CLI/API.

Versi [1](../2026-nov-dec/README.md) dan [2](../2026-nov-dec-v2/README.md) disimpan sebagai arsip. Tidak ada perubahan kode aplikasi atau deployment frontend. Snapshot sebelum perubahan dan cache unggahan tersedia di server pada `/tmp/loka-social-v3-20261117/`.
