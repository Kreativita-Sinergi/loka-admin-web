"""Audit final image dimensions, completeness, text, and original post mapping."""
import collections
import hashlib
import json
import pathlib
import struct

ROOT = pathlib.Path(__file__).resolve().parent

def jpeg_size(data):
    assert data[:2] == b'\xff\xd8'
    offset = 2
    while offset < len(data):
        assert data[offset] == 255
        while data[offset] == 255:
            offset += 1
        marker = data[offset]
        offset += 1
        length = struct.unpack('>H', data[offset:offset+2])[0]
        if marker in (192,193,194,195,197,198,199,201,202,203,205,206,207):
            height, width = struct.unpack('>HH', data[offset+3:offset+7])
            return width, height
        offset += length
    raise ValueError('Missing JPEG frame header')

def run():
    posts = json.loads((ROOT/'campaign.json').read_text())
    receipt_path = ROOT/'release-verification.json'
    receipt = json.loads(receipt_path.read_text()) if receipt_path.exists() else {}
    live = receipt.get('status') == 'verified'
    released_ids = {p['id'] for p in receipt.get('posts', [])} if live else set()
    old = json.loads((ROOT.parent/'2026-nov-dec/campaign.json').read_text())
    assert len(posts) == 86
    assert len({p['caption'] for p in posts}) == 86
    assert len({p['hook'] for p in posts}) == 86
    assert all(a['scheduled_at'] == b['scheduled_at'] for a,b in zip(posts,old))
    assert len({p['original_post_id'] for p in posts}) == 86
    layout = json.loads((ROOT/'layout-validation.json').read_text())
    assert not layout['overflow'] and not layout['collisions'] and layout['images']
    assert layout['slides'] == sum(len(p['slides']) for p in posts)
    manifest = []
    for p in posts:
        assert 4 <= len(p['slides']) <= 6
        assert len(p['files']) == len(p['slides'])
        assert len(p['caption']) <= 2200 and len(p['threads_text']) <= 500
        expected_status = ('scheduled_revision' if p['original_post_id'] in released_ids else 'archived_original_preserved') if live else 'review_only'
        assert p['draft_status'] == expected_status
        titles = [s['title'] for s in p['slides']]
        assert all(a != b for a,b in zip(titles,titles[1:])), (p['number'], titles)
        for f in p['files']:
            raw = (ROOT/f).read_bytes()
            width,height = jpeg_size(raw)
            assert (width,height) == (1080,1350), f
            assert raw[-2:] == b'\xff\xd9', f
            manifest.append({'file':f,'width':width,'height':height,'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()})
    assert len(manifest) == 413
    expected = {str(ROOT/f) for p in posts for f in p['files']}
    assert expected == {str(f) for f in (ROOT/'media').glob('*.jpg')}
    assert len({m['sha256'] for m in manifest}) == len(manifest)
    gallery = (ROOT/'index.html').read_text()
    assert gallery.count('<article ') == 86
    assert gallery.count('loading="lazy"') == 413
    for p in posts:
        assert all(f in gallery for f in p['files'])
    # Independently check the numerical relationships used in the creative.
    assert 20_000*(1-.2)-12_000 == 4_000
    assert ((20_000-12_000)-4_000)/(20_000-12_000) == .5
    assert 12_000-(8_000+2_000) == 2_000
    assert 600_000/30_000 == 20
    assert 25_000*(1-.12)-18_000 == 4_000
    assert 8_000*30 == 240_000
    assert 40_000+10_000 == 50_000
    assert 10*3 == 30
    assert 4*2-6 == 2 and 3*24 == 72
    (ROOT/'media-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    result={'status':'passed','posts':86,'slides':len(manifest),'dimensions':'1080x1350',
            'unique_final_jpegs':len({m['sha256'] for m in manifest}),
            'formats':len({p['format'] for p in posts}),'text_overflow':0,'block_collisions':0,
            'original_date_and_id_mapping':'passed','caption_and_threads_limits':'passed',
            'simulation_arithmetic':'passed','gallery_references':'passed',
            'total_media_bytes':sum(m['bytes'] for m in manifest),
            'external_uploads_or_schedule_changes':live}
    if live:
        result.update(live_posts=receipt['updated_posts'],live_slides=receipt['updated_slides'],
                      release_receipt='release-verification.json')
    (ROOT/'audit.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(result,ensure_ascii=False,indent=2))

if __name__ == '__main__':
    run()
