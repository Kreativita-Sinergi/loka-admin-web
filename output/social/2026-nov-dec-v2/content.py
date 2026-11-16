"""Rebuild the review draft. No publishing or scheduling calls."""
import collections
import datetime
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent
OLD = ROOT.parent / '2026-nov-dec'
LABELS = {'math': 'Bedah angka', 'chat': 'Obrolan kasir', 'quiz': 'Coba pilih',
          'compare': 'Dua sudut', 'myth': 'Cek anggapan', 'story': 'Cerita toko',
          'checklist': 'Checklist toko', 'warm': 'Di balik usaha'}
MATH = {
    2: {'hero': '50%', 'label': 'penurunan sisa per produk dalam simulasi ini',
        'rows': [['Harga jual', 'Rp20.000'], ['Biaya produk', 'Rp12.000'], ['Diskon 20%', 'Rp4.000']],
        'equation': 'Rp16.000 − Rp12.000', 'result': 'Rp4.000', 'before': 'Rp8.000', 'after': 'Rp4.000', 'ratio': 50,
        'note': 'Sisa harga jual dikurangi biaya produk, sebelum biaya lain. Contoh ini tidak menunjukkan laba bersih.'},
    13: {'hero': 'Rp2rb', 'label': 'sisa per paket setelah tambah minum pada simulasi ini',
         'rows': [['Harga paket', 'Rp12.000'], ['Biaya makanan', 'Rp8.000'], ['Biaya minum', 'Rp2.000']],
         'equation': 'Rp12.000 − Rp10.000', 'result': 'Rp2.000', 'before': 'Rp4.000', 'after': 'Rp2.000', 'ratio': 50,
         'note': 'Simulasi biaya paket. Sisa ini masih perlu menutup biaya usaha lainnya.'},
    25: {'hero': '20', 'label': 'transaksi per hari dalam simulasi target ini',
         'rows': [['Target harian', 'Rp600.000'], ['Rata-rata belanja', 'Rp30.000']],
         'equation': 'Rp600.000 ÷ Rp30.000', 'result': '20 transaksi',
         'note': 'Simulasi volume penjualan. Tinjau juga biaya, jam layanan, dan kapasitas tim.'},
    29: {'hero': 'Rp4rb', 'label': 'sisa per produk setelah diskon dalam simulasi ini',
         'rows': [['Harga awal', 'Rp25.000'], ['Diskon 12%', 'Rp3.000'], ['Biaya produk', 'Rp18.000']],
         'equation': 'Rp22.000 − Rp18.000', 'result': 'Rp4.000', 'before': 'Rp7.000', 'after': 'Rp4.000', 'ratio': 400/7,
         'note': 'Sisa sebelum biaya lain. Simulasi ini tidak menunjukkan laba bersih.'},
    30: {'hero': 'Rp240rb', 'label': 'akumulasi kas keluar selama 30 hari dalam simulasi ini',
         'rows': [['Pengeluaran harian', 'Rp8.000'], ['Lama pengulangan', '30 hari']],
         'equation': 'Rp8.000 × 30', 'result': 'Rp240.000',
         'note': 'Simulasi pengeluaran berulang. Gunakan jumlah dan frekuensi sebenarnya dari tokomu.'},
    35: {'hero': 'Rp10rb', 'label': 'biaya kemasan yang mudah terlewat dalam simulasi ini',
         'rows': [['Isi produk', 'Rp40.000'], ['Kemasan lengkap', 'Rp10.000']],
         'equation': 'Rp40.000 + Rp10.000', 'result': 'Rp50.000',
         'note': 'Simulasi biaya paket. Periksa komponen biaya lain sebelum menentukan harga jual.'},
    77: {'hero': '30 mnt', 'label': 'total serah terima berurutan dalam simulasi ini',
         'rows': [['Pesanan', '10'], ['Waktu per pesanan', '3 menit'], ['Petugas serah terima', '1 orang']],
         'equation': '10 × 3 menit', 'result': '30 menit',
         'note': 'Simulasi serah terima berurutan oleh satu petugas. Waktu menyiapkan produk belum termasuk.'}
}
COMPARE_LABELS = {
    5: ['Ingatan', 'Catatan'], 16: ['Di toko', 'Online'], 20: ['Bikin repot', 'Bikin nyaman'],
    22: ['Di layar', 'Di rak'], 31: ['Campur tugas', 'Bagi peran'], 34: ['Di poster', 'Di kasir'],
    37: ['Banyak tanya', 'Jelas memilih'], 43: ['Di etalase', 'Di rak'], 46: ['Dari chat', 'Langsung datang'],
    52: ['Nota lama', 'Nota baru'], 60: ['Perlu ditebak', 'Mudah dibaca'], 64: ['Milik toko', 'Titipan'],
    68: ['Cuma dititip', 'Ada pegangan'], 70: ['Berhasil bayar', 'Dana tersedia'], 79: ['Permintaan', 'Operasional']
}
MYTH_LABELS = {
    1: ['Harga tetap', 'Biaya berubah'], 9: ['Murah per dus', 'Uang tertahan'],
    39: ['Stok banyak', 'Umur simpan'], 44: ['Laci penuh', 'Ada kebutuhan'],
    54: ['Saldo masuk', 'Hak pelanggan'], 59: ['Pesanan besar', 'Biaya tambahan'],
    81: ['Stok tersisa', 'Cek per barang']
}

