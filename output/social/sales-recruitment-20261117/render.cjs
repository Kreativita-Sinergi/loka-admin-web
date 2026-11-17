const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.LOKA_PLAYWRIGHT_PATH||'/private/tmp/loka-social-v2-tools/node_modules/playwright');
const root=__dirname;
const post=JSON.parse(fs.readFileSync(path.join(root,'post.json')));
const e=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const heading=(lines,tag='h2')=>`<${tag} class="heading zone" data-fit>${lines.map(e).join('<br>')}</${tag}>`;
const header=n=>`<header><img class="brand" src="assets/loka-white.svg" alt="Loka Kasir"><span class="page">0${n} / 04</span></header>`;
const footer=(n,text)=>`<footer><span>${e(text)}</span><div class="progress">${[1,2,3,4].map(i=>`<i class="${i<=n?'on':''}"></i>`).join('')}</div></footer>`;
const eyebrow=s=>`<div class="eyebrow zone">${e(s)}</div>`;
const body=(s,cls='body')=>`<p class="${cls} zone" data-fit>${e(s)}</p>`;
const slides=post.slides;
const first=slides[0],role=slides[1],kit=slides[2],cta=slides[3];
const sections=[
`<section class="slide cover paper" id="slide-1">${header(1)}<div class="quota zone"><span>${e(first.quota_label)}</span><strong>${first.quota}</strong><span>${e(first.quota_unit)}</span></div>${eyebrow(first.eyebrow)}${heading(first.title,'h1')}${body(first.body)}<div class="cover-art"><img src="${e(first.art)}" alt=""></div>${footer(1,'@lokakasir.id · Geser untuk lihat programnya →')}</section>`,
`<section class="slide role paper" id="slide-2">${header(2)}${eyebrow(role.eyebrow)}${heading(role.title)}${body(role.body)}<div class="side-art"><img src="${e(role.art)}" alt=""></div><div class="role-steps">${role.steps.map((s,i)=>`<div class="role-step"><span class="step-num">0${i+1}</span><div><h3 class="zone" data-fit>${e(s.title)}</h3>${body(s.body,'step-copy')}</div></div>`).join('')}</div>${footer(2,'Program mitra berbasis komisi')}</section>`,
`<section class="slide kit blue" id="slide-3">${header(3)}${eyebrow(kit.eyebrow)}${heading(kit.title)}${body(kit.body)}<div class="kit-art"><img src="${e(kit.art)}" alt=""></div><div class="features">${kit.features.map(s=>`<div><span>✓</span><strong class="zone" data-fit>${e(s)}</strong></div>`).join('')}</div>${footer(3,'Bahan jualan tersedia di portal sales')}</section>`,
`<section class="slide cta navy" id="slide-4"><img class="cta-backdrop" src="${e(cta.art)}" alt="">${header(4)}${eyebrow(cta.eyebrow)}${heading(cta.title)}${body(cta.body)}<div class="url-card zone"><span class="url-label">DAFTAR MITRA SALES</span><div class="domain" data-fit>${e(cta.display_domain)}</div><div class="url-path" data-fit>${e(cta.display_path)}</div><span class="arrow">↗</span></div><div class="verification zone">${cta.verification_lines.map((line,i)=>i?`<strong>${e(line)}</strong>`:e(line)).join('<br>')}</div><div class="commission zone">${e(cta.footer)}</div>${footer(4,'lokakasir.id')}</section>`
];
const css=`
@font-face{font-family:Jakarta;src:url('assets/Jakarta-Medium.ttf');font-weight:500}@font-face{font-family:Jakarta;src:url('assets/Jakarta-SemiBold.ttf');font-weight:600}@font-face{font-family:Jakarta;src:url('assets/Jakarta-Bold.ttf');font-weight:700}@font-face{font-family:Jakarta;src:url('assets/Jakarta-ExtraBold.ttf');font-weight:800}
*{box-sizing:border-box}body{margin:0;background:#dce5f1;font-family:Jakarta,sans-serif;font-weight:500}h1,h2,h3,p{margin:0}[data-fit]{padding-bottom:.1em}.slide{width:1080px;height:1350px;position:relative;overflow:hidden;margin-bottom:24px;color:var(--ink);background:var(--bg);--bg:#0c203e;--ink:#fff;--muted:#d9e4f5;--accent:#ddfa75}.paper{--bg:#f5f1e8;--ink:#102545;--muted:#465b76;--accent:#125cff}.blue{--bg:#125cff;--ink:#fff;--muted:#e3edff;--accent:#ddfa75}.navy{--bg:#0c203e;--ink:#fff;--muted:#d9e4f5;--accent:#ddfa75}
header{position:absolute;left:72px;right:72px;top:66px;height:58px;z-index:4;display:flex;align-items:center;justify-content:space-between}.brand{width:194px;height:58px;object-fit:contain;object-position:left}.paper .brand{filter:brightness(0) saturate(100%) invert(12%) sepia(21%) saturate(1788%) hue-rotate(174deg) brightness(95%) contrast(97%)}.page{font-size:23px;line-height:1.5;letter-spacing:1px;color:var(--muted)}.eyebrow{position:absolute;left:72px;right:72px;top:190px;color:var(--accent);font-size:22px;line-height:1.4;letter-spacing:1.4px;font-weight:800;text-transform:uppercase;z-index:3}.heading{position:absolute;left:72px;right:72px;top:251px;font-size:82px;line-height:1.1;letter-spacing:-3px;font-weight:800;max-height:210px;z-index:3;text-wrap:pretty}.body{position:absolute;left:72px;right:72px;top:463px;font-size:32px;line-height:1.5;max-height:110px;color:var(--muted);z-index:3;letter-spacing:-.35px}footer{position:absolute;left:72px;right:72px;bottom:46px;height:34px;display:flex;align-items:center;justify-content:space-between;gap:20px;font-size:21px;line-height:1.5;color:var(--muted);z-index:4}.progress{display:flex;gap:9px;flex-shrink:0}.progress i{width:36px;height:4px;background:currentColor;opacity:.25;border-radius:4px}.progress i.on{opacity:1}
.cover .page{margin-right:205px}.quota{position:absolute;right:72px;top:61px;width:165px;height:162px;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:15px 10px;background:#125cff;color:white;border-radius:24px;gap:0;z-index:5}.quota span{font-size:15px;line-height:1.35;letter-spacing:.6px;font-weight:800}.quota strong{font-size:75px;line-height:1.1;letter-spacing:-3px}.cover .eyebrow{right:295px;top:190px;font-size:20px}.cover .heading{top:253px;font-size:105px;line-height:1.06;letter-spacing:-4.5px;max-height:242px}.cover .body{top:511px;font-size:31px;max-height:95px;max-width:830px}.cover-art{position:absolute;left:0;right:0;top:620px;bottom:0;overflow:hidden}.cover-art img{width:100%;height:100%;object-fit:cover;object-position:50% 62%}.cover footer{color:#fff;text-shadow:0 1px 6px #071a3e;bottom:42px}.cover footer:before{content:'';position:absolute;z-index:-1;left:-72px;right:-72px;bottom:-42px;height:135px;background:linear-gradient(transparent,#071a3eaa)}
.role .body{top:467px;max-width:900px;max-height:110px}.side-art{position:absolute;left:0;top:630px;width:445px;height:620px;overflow:hidden;border-radius:0 24px 24px 0;background:#e3dcd0}.side-art img{position:absolute;left:-142px;top:-160px;width:700px;height:875px;object-fit:cover}.role-steps{position:absolute;left:490px;right:72px;top:633px;display:flex;flex-direction:column;gap:29px}.role-step{display:grid;grid-template-columns:49px 1fr;gap:21px;border-top:2px solid #ced7e2;padding-top:20px;min-height:172px}.step-num{font-size:25px;color:#125cff;font-weight:800;line-height:1.5;padding-top:4px}.role-step h3{font-size:34px;line-height:1.28;letter-spacing:-1px;font-weight:800;max-height:88px}.step-copy{position:static;font-size:28px;line-height:1.45;color:#465b76;max-height:90px;letter-spacing:-.4px;margin-top:13px}.role footer{font-size:20px}
.kit .heading{font-size:80px;max-height:205px}.kit .body{top:461px;font-size:31px;max-height:95px}.kit-art{position:absolute;left:72px;right:72px;top:586px;height:554px;border-radius:24px;overflow:hidden;background:#e5dece}.kit-art img{width:100%;height:100%;object-fit:cover;object-position:50% 84%}.features{position:absolute;left:72px;right:72px;top:1180px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px}.features>div{display:flex;gap:12px;border-top:2px solid #ffffff70;padding-top:15px;align-items:flex-start}.features span{font-size:30px;line-height:1.3;color:#ddfa75}.features strong{font-size:28px;line-height:1.35;letter-spacing:-.6px;max-height:78px}.kit footer{font-size:20px}
.cta-backdrop{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.11;mask-image:linear-gradient(0deg,#000,transparent 75%)}.cta .heading{font-size:86px;max-height:220px}.cta .body{top:480px;font-size:34px;max-height:110px;max-width:870px}.url-card{position:absolute;left:72px;right:72px;top:643px;height:262px;background:#f5f1e8;color:#102545;border-radius:25px;padding:31px 38px;z-index:3;box-shadow:0 22px 60px #00000020}.url-label{display:block;color:#125cff;font-size:21px;line-height:1.4;font-weight:800;letter-spacing:1.5px;margin-bottom:15px}.domain{font-size:43px;line-height:1.3;font-weight:700;letter-spacing:-1px;max-height:65px;max-width:740px}.url-path{font-size:63px;line-height:1.2;font-weight:800;letter-spacing:-2px;max-height:88px;max-width:740px}.arrow{position:absolute;right:38px;top:99px;color:#125cff;font-size:83px;line-height:1}.verification{position:absolute;left:76px;right:76px;top:983px;font-size:35px;line-height:1.5;color:#e0eafb;z-index:3}.verification strong{font-weight:800;color:white}.commission{position:absolute;left:76px;right:76px;top:1143px;color:#ddfa75;font-size:27px;line-height:1.4;font-weight:700;z-index:3}
`;
fs.writeFileSync(path.join(root,'carousel.html'),`<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Mitra Sales Loka Kasir — maksimal 100 mitra</title><style>${css}</style></head><body>${sections.join('\n')}</body></html>`);

