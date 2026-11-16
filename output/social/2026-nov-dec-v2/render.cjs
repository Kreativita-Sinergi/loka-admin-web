const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require(process.env.LOKA_PLAYWRIGHT_PATH || '/private/tmp/loka-social-v2-tools/node_modules/playwright');
const root = __dirname;
const posts = JSON.parse(fs.readFileSync(path.join(root, 'campaign.json')));
const e = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const para = (text, cls='body') => `<p class="${cls}" data-fit>${e(text)}</p>`;
const title = (text, tag='h2') => `<${tag} data-fit>${e(text)}</${tag}>`;
const tag = text => `<div class="eyebrow">${e(text)}</div>`;
const list = (items, cls='steps') => `<div class="${cls}">${items.map((s,i) => `<div class="step"><span class="step-num">${String(i+1).padStart(2,'0')}</span><p data-fit>${e(s)}</p></div>`).join('')}</div>`;

function content(p,s,n) {
  if (s.kind === 'cover') {
    let art = '';
    if (p.format === 'math') art = `<div class="number-art">${tag('SIMULASI')}<div class="hero-number" data-fit>${e(p.math.hero)}</div>${para(p.math.label,'number-caption')}</div>`;
    if (p.format === 'chat') {
      const sample=p.slides[1].items[0].replace(/^[^:]+:\s*/, '');
      art=`<div class="chat-preview">${tag('DI DEPAN KASIR')}${para('“'+sample+'”','preview-quote')}<span class="chat-dots">● ● ●</span></div>`;
    }
    if (p.format === 'quiz') art = `<div class="quiz-art"><span>A</span><span>B</span><span>C</span></div><p class="art-note">Pilih jawabanmu di slide berikutnya.</p>`;
    if (p.format === 'compare' || p.format === 'myth') art = `<div class="compare-art">${p.compare_labels.map((x,i)=>`<div>${tag(i===0?'01':'02')}<strong data-fit>${e(x)}</strong></div>`).join('')}</div>`;
    if (p.format === 'checklist') art = `<div class="check-illustrated"><div class="check-preview">${p.steps.slice(0,2).map(x=>`<div><span>✓</span><p data-fit>${e(x)}</p></div>`).join('')}</div><img class="mini-scene" src="assets/${e(p.visual)}.png" alt=""></div>`;
    return `${tag(s.eyebrow)}${title(s.title,'h1')}${para(s.body,'deck')}${art}<div class="cover-prompt">${e(p.format==='warm'?'Untuk orang-orang di balik usaha.':p.format==='quiz'?'Coba pilih. Geser untuk cek →':p.format==='math'?'Geser, kita hitung bareng →':'Ada yang bisa dibawa ke tokomu →')}</div>`;
  }
  if (s.kind === 'chat') return `${tag(s.eyebrow)}${title(s.title)}<div class="conversation">${s.items.map((x,i)=>{const at=x.indexOf(':');return `<div class="bubble b${i%2}">${at>0?`<span class="speaker">${e(x.slice(0,at))}</span>`:''}${para(at>0?x.slice(at+1).trim():x,'bubble-copy')}</div>`;}).join('')}</div><p class="note">Ilustrasi percakapan sehari-hari.</p>`;
  if (s.kind === 'quiz') return `${tag(s.eyebrow)}${title(s.title)}<div class="options">${s.items.map((x,i)=>`<div class="option"><span>${'ABC'[i]}</span><p data-fit>${e(x.replace(/^[ABC]\.\s*/,''))}</p></div>`).join('')}</div><div class="swipe-note">Sudah pilih? Cek alasannya →</div>`;
  if (s.kind === 'compare') return `${tag(s.eyebrow)}${title(s.title)}<div class="comparison">${s.items.map((x,i)=>`<div class="comparison-card"><span class="card-label">${e(p.compare_labels[i])}</span>${para(x,'compare-copy')}</div>`).join('')}</div>`;
  if (s.kind === 'math') return `${tag('SIMULASI · BUKAN DATA MERCHANT')}${title(s.title)}${para(s.body,'intro')}<div class="receipt">${s.data.rows.map(([label,value])=>`<div class="receipt-row"><span>${e(label)}</span><strong>${e(value)}</strong></div>`).join('')}<div class="receipt-bottom">Lanjut: lihat hasil hitungannya →</div></div>`;
  if (s.kind === 'calculation') {
    const d=s.data;
    const bars=d.before?`<div class="bars"><div class="bar-label"><span>Sebelum</span><b>${e(d.before)}</b></div><div class="bar-track"><i style="width:100%"></i></div><div class="bar-label"><span>Setelah</span><b>${e(d.after)}</b></div><div class="bar-track"><i style="width:${d.ratio}%"></i></div></div>`:'';
    return `${tag('SIMULASI')}${title(s.title)}<div class="equation">${e(d.equation)}</div><div class="result" data-fit>${e(d.result)}</div>${bars}${para(d.note,'math-note')}`;
  }
  if (s.kind === 'checklist') return `${tag(s.eyebrow)}${title(s.title)}${para(s.body,'intro')}${list(s.items,'steps check-steps')}`;
  if (s.kind === 'action') return `${tag(s.eyebrow)}${title(s.title)}${list(s.items)}<p class="note">Pilih yang sesuai dengan kondisi tokomu.</p>`;
  if (s.kind === 'close') return `${tag(s.eyebrow)}${title(s.title)}${s.body?`<div class="product-note">${tag('PAKAI CATATAN USAHAMU')}${para(s.body,'product-copy')}</div>`:''}<div class="cta-box">${tag(p.format==='warm'?'DARI LOKA KASIR':'SATU LANGKAH BERIKUTNYA')}${para(s.cta,'cta-copy')}</div>${p.format==='warm'?'':'<div class="site-address">lokakasir.id</div>'}`;
  return `${tag(s.eyebrow)}${title(s.title)}<div class="reading-card">${para(s.body,'reading-copy')}</div>${s.kind==='story'?'<div class="swipe-note">Lanjut: apa yang bisa dirapikan? →</div>':''}${s.kind==='myth'?'<div class="swipe-note">Geser untuk cek cara membacanya →</div>':''}`;
}

