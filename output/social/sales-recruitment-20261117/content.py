"""Recruitment creative copy; actual signup and quota are owned by the application."""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent
SIGNUP_URL = 'https://app.lokakasir.id/mitra/daftar'
PORTAL_URL = 'https://app.lokakasir.id/mitra'

caption = f'''Jadi Mitra Sales Loka Kasir.

Kuota maksimal 100 mitra. Bantu pemilik usaha mengenal Loka Kasir lewat program berbasis komisi.

Di portal sales: kode/link referral pribadi, pantauan pelanggan & komisi, gambar promosi, caption siap salin, dan video tutorial.

Daftar: {SIGNUP_URL}
Pendaftaran melalui verifikasi tim Loka Kasir.

#LokaKasir #MitraSales #PeluangUsaha'''
threads = f'''Loka Kasir membuka pendaftaran Mitra Sales, maksimal 100 mitra.

Bantu usaha lokal mengenal Loka Kasir. Tersedia kode/link referral pribadi, pantauan pelanggan & komisi, serta materi promosi di portal sales.

Program berbasis komisi. Pendaftaran melalui verifikasi tim Loka Kasir.

Daftar: {SIGNUP_URL}'''

slides = [
    {'kind':'cover','eyebrow':'PROGRAM MITRA SALES','title':['Jadi Mitra Sales','Loka Kasir.'],
     'body':'Kenalkan Loka Kasir kepada pemilik usaha di sekitarmu.',
     'quota_label':'KUOTA MAKSIMAL','quota':100,'quota_unit':'MITRA SALES','art':'assets/recruitment-hero.png'},
    {'kind':'role','eyebrow':'KENALKAN. AJAK. DAMPINGI.','title':['Bantu usaha lokal','kenal Loka Kasir.'],
     'body':'Mulai dari kebutuhan usaha, lalu bantu mereka mengenal cara kerja Loka Kasir.',
     'steps':[
       {'title':'Kenali usaha lokal.','body':'Cari tahu kebutuhan kasir calon pelanggan.'},
       {'title':'Ajak pakai Loka Kasir.','body':'Bagikan kode atau link referral pribadimu.'},
       {'title':'Pantau di portal.','body':'Lihat pelanggan dan komisi dari akun salesmu.'}
     ],'art':'assets/recruitment-hero.png'},
    {'kind':'kit','eyebrow':'BAHAN JUALAN DI PORTAL SALES','title':['Materi promosi.','Tinggal pilih & bagikan.'],
     'body':'Gambar promosi resmi, caption siap salin, dan video tutorial tersedia di halaman sales.',
     'features':['Gambar promosi','Caption siap salin','Video tutorial'],'art':'assets/sales-content-kit.png'},
    {'kind':'cta','eyebrow':'TERBATAS MAKSIMAL 100 MITRA','title':['Siap jadi mitra?','Mulai dari daftar.'],
     'body':'Isi pendaftaran. Tim Loka Kasir akan meninjau pengajuanmu.',
     'verification_lines':['Pendaftaran melalui','verifikasi tim Loka Kasir.'],
     'url':SIGNUP_URL,'display_domain':'app.lokakasir.id','display_path':'/mitra/daftar',
     'footer':'Program mitra berbasis komisi.','art':'assets/sales-content-kit.png'}
]

post = {'key':'sales-recruitment-20261117','title':'Jadi Mitra Sales Loka Kasir — maksimal 100 mitra',
        'signup_url':SIGNUP_URL,'portal_url':PORTAL_URL,'maximum_sales_partners':100,
        'quota_wording':'Kuota maksimal 100 mitra; bukan klaim 100 slot tersisa.',
        'caption':caption,'threads_enabled':True,'threads_text':threads,'slides':slides,
        'files':[f'media/recruitment-{n}.jpg' for n in range(1,5)],
        'status':'ready_when_signup_and_content_portal_are_live',
        'publication_prerequisites':['Signup URL works publicly','Maximum-100 quota enforced by server','Sales content available in portal'],
        'published_or_scheduled':False}
assert len(caption)<=500, len(caption)
assert len(threads)<=500, len(threads)
(ROOT/'post.json').write_text(json.dumps(post,ensure_ascii=False,indent=2)+'\n')
(ROOT/'caption-instagram.txt').write_text(caption+'\n')
(ROOT/'caption-threads.txt').write_text(threads+'\n')
print(json.dumps({'slides':len(slides),'instagram_chars':len(caption),'threads_chars':len(threads),'status':post['status']}))