(async()=>{
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 const page=await browser.newPage({viewport:{width:1080,height:1350},deviceScaleFactor:1});
 await page.goto(pathToFileURL(path.join(root,'carousel.html')).href);
 await page.evaluate(()=>document.fonts.ready);
 await page.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
 const validation=await page.evaluate(()=>{
  const adjustments=[];
  for(const el of document.querySelectorAll('[data-fit]')){
   const initial=parseFloat(getComputedStyle(el).fontSize);let size=initial;
   while((el.scrollHeight>el.clientHeight+2||el.scrollWidth>el.clientWidth+2)&&size>Math.max(25,initial*.8)){el.style.fontSize=(--size)+'px';}
   if(size!==initial)adjustments.push({slide:el.closest('.slide').id,text:el.textContent,from:initial,to:size});
  }
  const overflow=[...document.querySelectorAll('[data-fit]')].filter(el=>el.scrollHeight>el.clientHeight+3||el.scrollWidth>el.clientWidth+3).map(el=>({slide:el.closest('.slide').id,text:el.textContent}));
  const collisions=[];
  for(const slide of document.querySelectorAll('.slide')){
   const footer=slide.querySelector('footer').getBoundingClientRect();
   const zones=[...slide.querySelectorAll('.zone')].filter(el=>!el.parentElement.closest('.zone'));
   for(let i=0;i<zones.length;i++){
    const a=zones[i].getBoundingClientRect();
    if(a.bottom>footer.top-6)collisions.push({slide:slide.id,type:'footer',text:zones[i].textContent});
    for(let j=i+1;j<zones.length;j++){
     if(zones[i].contains(zones[j])||zones[j].contains(zones[i]))continue;
     const b=zones[j].getBoundingClientRect();
     if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>5&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>5)collisions.push({slide:slide.id,type:'text overlap',texts:[zones[i].textContent,zones[j].textContent]});
    }
   }
  }
  return {slides:document.querySelectorAll('.slide').length,images:[...document.images].every(i=>i.complete&&i.naturalWidth>0),adjustments,overflow,collisions};
 });
 fs.writeFileSync(path.join(root,'layout-validation.json'),JSON.stringify(validation,null,2)+'\n');
 if(validation.overflow.length||validation.collisions.length||!validation.images)throw new Error(JSON.stringify(validation));
 for(let n=1;n<=4;n++)await page.locator('#slide-'+n).screenshot({path:path.join(root,post.files[n-1]),type:'jpeg',quality:93,animations:'disabled'});
 const preview=await browser.newPage({viewport:{width:1420,height:100},deviceScaleFactor:1});
 await preview.setContent('<style>body{margin:0;padding:24px;display:grid;grid-template-columns:repeat(4,331px);gap:16px;background:#e7edf5}figure{margin:0}img{display:block;width:331px;height:414px;border-radius:10px}figcaption{font:13px/1.5 sans-serif;color:#16304c;padding:9px 0}</style>'+post.files.map((f,i)=>`<figure><img src="data:image/jpeg;base64,${fs.readFileSync(path.join(root,f)).toString('base64')}"><figcaption>0${i+1} / 04</figcaption></figure>`).join(''));
 await preview.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
 await preview.screenshot({path:path.join(root,'preview.jpg'),type:'jpeg',quality:92,fullPage:true});
 await browser.close();
 console.log(JSON.stringify({rendered:4,...validation}));
})().catch(error=>{console.error(error);process.exit(1)});