def photo_for(p):
    if any(w in p['pillar'].lower() for w in ['hampers', 'natal', 'kado', 'titipan']):
        return 'hampers-photo.png'
    return {'payment': 'cash-photo.png', 'reports': 'cash-photo.png',
            'gifts': 'hampers-photo.png', 'stock': 'retail-photo.png',
            'cafe': 'owner-photo.png', 'team': 'owner-photo.png'}[p['visual']]

def build():
    old = json.loads((OLD/'campaign.json').read_text())
    receipt_path = ROOT/'release-verification.json'
    receipt = json.loads(receipt_path.read_text()) if receipt_path.exists() else {}
    live = receipt.get('status') == 'verified'
    released_ids = {p['id'] for p in receipt.get('posts', [])} if live else set()
    old_ids = {p['scheduled_at']: p['id'] for p in json.loads((OLD/'verification.json').read_text())['posts']}
    lines = (ROOT/'rewrite.txt').read_text().strip().splitlines()
    assert len(lines) == len(old) == 86
    posts = []
    for index, (line, original) in enumerate(zip(lines, old), 1):
        fields = line.split('|')
        assert len(fields) == 9, (index, len(fields))
        num, kind, hook, sub, scene_title, scene_body, payoff_title, payoff_body, action_title = fields[0], fields[1], fields[2], fields[3], fields[4], fields[5], fields[6], fields[7], fields[8]
        assert int(num) == index
        assert kind in LABELS
        p = dict(original)
        p.update(number=index, format=kind, format_label=LABELS[kind], hook=hook,
                 title=[hook], subheading=sub, photo=photo_for(original), original_post_id=old_ids[original['scheduled_at']],
                 draft_status='review_only', source=None, lesson_title=payoff_title, lesson_body=payoff_body,
                 theme=['blue', 'paper', 'navy', 'lime'][(index//2) % 4])
        if live:
            p['draft_status'] = 'scheduled_revision' if p['original_post_id'] in released_ids else 'archived_original_preserved'
        steps = original['steps']
        # The content schema and the rendered slide share the same copy.
        slides = [{'kind': 'cover', 'eyebrow': original['pillar'], 'title': hook, 'body': sub}]
        second = {'kind': kind, 'eyebrow': LABELS[kind], 'title': scene_title, 'body': scene_body}
        if kind in ('chat', 'quiz', 'compare'):
            second['items'] = scene_body.split('~')
            assert len(second['items']) >= 2
        if kind == 'checklist':
            second['items'] = steps
        if kind == 'math':
            second['data'] = MATH[index]
            p['math'] = MATH[index]
        if kind == 'compare':
            p['compare_labels'] = COMPARE_LABELS[index]
        if kind == 'myth':
            p['compare_labels'] = MYTH_LABELS[index]
        slides.append(second)
        if kind == 'math':
            slides.append({'kind': 'calculation', 'eyebrow': 'Lihat hitungannya', 'title': 'Angkanya jadi begini.',
                           'body': MATH[index]['note'], 'data': MATH[index]})
        slides.append({'kind': 'payoff', 'eyebrow': 'Yang perlu dibawa pulang', 'title': payoff_title, 'body': payoff_body})
        if kind not in ('checklist', 'warm'):
            slides.append({'kind': 'action', 'eyebrow': 'Coba di tokomu', 'title': action_title, 'items': steps, 'body': ''})
        # Avoid selling a tool inside holiday wishes and appreciation content.
        bridge = '' if kind == 'warm' else original['bridge']
        cta = original['cta']
        p['bridge'] = bridge
        p['cta'] = cta
        slides.append({'kind': 'close', 'eyebrow': 'Loka Kasir' if kind == 'warm' else 'Bawa ke praktik',
                       'title': action_title if kind == 'warm' else cta, 'body': bridge,
                       'cta': cta if kind == 'warm' else action_title})
        p['slides'] = slides
        p['files'] = [f'media/{index:03d}-{n}.jpg' for n in range(1, len(slides)+1)]
        story_text = scene_body.replace('~', '\n')
        caption = f'{hook}\n\n{story_text}\n\n{payoff_title}\n{payoff_body}'
        if kind != 'warm':
            caption += '\n\n' + action_title + '\n' + '\n'.join('• '+s for s in steps)
        if bridge:
            caption += '\n\n' + bridge
        caption += '\n\n' + cta + '\n\n#LokaKasir #UMKM #TipsUsaha'
        p['caption'] = caption
        p['threads_text'] = f'{hook}\n\n{payoff_body}\n\n{cta}'
        assert len(caption) <= 2200, (index, len(caption))
        assert len(p['threads_text']) <= 500, (index, len(p['threads_text']))
        assert 4 <= len(slides) <= 6
        posts.append(p)
    assert len({p['caption'] for p in posts}) == 86
    (ROOT/'campaign.json').write_text(json.dumps(posts, ensure_ascii=False, indent=2)+'\n')
    report = {'status': 'live_schedule_verified' if live else 'review_only_not_uploaded_or_scheduled', 'posts': len(posts),
              'slides': sum(len(p['slides']) for p in posts),
              'formats': dict(collections.Counter(p['format_label'] for p in posts)),
              'slide_counts': dict(collections.Counter(len(p['slides']) for p in posts)),
              'new_generated_photos': 4, 'retained_illustrations': 6,
              'original_dates_and_ids_preserved_as_references': True,
              'max_caption_chars': max(len(p['caption']) for p in posts),
              'max_threads_chars': max(len(p['threads_text']) for p in posts)}
    if live:
        report.update(live_posts=receipt['updated_posts'], live_slides=receipt['updated_slides'],
                      release_receipt='release-verification.json')
    (ROOT/'content-validation.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
    calendar_status = (f'{receipt["updated_posts"]} posting dan {receipt["updated_slides"]} slide revisi sudah dipasang ke antrean IG/Threads dan diverifikasi. Jam tayang serta ID posting tetap. Materi yang sudah terbit tidak diterbitkan ulang.' if live else 'Draf untuk ditinjau. Jadwal di bawah adalah referensi materi lama; belum memperbarui jadwal IG. Materi yang sudah terbit tidak untuk diterbitkan ulang.')
    (ROOT/'calendar.md').write_text('# Revisi materi IG November–Desember 2026\n\n'+calendar_status+'\n\n| No. | Jadwal WIB | Format | Slide | Hook |\n|---|---|---|---|---|\n' + '\n'.join(f'| {p["number"]} | {p["scheduled_at"][:16].replace("T", " ")} | {p["format_label"]} | {len(p["slides"])} | {p["hook"]} |' for p in posts)+'\n')
    print(json.dumps(report, ensure_ascii=False, indent=2))

if __name__ == '__main__':
    build()
