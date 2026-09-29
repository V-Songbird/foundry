const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=__dirname;
const brands=['foundry','hush','foreman','razor','flint'];
const extra={hush:['mascot','hero','demo','hero-opus5','demo-opus5'],foreman:['mascot','hero','demo','paper-trail'],razor:['mascot','hero','demo']};
const media=/@media\s*\(prefers-color-scheme:\s*dark\)\s*\{((?:[^{}]|\{[^{}]*\})*)\}/g;
const text=s=>[...s.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/g)].map(m=>m[1]);
for(const [brand,files]of Object.entries(extra))for(const name of files){
 // Scenes and evidence graphics come straight from their own generators' output;
 // only the fixed-theme previews the gallery shows are written here.
 const source=name==='mascot'?path.join(root,'..','mascot',brand+'.svg'):path.join(root,'..','graphics',brand+'-'+name+'.svg');
 const original=fs.readFileSync(source,'utf8');
 for(const theme of ['light','dark']){
  const svg=original.replace(media,theme==='dark'?'$1':'');
  assert.deepEqual(text(svg),text(original));
  fs.writeFileSync(path.join(root,brand,name+'-'+theme+'.svg'),svg);
 }
}
// Host cards stay hand-drawn sources; the gallery only writes fixed-theme previews of them.
const hosts=['codex','claude','antigravity'];
fs.mkdirSync(path.join(root,'hosts'),{recursive:true});
for(const host of hosts){
 const original=fs.readFileSync(path.join(root,'source','edition-'+host+'.svg'),'utf8');
 for(const theme of ['light','dark']){
  const svg=original.replace(media,theme==='dark'?'$1':'');
  assert.deepEqual(text(svg),text(original));
  fs.writeFileSync(path.join(root,'hosts','edition-'+host+'-'+theme+'.svg'),svg);
 }
}
const labels={icon:'Icon',social:'Social banner · 1280 × 640',banner:'README banner · 2172 × 724',logo:'Transparent wordmark · 1400 × 420',mascot:'Ember animation',hero:'Overview graphic',demo:'Recorded Claude demo','hero-opus5':'Overview graphic, Opus 5, earlier voice','demo-opus5':'Recorded Claude demo, Opus 5, earlier voice','paper-trail':'Task trail','edition-codex':'Codex host card','edition-claude':'Claude host card','edition-antigravity':'Antigravity host card'};
const panel=(brand,type,theme)=>{
 const png=['icon','social','banner','logo'].includes(type),file=`${brand}/${type}-${theme}.${png?'png':'svg'}`;
 assert.ok(fs.existsSync(path.join(root,file)),file);
 const card=type.startsWith('edition-');
 return `<div class="panel ${theme}"><div class="label">${theme}</div>${type==='icon'||card?`<div class="sizes">${(card?[128,80,32]:[128,64,32]).map(size=>`<img src="${file}" width="${size}" height="${size}" alt="${card?labels[type]:brand+' icon'} at ${size}px">`).join('')}</div>`:`<img class="art" src="${file}" alt="${brand}: ${labels[type]}, ${theme}">`}<div class="links"><a href="${file}" download>Download ${png?'PNG':'SVG'}</a>${png?` · <a href="${brand}/${type}-${theme}.svg" download>SVG source</a>`:''}</div></div>`;
};
let html=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Foundry · Complete graphics</title><style>*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:#f4f3ee;color:#252820;font:16px/1.55 system-ui}main{max-width:1320px;margin:auto;padding:38px 28px}h1{font-size:clamp(32px,5vw,56px);line-height:1.1;letter-spacing:-2px}h2{font-size:32px}h3{font-size:18px;font-weight:600}.intro{max-width:780px}nav{position:sticky;top:0;z-index:1;padding:12px 24px;background:#f4f3eef5;border-bottom:1px solid #ccc;display:flex;gap:22px;flex-wrap:wrap}a{color:inherit;text-underline-offset:4px}.themes{margin-left:auto;display:flex;gap:8px}button{font:inherit;color:inherit;border:1px solid #8c9387;background:transparent;border-radius:8px;padding:3px 12px;cursor:pointer}button[aria-pressed=true]{background:#252820;color:#fff}a:focus-visible,button:focus-visible{outline:3px solid #2c75a5;outline-offset:3px}section{scroll-margin-top:110px;border-top:1px solid #c8ccc2;margin-top:45px;padding-top:15px}.pair{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px;margin-bottom:32px}.panel{min-width:0;border:1.5px solid #252820;border-radius:15px 18px 14px 17px;padding:15px;background:#fff}.panel.dark{background:#191c1b;color:#eee9de}.label{text-transform:uppercase;font-size:11px;letter-spacing:2px;opacity:.75;margin-bottom:12px}.art{width:100%;height:auto;display:block}.sizes{display:flex;gap:28px;align-items:center;justify-content:center;min-height:180px}.links{font-size:12px;margin-top:12px}.only-light .panel.dark,.only-dark .panel.light{display:none}.only-light .pair,.only-dark .pair{grid-template-columns:minmax(0,1fr)}.note{font-size:14px;color:#626d5d}@media(max-width:800px){.pair{grid-template-columns:minmax(0,1fr)}.themes{margin-left:0}nav{position:static}.sizes{gap:15px}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}</style><nav>${brands.map(b=>`<a href="#${b}">${b}</a>`).join('')}<a href="#hosts">host cards</a><div class="themes">${['both','light','dark'].map(t=>`<button data-theme="${t}" aria-pressed="${t==='both'}">${t}</button>`).join('')}</div></nav><main><p class="note">FOUNDRY / COMPLETE GRAPHICS</p><h1>Every graphic.<br>One family.</h1><p class="intro">The approved icons, social banners, README banners and wordmarks for all five brands, together with the existing Ember scenes and evidence graphics. Identity assets use identical colored fills across themes. Evidence previews retain their recorded content and timing.</p><p><a href="../../docs/knowledge/brand.md">Rebuild instructions</a></p>`;
for(const brand of brands){html+=`<section id="${brand}"><h2>${brand}</h2>`;for(const type of ['icon','social','banner','logo',...(extra[brand]||[])])html+=`<h3>${labels[type]}</h3><div class="pair">${panel(brand,type,'light')}${panel(brand,type,'dark')}</div>`;html+='</section>';}
html+='<section id="hosts"><h2>host cards</h2>';for(const host of hosts)html+=`<h3>${labels['edition-'+host]}</h3><div class="pair">${panel('hosts','edition-'+host,'light')}${panel('hosts','edition-'+host,'dark')}</div>`;html+='</section>';
html+='<p class="note">Review package. No additional publication or repository-image replacement was performed.</p></main><script>document.querySelectorAll("[data-theme]").forEach(b=>b.onclick=()=>{document.body.className=b.dataset.theme==="both"?"":"only-"+b.dataset.theme;document.querySelectorAll("[data-theme]").forEach(x=>x.setAttribute("aria-pressed",String(x===b)))})</script></html>';
fs.writeFileSync(path.join(root,'index.html'),html);
console.log(`Complete gallery built: 5 brands, 40 identity PNGs, ${Object.values(extra).flat().length*2} light/dark supporting SVG previews, ${hosts.length*2} host-card previews. All referenced images exist.`);
