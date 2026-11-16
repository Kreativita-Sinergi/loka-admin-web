const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('/private/tmp/loka-landing-browser-qa/node_modules/playwright');
const root=__dirname;
const posts=JSON.parse(fs.readFileSync(path.join(root,'campaign.json')));
const sources=JSON.parse(fs.readFileSync(path.join(root,'sources.json')));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const header=n=>`<img class="brand" src="assets/loka-white.svg" alt="Loka"><div class="page">${n} / 3</div>`;
const foot=(text='Geser, ada yang bisa dicoba →')=>`<footer><span>@lokakasir.id</span><span>${esc(text)}</span></footer>`;
let sections=[];
for (const [i,p] of posts.entries()){
 const source=p.source?sources[p.source]:null;
 sections.push(`<section class="slide cover v${i%3}" id="s${i}-1"><img class="hero" src="assets/${p.visual}.png" alt=""><div class="cover-shade"></div>${header(1)}<div class="cover-copy"><div class="eyebrow">${esc(p.pillar)}</div><h1 data-fit>${p.title.map(esc).join('<br>')}</h1><p class="subheading" data-check>${esc(p.subheading)}</p></div>${foot()}</section>`);
 sections.push(`<section class="slide lesson v${i%3}" id="s${i}-2">${header(2)}<div class="eyebrow top-label">Yang bisa dipelajari</div><h2 data-fit>${esc(p.lesson_title)}</h2><div class="lesson-card"><div class="small-label">${p.lesson_body.startsWith('Simulasi:')?'CONTOH HITUNGAN':'CATATAN BUAT USAHA'}</div><p class="lesson-body" data-check>${esc(p.lesson_body)}</p><div class="card-rule"></div><p class="takeaway" data-check>${esc(p.subheading)}</p></div><div class="lesson-note" data-check>${source?`Konteks: ${esc(source.title)}<br>Riset 16 November 2026 · Tautan lengkap di caption.`:'Setiap usaha punya biaya dan pola yang berbeda.<br>Sesuaikan langkahnya dengan kondisi tokomu.'}</div>${foot('Lanjut: langkah kecil yang bisa dicoba →')}</section>`);
 sections.push(`<section class="slide action v${i%3}" id="s${i}-3">${header(3)}<div class="eyebrow top-label">Bisa mulai dari sini</div><h2 data-fit>Tiga langkah<br>buat usahamu.</h2><div class="steps">${p.steps.map((s,j)=>`<div class="step"><span class="num">0${j+1}</span><p data-check>${esc(s)}</p></div>`).join('')}</div><div class="bridge" data-check>${esc(p.bridge)}</div><div class="cta" data-check>${esc(p.cta)}</div>${foot('lokakasir.id')}</section>`);
}
const html=`<!doctype html><html lang="id"><meta charset="utf-8"><title>Loka Kasir — November & Desember 2026</title><style>
@font-face{font-family:Jakarta;src:url('assets/Jakarta-Medium.ttf');font-weight:500}
@font-face{font-family:Jakarta;src:url('assets/Jakarta-SemiBold.ttf');font-weight:600}
@font-face{font-family:Jakarta;src:url('assets/Jakarta-Bold.ttf');font-weight:700}
@font-face{font-family:Jakarta;src:url('assets/Jakarta-ExtraBold.ttf');font-weight:800}
*{box-sizing:border-box}body{margin:0;background:#e5edf8;color:#fff;font-family:Jakarta,sans-serif;font-weight:500}.slide{position:relative;width:1080px;height:1350px;overflow:hidden;margin:0 0 24px;background:radial-gradient(ellipse at 100% 80%,#5c9dff70,transparent 60%),linear-gradient(145deg,#1468ff,#0d5df3 40%,#0839a8 100%)}.v1{background:radial-gradient(ellipse at 5% 85%,#6eaaff65,transparent 60%),linear-gradient(145deg,#0f52cb,#1264f6 65%,#0839a8)}.v2{background:radial-gradient(ellipse at 100% 25%,#8bbcff45,transparent 65%),linear-gradient(145deg,#0b42ba,#0d5df3 60%,#09389a)}
h1,h2,p{margin:0}.brand{position:absolute;left:80px;top:73px;width:201px;height:64px;object-fit:contain;z-index:4}.page{position:absolute;right:80px;top:91px;font-size:23px;color:#deebff;z-index:4}.hero{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.cover-shade{position:absolute;inset:0;background:linear-gradient(180deg,#0d5df300 74%,#073688c9 100%)}.cover-copy{position:absolute;left:80px;right:75px;top:202px}.eyebrow{font-size:27px;line-height:1.4;letter-spacing:.2px;color:#e1ecff}.cover .eyebrow{display:inline-block;font-size:24px;line-height:1.2;padding:11px 17px;border:1px solid #c7ddff65;border-radius:999px;background:#0842aa38}.cover h1{font-size:88px;line-height:1.1;letter-spacing:-4px;font-weight:800;max-height:220px;margin-top:28px}.subheading{font-size:33px;line-height:1.42;letter-spacing:-.7px;max-width:870px;margin-top:22px;max-height:98px;color:#edf5ff}footer{position:absolute;left:80px;right:80px;bottom:51px;display:flex;justify-content:space-between;align-items:center;font-size:21px;line-height:1.5;color:#e4efff;z-index:4}.cover footer span:last-child{font-size:20px}.top-label{position:absolute;left:80px;top:202px}h2{position:absolute;left:80px;right:80px;top:258px;font-size:77px;line-height:1.12;letter-spacing:-3.4px;font-weight:800;max-height:196px}.lesson-card{position:absolute;left:80px;right:80px;top:486px;height:570px;background:#fff;color:#183055;border-radius:30px;padding:43px 45px;box-shadow:0 24px 50px #00278235}.small-label{font-size:20px;letter-spacing:2px;font-weight:700;color:#1962d4;margin-bottom:29px}.lesson-body{font-size:39px;line-height:1.5;letter-spacing:-.7px;height:310px}.card-rule{height:2px;background:#dfe9f8;margin:21px 0 22px}.takeaway{font-size:28px;line-height:1.45;font-weight:700;letter-spacing:-.3px;height:85px;color:#1850a5}.lesson-note{position:absolute;left:84px;right:84px;top:1100px;font-size:22px;line-height:1.55;max-height:108px;color:#dfecff}.steps{position:absolute;left:80px;right:80px;top:487px;display:grid;gap:17px}.step{height:116px;display:flex;align-items:center;gap:24px;padding:20px 26px;background:#fff;color:#163052;border-radius:22px;box-shadow:0 10px 25px #022d8b20}.num{display:flex;align-items:center;justify-content:center;flex-shrink:0;width:66px;height:66px;border-radius:18px;background:#e8f1ff;color:#1761db;font-size:28px;font-weight:800}.step p{font-size:32px;line-height:1.3;font-weight:700;letter-spacing:-.7px;max-height:85px;flex:1}.bridge{position:absolute;left:84px;right:84px;top:923px;font-size:31px;line-height:1.5;letter-spacing:-.5px;max-height:146px;color:#edf4ff}.cta{position:absolute;left:84px;right:84px;top:1113px;font-size:27px;line-height:1.45;letter-spacing:-.3px;font-weight:700;max-height:85px;color:#fff}
</style>${sections.join('\n')}</html>`;
fs.writeFileSync(path.join(root,'carousel.html'),html);
fs.mkdirSync(path.join(root,'media'),{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 const page=await browser.newPage({viewport:{width:1080,height:1350},deviceScaleFactor:1});
 await page.goto(pathToFileURL(path.join(root,'carousel.html')).href);
 await page.evaluate(()=>document.fonts.ready);
 await page.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
 const fit=await page.evaluate(()=>{
  const adjustments=[];
  for (const el of document.querySelectorAll('[data-fit],[data-check]')){
   const before=parseFloat(getComputedStyle(el).fontSize);
   const tolerance=el.hasAttribute('data-fit')?12:2;
   let size=before;
   while ((el.scrollHeight>el.clientHeight+tolerance||el.scrollWidth>el.clientWidth+2)&&size>19){size-=1;el.style.fontSize=size+'px';}
   if(size!==before)adjustments.push({slide:el.closest('.slide').id,from:before,to:size});
  }
  const overflow=[...document.querySelectorAll('[data-fit],[data-check]')].filter(el=>el.scrollHeight>el.clientHeight+(el.hasAttribute('data-fit')?12:2)||el.scrollWidth>el.clientWidth+2).map(el=>({id:el.closest('.slide').id,text:el.textContent}));
  const collisions=[...document.querySelectorAll('.cover')].filter(el=>el.querySelector('.subheading').getBoundingClientRect().bottom-el.getBoundingClientRect().top>588).map(el=>el.id);
  return {adjustments,overflow,collisions,images:[...document.images].every(i=>i.complete&&i.naturalWidth>0)};
 });
 if(fit.overflow.length||fit.collisions.length||!fit.images)throw new Error(JSON.stringify(fit));
 fs.writeFileSync(path.join(root,'layout-validation.json'),JSON.stringify(fit,null,2));
 const sample=process.argv.includes('--sample');
 const indexes=process.argv.includes('--preview')?[]:sample?[0,1,2,5,6,14,24,26,40,46,66,72,84,85]:posts.map((_,i)=>i);
 for(const i of indexes){
  for(let n=1;n<=3;n++)await page.locator(`#s${i}-${n}`).screenshot({path:path.join(root,posts[i].files[n-1]),type:'jpeg',quality:91,animations:'disabled'});
  if((i+1)%10===0)console.log(`Rendered ${i+1}/${posts.length}`);
 }
 const previewIndexes=[0,1,5,6,11,14,24,26,40,46,66,85];
 const preview=await browser.newPage({viewport:{width:1080,height:1090},deviceScaleFactor:1});
 await preview.setContent(`<style>body{margin:0;padding:18px;background:#dae5f5;display:grid;align-content:start;grid-template-columns:repeat(4,252px);gap:12px}img{width:252px;height:315px;border-radius:8px}figure{margin:0}figcaption{font:11px sans-serif;color:#294364;padding:5px 0 8px}</style>`+previewIndexes.map(i=>`<figure><img src="data:image/jpeg;base64,${fs.readFileSync(path.join(root,posts[i].files[0])).toString('base64')}"><figcaption>${esc(posts[i].scheduled_at.slice(0,16).replace('T',' '))} WIB</figcaption></figure>`).join(''));
 await preview.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
 await preview.screenshot({path:path.join(root,'preview.jpg'),fullPage:true});
 await preview.setContent(`<style>body{margin:0;padding:18px;background:#dae5f5;display:grid;grid-template-columns:repeat(3,336px);gap:12px}img{width:336px;height:420px;border-radius:8px}</style>`+[0,26,66].flatMap(i=>posts[i].files.map(f=>`<img src="data:image/jpeg;base64,${fs.readFileSync(path.join(root,f)).toString('base64')}">`)).join(''));
 await preview.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
 await preview.screenshot({path:path.join(root,'carousel-preview.jpg'),fullPage:true});
 console.log(JSON.stringify({posts:posts.length,rendered:indexes.length,slides:indexes.length*3,adjusted:fit.adjustments.length,overflow:fit.overflow.length}));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