const css=`
@font-face{font-family:Jakarta;src:url('assets/Jakarta-Medium.ttf');font-weight:500}
@font-face{font-family:Jakarta;src:url('assets/Jakarta-SemiBold.ttf');font-weight:600}
@font-face{font-family:Jakarta;src:url('assets/Jakarta-Bold.ttf');font-weight:700}
@font-face{font-family:Jakarta;src:url('assets/Jakarta-ExtraBold.ttf');font-weight:800}
*{box-sizing:border-box}body{margin:0;background:#d6dfef;font-family:Jakarta,sans-serif;font-weight:500}h1,h2,p{margin:0}[data-fit]{padding-bottom:.1em}
.slide{width:1080px;height:1350px;position:relative;overflow:hidden;margin-bottom:24px;padding:65px 76px 48px;display:flex;flex-direction:column;background:var(--bg);color:var(--ink);--bg:#125cff;--ink:#fff;--accent:#ddfa75;--muted:#dce7ff}
.paper{--bg:#f5f1e8;--ink:#102545;--accent:#125cff;--muted:#42546d}.navy{--bg:#0c203e;--ink:#f5f1e8;--accent:#ddfa75;--muted:#ced8e9}.lime{--bg:#ddfa75;--ink:#102545;--accent:#125cff;--muted:#344b30}
.masthead{position:relative;z-index:3;height:60px;flex-shrink:0;display:flex;align-items:center;justify-content:space-between}.brand{width:189px;height:58px;object-fit:contain;object-position:left}.paper .brand,.lime .brand{filter:brightness(0) saturate(100%) invert(12%) sepia(21%) saturate(1788%) hue-rotate(174deg) brightness(95%) contrast(97%)}.pagination{font-size:24px;letter-spacing:1px}.stage{position:relative;z-index:2;flex:1;min-height:0;display:flex;flex-direction:column;margin-top:68px;margin-bottom:38px;gap:28px}.eyebrow{font-size:23px;font-weight:700;letter-spacing:1.4px;line-height:1.4;color:var(--accent);text-transform:uppercase;flex-shrink:0;max-width:900px}.paper .eyebrow,.lime .eyebrow{color:#125cff}
h1{font-size:87px;line-height:1.12;font-weight:800;letter-spacing:-3.7px;max-height:400px;flex-shrink:0;text-wrap:pretty}h2{font-size:76px;line-height:1.12;letter-spacing:-2.8px;font-weight:800;max-height:270px;flex-shrink:0;text-wrap:pretty}.deck{font-size:32px;line-height:1.5;max-height:110px;color:var(--muted);flex-shrink:0}.body{font-size:40px;line-height:1.5}.intro{font-size:32px;line-height:1.5;max-height:165px;flex-shrink:0;color:var(--muted)}
footer{position:relative;z-index:3;flex-shrink:0;display:flex;align-items:center;justify-content:space-between;font-size:21px;height:32px;color:var(--muted)}.progress{display:flex;gap:8px}.progress i{display:block;width:34px;height:4px;border-radius:3px;background:currentColor;opacity:.25}.progress i.done{opacity:1}
.cover-prompt{margin-top:auto;font-size:25px;font-weight:700;line-height:1.4;flex-shrink:0}.number-art{margin-top:2px;flex:1;min-height:245px;display:flex;flex-direction:column;justify-content:center;gap:7px}.number-art .eyebrow{font-size:20px}.hero-number{font-size:184px;font-weight:800;letter-spacing:-9px;line-height:1.12;color:var(--accent);max-height:210px}.number-caption{font-size:25px;line-height:1.5;max-width:740px;max-height:80px;color:var(--muted)}
.chat-preview{margin:15px 24px 0 0;background:#f5f1e8;color:#102545;padding:35px 40px;border-radius:30px 30px 30px 0;transform:rotate(-2deg);box-shadow:12px 14px 0 #071b4138;flex:1;max-height:315px;min-height:200px;display:flex;flex-direction:column;gap:18px}.chat-preview .eyebrow{color:#125cff;font-size:19px}.preview-quote{font-size:43px;line-height:1.35;font-weight:700;max-height:160px}.chat-dots{font-size:15px;letter-spacing:5px;color:#125cff;margin-top:auto}
.quiz-art{display:flex;gap:22px;margin-top:15px;align-items:center;justify-content:center;flex:1;max-height:280px;min-height:185px}.quiz-art span{display:flex;justify-content:center;align-items:center;background:#125cff;color:#fff;width:239px;height:222px;border-radius:36px;font-size:125px;font-weight:800}.quiz-art span:nth-child(2){transform:rotate(-7deg);background:#0c203e;color:#ddfa75}.art-note{font-size:25px;color:var(--muted);text-align:center}
.compare-art{display:grid;grid-template-columns:1fr 1fr;gap:2px;flex:1;min-height:240px;max-height:330px;margin-top:15px;border-radius:24px;overflow:hidden}.compare-art>div{display:flex;flex-direction:column;justify-content:center;gap:25px;padding:35px;background:#f5f1e8;color:#102545}.compare-art>div:last-child{background:#125cff;color:#fff}.compare-art .eyebrow{color:#125cff}.compare-art>div:last-child .eyebrow{color:#ddfa75}.compare-art strong{font-size:46px;line-height:1.2;letter-spacing:-1.3px;max-height:130px}
.check-illustrated{display:grid;grid-template-columns:1.3fr 1fr;gap:23px;align-items:center;flex:1;min-height:240px;max-height:355px;margin-top:12px}.mini-scene{width:100%;height:325px;object-fit:cover;object-position:50% 100%;border-radius:22px}.check-preview{display:grid;gap:14px;align-content:center;max-height:330px;min-height:230px}.check-preview>div{display:flex;gap:15px;padding:22px 18px;border:2px solid currentColor;border-radius:18px;align-items:center}.check-preview span{color:var(--accent);font-size:34px;font-weight:800}.check-preview p{font-size:27px;line-height:1.35;font-weight:700;max-height:112px}
.photo-cover{--bg:#0c203e;--ink:#fff;--accent:#ddfa75;--muted:#edf1f6}.photo-cover .brand{filter:none}.photo-cover .eyebrow{color:#ddfa75}.photo-cover .cover-photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0}.photo-cover .photo-shade{position:absolute;inset:0;background:linear-gradient(180deg,#07152be6 0%,#07152bc4 22%,#07152b52 52%,#07152b08 73%,#07152bba 100%);z-index:1}.photo-cover h1{max-height:420px}.photo-cover .deck{max-width:810px}.photo-cover .cover-prompt{font-size:24px;background:#07152bbb;align-self:flex-start;padding:15px 21px;border-radius:11px}.warm.cover .stage{margin-top:74px}.warm.cover h1{font-size:82px}
.conversation{display:flex;flex-direction:column;gap:26px;flex:1;min-height:0;justify-content:center}.bubble{padding:30px 35px;background:#fff;color:#102545;border-radius:27px 27px 27px 4px;max-width:825px;display:flex;flex-direction:column;gap:12px}.bubble.b1{align-self:flex-end;background:#dff975;border-radius:27px 27px 4px 27px;margin-left:76px}.speaker{font-size:20px;font-weight:800;letter-spacing:.7px;color:#125cff}.bubble-copy{font-size:36px;line-height:1.45;max-height:210px;letter-spacing:-.5px}.note{font-size:23px;line-height:1.5;color:var(--muted);margin-top:auto;flex-shrink:0}
.options{display:grid;gap:22px;flex:1;align-content:center;min-height:0}.option{display:flex;gap:24px;align-items:center;padding:27px 30px;background:#fff;color:#102545;border:2px solid #dce3ec;border-radius:23px;min-height:131px}.option>span{font-size:42px;font-weight:800;color:#125cff;width:52px;flex-shrink:0}.option p{font-size:34px;line-height:1.35;max-height:145px;letter-spacing:-.5px}.swipe-note{font-size:26px;font-weight:700;line-height:1.5;margin-top:auto;color:var(--accent)}
.comparison{flex:1;min-height:0;display:grid;grid-template-columns:1fr 1fr;gap:20px;align-content:center}.comparison-card{padding:37px 31px;min-height:420px;background:#f5f1e8;color:#102545;border-radius:25px;display:flex;flex-direction:column;gap:30px}.comparison-card:last-child{background:#125cff;color:#fff}.card-label{font-size:22px;font-weight:800;line-height:1.4;letter-spacing:.3px;padding-bottom:24px;border-bottom:2px solid #8b9aaf60}.compare-copy{font-size:35px;line-height:1.5;letter-spacing:-.8px;max-height:400px}
.receipt{margin-top:15px;padding:40px 38px;background:#f5f1e8;color:#102545;border-radius:6px;box-shadow:12px 14px 0 #051a4933}.receipt-row{display:flex;justify-content:space-between;align-items:center;padding:26px 0;border-bottom:2px dashed #a5b0c0;gap:16px;font-size:31px;line-height:1.5}.receipt-row strong{font-size:37px;white-space:nowrap;font-weight:800}.receipt-bottom{font-size:24px;line-height:1.5;color:#125cff;margin-top:36px;font-weight:700}.equation{font-size:42px;line-height:1.5;margin-top:36px;letter-spacing:-1px;flex-shrink:0}.result{font-size:132px;font-weight:800;line-height:1.15;letter-spacing:-5px;color:var(--accent);max-height:170px;flex-shrink:0}.math-note{font-size:29px;line-height:1.5;color:var(--muted);margin-top:auto;max-height:145px;flex-shrink:0}.bars{display:flex;flex-direction:column;gap:14px;margin-top:18px}.bar-label{display:flex;justify-content:space-between;font-size:25px;line-height:1.5}.bar-track{width:100%;height:35px;background:#ffffff20;border-radius:6px;margin-bottom:20px;overflow:hidden}.bar-track i{display:block;height:100%;background:var(--accent)}
.reading-card{flex:1;min-height:0;max-height:500px;display:flex;flex-direction:column;justify-content:center;border-top:3px solid var(--accent);border-bottom:1px solid #a4b2cb70;padding:40px 0;margin-top:25px}.reading-copy{font-size:46px;line-height:1.5;letter-spacing:-.9px;max-height:410px}.payoff .stage{gap:35px}.payoff h2{font-size:86px;max-height:305px}.payoff .reading-card{background:transparent;border:0;padding:0;margin-top:18px;max-height:450px}.payoff .reading-copy{font-size:42px;max-height:375px}.payoff .stage:after{content:'';display:block;margin-top:auto;height:8px;width:125px;background:var(--accent);border-radius:5px;flex-shrink:0}
.steps{display:grid;gap:25px;flex:1;min-height:0;align-content:center}.step{display:flex;gap:26px;align-items:center;padding:28px 30px;background:#fff;color:#102545;border-radius:21px;min-height:133px}.step-num{flex-shrink:0;font-size:29px;line-height:1;font-weight:800;display:flex;align-items:center;justify-content:center;width:66px;height:66px;color:#125cff;border-radius:17px;background:#e9f0ff}.step p{font-size:35px;font-weight:700;line-height:1.35;letter-spacing:-.6px;max-height:130px}.check-steps .step{border:2px solid #c8d3e3}.check-steps{gap:18px}.check-steps .step{padding:24px;min-height:119px}.check-steps .step p{font-size:32px;max-height:112px}.checklist .intro{font-size:29px;max-height:140px}
.product-note{padding:32px 35px;background:#ffffff14;border:2px solid #ffffff35;border-radius:24px;margin-top:15px}.product-note .eyebrow{font-size:18px;margin-bottom:22px}.product-copy{font-size:33px;line-height:1.5;max-height:245px}.cta-box{margin-top:auto;border-top:2px solid var(--accent);padding-top:33px;display:flex;flex-direction:column;gap:25px}.cta-box .eyebrow{font-size:20px}.cta-copy{font-size:43px;font-weight:800;line-height:1.4;letter-spacing:-.9px;max-height:230px}.site-address{font-size:25px;letter-spacing:1px}.close.warm .cta-box{margin-top:30px;border:0;padding-top:20px}.close.warm .cta-copy{font-size:40px}.close.warm .stage{justify-content:center}.close.warm h2{font-size:81px;max-height:380px}.close.warm .eyebrow{color:var(--muted)}
`;

