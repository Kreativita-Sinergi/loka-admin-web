# Rekrutmen Mitra Sales Loka Kasir

Empat slide Instagram 1080×1350, caption Instagram dan Threads, serta dua ilustrasi asli dibuat dengan built-in image_gen. Preview: `preview.jpg`; urutan unggah: `post.json` → `files`. File ilustrasi: `assets/recruitment-hero.png` dan `assets/sales-content-kit.png`. Prompt final: `image-prompts.json`.

Arahan pengguna untuk postingan mitra berikutnya: **utamakan komisi sebagai pesan sampul dan pembuka caption**. Rincian tarif, usulan hook, dan alur carousel: [next-post-brief.md](next-post-brief.md).

## Status

Terjadwal pada **17 November 2026 pukul 19.00 WIB** untuk Instagram dan Threads, ID `a23dde25-c9a5-40b8-abe2-b4637cb2a8da`. Empat slide dipertahankan. Jadwal 92 posting lainnya tidak berubah. Bukti jadwal: `schedule-verification.json`; bukti pembuatan draft awal: `draft-verification.json`.

Pendaftaran live: https://app.lokakasir.id/mitra/daftar
Portal: https://app.lokakasir.id/mitra
Bahan jualan: https://app.lokakasir.id/mitra/bahan

Kuota maksimum 100 (terisi 1 saat diperiksa), termasuk pengajuan pending dan suspended. Backend menegakkan batas pada pendaftaran publik, input admin, dan aktivasi ulang dalam transaksi terkunci. Akun baru pending: bisa mempelajari dan mengunduh materi, tetapi kode pribadi baru bisa dipakai setelah aktivasi admin.

## Pemeriksaan sebelum aktivasi

Admin perlu memeriksa KTP dan kepemilikan rekening, memastikan nama sesuai, serta memastikan kode tidak untuk toko sendiri/identitas pinjaman. Backend mensyaratkan NIK 16 digit dan rekening bernama sama, menolak NIK/rekening yang sudah dipakai mitra lain, serta meminta konfirmasi admin saat aktivasi. Ini bukan verifikasi otomatis ke Dukcapil atau bank. Identitas berbeda dan hubungan keluarga tetap memerlukan tinjauan manusia.

Komisi hanya berasal dari pembayaran Pro yang memenuhi syarat, ditahan 30 hari, bisa dibatalkan saat refund/penyalahgunaan, dan dicairkan manual setelah pemeriksaan. Tidak ada komisi merekrut sales lain.

## Kesiapan web

100 materi approved tersedia saat diperiksa (457 slide), termasuk salinan 408 JPEG HD dari 85 materi terbaru agar tetap tersedia setelah arsip Instagram. Unduh ZIP berisi JPEG berurutan dan caption. Akun active mendapat link referral otomatis dalam caption jika muat batas platform. Perbaikan atribusi mencakup jalur daftar langsung dan verifikasi OTP. Bukti live: `website-readiness.json`.

Backend: `67c700e9f73a9f18f0e1bf20b235f3c993688169` (production deployment berhasil).
Web: `c4fc279175ac1672ff6cc9ab8a85317967c8a8b0` (CI dan deployment Vercel berhasil).
Admin: `71e5b49f59933f80c07b4ef518dd36adfe7d4c1f` (CI, CodeQL, Vercel berhasil).

Verifikasi: seluruh tes Go dengan PostgreSQL lokal terisolasi; tes kapasitas concurrent 99→100 dan aktivasi identitas ganda; go vet; 506 tes web; 34 tes admin; build TypeScript/Vite; browser HP/desktop, unduhan ZIP nyata, kuota penuh, pending vs active, dan pemeriksaan endpoint produksi tanpa membuat akun uji produksi. Kunci enkripsi baru diinisialisasi hanya setelah dipastikan belum ada kunci ataupun data terenkripsi lama; nilainya hanya tersimpan di server.
