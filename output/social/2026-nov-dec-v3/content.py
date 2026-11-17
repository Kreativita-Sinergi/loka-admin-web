"""Keep approved copy; give each future post a separately generated scene."""
import collections
import copy
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent
BASE = ROOT.parent/'2026-nov-dec-v2'
STYLES = {
    'photo':'Natural editorial photography with believable Indonesian small-business detail, tactile materials, realistic hands and skin, purposeful camera framing, no stock-photo posing.',
    'still-life':'Premium art-directed photographic still life, tactile objects and appetizing products, clear directional lighting, deliberate material detail and composition.',
    '3d':'Sophisticated tactile 3D illustration with expressive but restrained characters and meticulously made business props, soft light, physically coherent miniature scenery.',
    'clay':'Handcrafted clay and stop-motion visual style with rounded tactile objects, subtle handmade imperfections, thoughtful lighting and clear staging.',
    'paper-collage':'Premium editorial collage mixing photographic objects with textured torn paper, deliberate asymmetry, tactile depth and crisp realistic shadows.',
    'isometric':'Detailed isometric architectural miniature of a real small business, coherent floor layout, believable objects, refined miniature material textures and elevated camera.',
    'comic':'One expressive editorial comic scene with ink outlines, gouache color and real business props. No speech bubbles, lettering or repeated comic-panel template.',
    'watercolor':'Rich editorial watercolor and gouache with fine pencil detail, warm human observation, tactile paper grain, sophisticated controlled colors.'
}
COMMON = '''Use case: ads-marketing. Asset type: unique supporting artwork for ONE Indonesian small-business Instagram carousel, portrait 4:5. Brand context: Loka Kasir. Render the SPECIFIC scene below, with large clear subjects and a purposeful camera view. Upper 25–30 percent should be visually quiet so the separately typeset headline can be placed there; stage the actual objects and people prominently in the remaining area. The scene must carry the story; never substitute generic abstract cards, charts, floating app UI, or an anonymous cashier portrait. Cobalt-blue details connect the brand while other scene colors remain natural. No text, letters, numbers, logos, watermarks, readable receipts, signage, A/B/C graphics, infographic panels, price typography, or actual app screenshots. Unbranded screens and tags remain blank. Fictional illustrative art, not a real merchant photo or testimonial.'''

def build():
    initial={p['number']:p for p in json.loads((ROOT/'initial-prompts.json').read_text())['assets']}
    directions={}
    prompts=[]
    for line in (ROOT/'art-directions.txt').read_text().strip().splitlines():
        number,style,layout,palette,scene=line.split('|')
        number=int(number)
        assert number not in directions
        directions[number]={'style':style,'layout':layout,'palette':palette,'scene':scene}
        prompt=initial[number]['prompt'] if number in initial else f'{COMMON}\nStyle: {STYLES[style]}\nColor direction: {palette}.\nSpecific scene: {scene}'
        prompts.append({'number':number,'file':f'{number:03d}.png','prompt':prompt,**directions[number]})
    assert set(directions)==set(range(2,87))
    (ROOT/'image-prompts.json').write_text(json.dumps({'mode':'built-in image_gen','one_new_image_per_future_post':True,'assets':prompts},ensure_ascii=False,indent=2)+'\n')
    release_path=ROOT/'release-verification.json'
    release=json.loads(release_path.read_text()) if release_path.exists() else {}
    released_ids={p['id'] for p in release.get('posts',[])} if release.get('status')=='verified' else set()
    posts=copy.deepcopy(json.loads((BASE/'campaign.json').read_text()))
    for p in posts:
        n=p['number']
        direction=directions.get(n,{'style':'3d','layout':'paper','palette':'cobalt, cream','scene':'Previously published original; do not modify live post.'})
        p.update(art=f'assets/art/{n:03d}.png',art_direction=direction,cover_layout=direction['layout'],
                 visual_revision='v3_unique_scene_per_post',photo=f'art/{n:03d}.png')
        p['draft_status']='scheduled_revision' if p['original_post_id'] in released_ids else 'archived_original_preserved' if n==1 else 'v3_ready_for_review'
        assert p['caption']==json.loads((BASE/'campaign.json').read_text())[n-1]['caption']
    (ROOT/'campaign.json').write_text(json.dumps(posts,ensure_ascii=False,indent=2)+'\n')
    report={'posts_in_gallery':86,'future_posts_with_distinct_new_art':85,'new_generated_art_required':85,
            'styles':dict(collections.Counter(d['style'] for d in directions.values())),
            'layouts':dict(collections.Counter(d['layout'] for d in directions.values())),
            'copy_and_schedule_changed':False,'slides':sum(len(p['slides']) for p in posts),
            'status':'live_schedule_verified' if released_ids else 'v3_in_preparation'}
    (ROOT/'content-validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    (ROOT/'calendar.md').write_text('# Visual IG versi 3\n\n85 posting mendatang memakai 85 adegan baru; caption, ID, dan waktu tetap. Materi nomor 1 sudah terbit dan tidak diperbarui.\n\n| No. | Jadwal WIB | Adegan | Gaya |\n|---|---|---|---|\n'+'\n'.join(f'| {p["number"]} | {p["scheduled_at"][:16].replace("T"," ")} | {p["hook"]} | {p["art_direction"]["style"]} |' for p in posts)+'\n')
    print(json.dumps(report,ensure_ascii=False))

if __name__=='__main__':
    build()