function themeFor(p,s) {
  if (s.kind==='cover') return {math:'navy',chat:'blue',quiz:'paper',compare:'navy',myth:'lime',story:'navy',checklist:p.theme,warm:'navy'}[p.format];
  if (s.kind==='chat') return 'paper';
  if (s.kind==='quiz') return 'paper';
  if (s.kind==='compare') return 'paper';
  if (s.kind==='checklist') return 'paper';
  if (s.kind==='calculation') return 'navy';
  if (s.kind==='payoff') return p.format==='warm'?'paper':p.number%2?'blue':'lime';
  if (s.kind==='action') return p.number%2?'paper':'navy';
  if (s.kind==='close') return p.format==='warm'?'paper':'blue';
  return 'navy';
}

let sections=[];
for(const p of posts) for(const [i,s] of p.slides.entries()) {
  const photo=s.kind==='cover'&&(p.format==='story'||p.format==='warm');
  const photoImage=photo?`<img class="cover-photo" src="assets/${e(p.photo)}" alt=""><div class="photo-shade"></div>`:'';
  sections.push(`<section id="p${p.number}-${i+1}" class="slide ${themeFor(p,s)} ${s.kind} ${p.format} ${photo?'photo-cover':''}">${photoImage}<header class="masthead"><img class="brand" src="assets/loka-white.svg" alt="Loka"><span class="pagination">${String(i+1).padStart(2,'0')} / ${String(p.slides.length).padStart(2,'0')}</span></header><main class="stage">${content(p,s,i)}</main><footer><span>@lokakasir.id</span><span class="progress">${p.slides.map((_,j)=>`<i class="${j<=i?'done':''}"></i>`).join('')}</span></footer></section>`);
}
fs.writeFileSync(path.join(root,'carousel.html'),`<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Loka Kasir · revisi carousel</title><style>${css}</style></head><body>${sections.join('\n')}</body></html>`);

