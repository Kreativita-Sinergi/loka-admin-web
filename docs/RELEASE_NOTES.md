# Release 0.1.0 — 11 Oktober 2026

Memerlukan backend 1.8.0.

- Admin dapat mengatur harga Pro khusus per bisnis/akun pemilik terpilih untuk bulanan, tahunan, dan 3 tahun.
- Input rupiah memakai pemisah ribuan; harga dibatasi Rp1–Rp100.000.000. Isian kosong mengembalikan harga normal.
- Harga berlaku pada tagihan baru dan divalidasi server. Form menampilkan status memuat, kegagalan, perubahan, dan hasil penyimpanan.

Deploy backend sebelum dashboard admin agar katalog dan endpoint pengaturan tersedia.

- Paket Free ditampilkan tanpa hitung mundur Pro; form perpanjangan admin menjelaskan penambahan durasi dari akhir masa aktif.
