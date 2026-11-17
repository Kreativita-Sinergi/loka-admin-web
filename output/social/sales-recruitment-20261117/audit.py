import hashlib
import json
import pathlib
import re
import struct

ROOT=pathlib.Path(__file__).resolve().parent

def jpeg_dimensions(raw):
    assert raw[:2]==b'\xff\xd8'
    offset=2
    while offset<len(raw):
        assert raw[offset]==255
        while raw[offset]==255:offset+=1
        marker=raw[offset];offset+=1
        length=struct.unpack('>H',raw[offset:offset+2])[0]
        if marker in (192,193,194,195,197,198,199,201,202,203,205,206,207):
            height,width=struct.unpack('>HH',raw[offset+3:offset+7]);return width,height
        offset+=length
    raise ValueError('Missing JPEG frame')

post=json.loads((ROOT/'post.json').read_text())
layout=json.loads((ROOT/'layout-validation.json').read_text())
prompts=json.loads((ROOT/'image-prompts.json').read_text())
assert len(post['slides'])==len(post['files'])==layout['slides']==4
assert layout['images'] and not layout['overflow'] and not layout['collisions']
assert post['maximum_sales_partners']==100
assert post['signup_url']=='https://app.lokakasir.id/mitra/daftar'
assert post['portal_url']=='https://app.lokakasir.id/mitra'
assert len(post['caption'])<=500 and len(post['threads_text'])<=500
assert len(re.findall(r'#[\w]+',post['caption']))<=5
assert '100 slot' not in post['caption'].lower()
assert '100 tersisa' not in post['caption'].lower()
assert 'Pendaftaran melalui verifikasi tim Loka Kasir.' in post['caption']
assert '%' not in post['caption'] and 'Rp' not in post['caption']
assert prompts['mode']=='built-in image_gen' and len(prompts['assets'])==2
prior_art=ROOT.parent/'2026-nov-dec-v3/assets/art'
prior_hashes={hashlib.sha256(p.read_bytes()).hexdigest() for p in prior_art.glob('*.png')}
sources=[]
for p in prompts['assets']:
    file=ROOT/'assets'/p['file'];raw=file.read_bytes()
    assert raw[:8]==b'\x89PNG\r\n\x1a\n'
    width,height=struct.unpack('>II',raw[16:24])
    assert width>=1024 and height>=1024
    digest=hashlib.sha256(raw).hexdigest()
    assert digest not in prior_hashes
    sources.append({'file':'assets/'+p['file'],'width':width,'height':height,'sha256':digest,'mode':'built-in image_gen'})
assert len({p['sha256'] for p in sources})==2
media=[]
for f in post['files']:
    raw=(ROOT/f).read_bytes();width,height=jpeg_dimensions(raw)
    assert (width,height)==(1080,1350) and raw[-2:]==b'\xff\xd9'
    media.append({'file':f,'width':width,'height':height,'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()})
assert len({p['sha256'] for p in media})==4
(ROOT/'media-manifest.json').write_text(json.dumps(media,ensure_ascii=False,indent=2)+'\n')
(ROOT/'art-manifest.json').write_text(json.dumps(sources,ensure_ascii=False,indent=2)+'\n')
result={'status':'passed','slides':4,'dimensions':'1080x1350','new_original_images':2,
        'image_mode':'built-in image_gen','reused_previous_campaign_raster_assets':0,
        'instagram_chars':len(post['caption']),'threads_chars':len(post['threads_text']),
        'quota':100,'quota_remaining_claims':False,'income_or_percentage_claims':False,
        'text_overflow':0,'text_collisions':0,'publication_actions_performed':False,
        'live_signup_verification':'application owner prerequisite; not asserted by asset audit'}
(ROOT/'audit.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(result,ensure_ascii=False,indent=2))