(async()=>{
  const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
  if(process.argv.includes('--gallery-qa')) {
    const page=await browser.newPage({viewport:{width:1440,height:1080},deviceScaleFactor:1});
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(pathToFileURL(path.join(root,'index.html')).href);
    await page.evaluate(()=>document.fonts.ready);
    if(await page.locator('article:visible').count()!==86)throw new Error('Gallery did not show 86 posts');
    await page.selectOption('#format','Checklist toko');
    if(await page.locator('article:visible').count()!==18)throw new Error('Format filter failed');
    await page.selectOption('#format','');
    await page.fill('#search','diskon 20%');
    if(await page.locator('article:visible').count()!==1)throw new Error('Search failed');
    await page.locator('article:visible details').first().locator('summary').click();
    if(!await page.locator('article:visible details[open] pre').first().isVisible())throw new Error('Caption did not open');
    await page.fill('#search','materi-yang-tidak-ada');
    if(await page.locator('article:visible').count()!==0||!await page.locator('.empty').isVisible())throw new Error('Empty state failed');
    await page.fill('#search','');
    await page.screenshot({path:path.join(root,'gallery-desktop.jpg'),type:'jpeg',quality:85});
    await page.setViewportSize({width:390,height:900});
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);
    if(overflow||errors.length)throw new Error(JSON.stringify({overflow,errors}));
    await page.screenshot({path:path.join(root,'gallery-mobile.jpg'),type:'jpeg',quality:85});
    const result={posts:86,format_filter:'passed',search:'passed',empty_state:'passed',caption_disclosure:'passed',mobile_horizontal_overflow:false,page_errors:errors};
    fs.writeFileSync(path.join(root,'gallery-validation.json'),JSON.stringify(result,null,2));
    console.log(JSON.stringify(result));
    await browser.close();
    return;
  }
  const page=await browser.newPage({viewport:{width:1080,height:1350},deviceScaleFactor:1});
  await page.goto(pathToFileURL(path.join(root,'carousel.html')).href);
  await page.evaluate(()=>document.fonts.ready);
  await page.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
  const fit=await page.evaluate(()=>{
    const adjustments=[];
    const round=x=>Math.round(x*10)/10;
    // Fit only within deliberate text boxes; never hide overflowing copy.
    for(const el of document.querySelectorAll('[data-fit]')) {
      const before=parseFloat(getComputedStyle(el).fontSize);
      let size=before;
      const min=Math.max(25,before*.76);
      while((el.scrollHeight>el.clientHeight+2||el.scrollWidth>el.clientWidth+2)&&size>min){size--;el.style.fontSize=size+'px';}
      if(size!==before) adjustments.push({slide:el.closest('.slide').id,text:el.textContent,from:before,to:size});
    }
    const overflow=[...document.querySelectorAll('[data-fit]')].filter(el=>el.scrollHeight>el.clientHeight+3||el.scrollWidth>el.clientWidth+3).map(el=>({slide:el.closest('.slide').id,text:el.textContent,height:el.clientHeight,scroll:el.scrollHeight,width:el.clientWidth,scrollWidth:el.scrollWidth,font:getComputedStyle(el).fontSize}));
    const collisions=[];
    for(const slide of document.querySelectorAll('.slide')) {
      const stage=slide.querySelector('.stage');
      const footer=slide.querySelector('footer').getBoundingClientRect();
      if(stage.scrollHeight>stage.clientHeight+3)collisions.push({slide:slide.id,reason:'stage overflow',excess:stage.scrollHeight-stage.clientHeight});
      const kids=[...stage.children];
      for(let i=0;i<kids.length;i++) {
        const box=kids[i].getBoundingClientRect();
        if(box.bottom>footer.top-8)collisions.push({slide:slide.id,reason:'footer collision',text:kids[i].textContent});
        if(i>0&&box.top<kids[i-1].getBoundingClientRect().bottom-3)collisions.push({slide:slide.id,reason:'overlapping blocks',text:kids[i].textContent});
      }
    }
    return {adjustments,overflow,collisions,images:[...document.images].every(i=>i.complete&&i.naturalWidth>0),slides:document.querySelectorAll('.slide').length};
  });
  fs.writeFileSync(path.join(root,'layout-validation.json'),JSON.stringify(fit,null,2));
  if(fit.overflow.length||fit.collisions.length||!fit.images) {
    await browser.close();
    throw new Error(JSON.stringify({overflow:fit.overflow,collisions:fit.collisions,images:fit.images}));
  }
  const sample=process.argv.includes('--sample');
  const chosen=sample?posts.filter(p=>[1,2,3,4,5,6,7,18,25,28,35,46,67,73,77,86].includes(p.number)):posts;
  for(const p of chosen) {
    for(let i=0;i<p.slides.length;i++) await page.locator(`#p${p.number}-${i+1}`).screenshot({path:path.join(root,p.files[i]),type:'jpeg',quality:92,animations:'disabled'});
    if(p.number%10===0)console.log(`Rendered ${p.number}/${posts.length}`);
  }
  const preview=await browser.newPage({viewport:{width:1440,height:1200},deviceScaleFactor:1});
  const uri=f=>`data:image/jpeg;base64,${fs.readFileSync(path.join(root,f)).toString('base64')}`;
  const selected=[2,4,6,7,5,3,1,18,25,28,35,67].map(n=>posts[n-1]);
  await preview.setContent(`<style>body{margin:0;background:#e6eaf0;padding:24px;display:grid;grid-template-columns:repeat(4,336px);gap:16px}figure{margin:0}img{width:336px;height:420px;border-radius:10px}figcaption{font:15px/1.5 sans-serif;padding:8px 2px;color:#1b304e}</style>`+selected.map(p=>`<figure><img src="${uri(p.files[0])}"><figcaption>${e(p.format_label)} · ${p.slides.length} slide</figcaption></figure>`).join(''));
  await preview.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
  await preview.screenshot({path:path.join(root,'preview.jpg'),fullPage:true});
  for(const number of [2,4,6,7,67]) {
    const p=posts[number-1];
    await preview.setContent(`<style>body{margin:0;background:#e6eaf0;padding:20px;display:flex;gap:12px}img{width:324px;height:405px;border-radius:8px}</style>`+p.files.map(f=>`<img src="${uri(f)}">`).join(''));
    await preview.setViewportSize({width:40+p.files.length*336-12,height:445});
    await preview.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
    await preview.screenshot({path:path.join(root,`carousel-${String(number).padStart(3,'0')}.jpg`),fullPage:true});
  }
  console.log(JSON.stringify({rendered_posts:chosen.length,slides:chosen.reduce((n,p)=>n+p.slides.length,0),adjusted:fit.adjustments.length,overflow:0,collisions:0}));
  await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});
