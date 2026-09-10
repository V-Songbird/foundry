const fs=require('node:fs'),path=require('node:path');
const sharp=require('sharp');
const crypto=require('node:crypto');
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const brands={foundry:['#be5d27','Small tools. Thoughtful work.','PLUGINS & PLAIN-TEXT TOOLS'],hush:['#2c75a5','Less chatter. A clear answer.','A FOUNDRY PLUGIN'],foreman:['#21553b','Your next task, with its context.','A FOUNDRY PLUGIN'],razor:['#bf4935','Build what you need. Nothing extra.','A FOUNDRY PLUGIN'],flint:['#c18423','Good habits. Plain text.','FROM FOUNDRY']};
const out=__dirname;
const escape=s=>s.replaceAll('&','&amp;');
const manifest=[];
(async()=>{
for(const [name,[accent,promise,category]]of Object.entries(brands)){
 fs.mkdirSync(path.join(out,name),{recursive:true});
 for(const theme of ['light','dark']){
  const ink=theme==='dark'?'#eee9de':'#252820',paper=theme==='dark'?'#191c1b':'#ffffff';
  let icon=fs.readFileSync(path.join(out,'source',`${name}-${theme}.svg`),'utf8').replaceAll('var(--accent)',accent).replaceAll('var(--paper)',paper);
  const body=icon.slice(icon.indexOf('<g'),icon.lastIndexOf('</svg>'));
  const mark=(x,y,size)=>`<g transform="translate(${x} ${y}) scale(${size/128})">${body}</g>`;
  const svg=(w,h,content)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><g font-family="Segoe UI,Arial,sans-serif" fill="${ink}">${content}</g></svg>`;
  const frame=(w,h)=>`<rect width="${w}" height="${h}" fill="${paper}"/>`;
  const social=svg(1280,640,frame(1280,640)+`<text x="86" y="86" font-size="17" letter-spacing="3">${escape(category)}</text>`+mark(76,140,240)+`<text x="348" y="306" font-size="112" font-weight="700" letter-spacing="-4">${name}</text><text x="91" y="426" font-size="35">${escape(promise)}</text><path d="M89 489Q394 484 652 488T1188 489" fill="none" stroke="${accent}" stroke-width="5" stroke-linecap="round"/><text x="90" y="559" font-size="20">${name==='foundry'?'Tools for Claude Code and Codex':name==='flint'?'Writing and coding instructions you can bring to a session':'Part of Foundry'}</text>`);
  const banner=svg(2172,724,frame(2172,724)+(['hush','foreman','razor'].includes(name)
   ? mark(926,64,320)+`<text x="1086" y="500" text-anchor="middle" font-size="164" font-weight="700" letter-spacing="-5">${name}</text><text x="1086" y="602" text-anchor="middle" font-size="48">${escape(promise)}</text>`
   : mark(160,100,480)+`<text x="760" y="412" font-size="200" font-weight="700" letter-spacing="-5">${name}</text><text x="774" y="518" font-size="48">${escape(promise)}</text>`));
  const logo=svg(1400,420,mark(30,40,330)+`<text x="430" y="279" font-size="170" font-weight="700" letter-spacing="-4">${name}</text>`);
  for(const [type,source,w,h]of [['social',social,1280,640],['banner',banner,2172,724],['logo',logo,1400,420],['icon',icon,1024,1024]]){
   const prefix=path.join(out,name,`${type}-${theme}`);fs.writeFileSync(prefix+'.svg',source);
   await sharp(Buffer.from(source)).resize(w,h).png().toFile(prefix+'.png');
   const meta=await sharp(prefix+'.png').metadata();if(meta.width!==w||meta.height!==h)throw Error('Wrong size');
   manifest.push({brand:name,type,theme,file:`${name}/${type}-${theme}.png`,width:w,height:h,alpha:meta.hasAlpha,pngSha256:hash(prefix+'.png'),svgSha256:hash(prefix+'.svg')});
  }
 }
}
fs.writeFileSync(path.join(out,'build-environment.json'),JSON.stringify({node:process.version,sharp:sharp.versions,fonts:'Segoe UI required; Arial/sans-serif fallback is not pixel-identical'},null,2)+'\n');
for(const name of Object.keys(brands))for(const type of ['icon','logo']){const alpha=async theme=>sharp(path.join(out,name,type+'-'+theme+'.png')).ensureAlpha().extractChannel(3).raw().toBuffer();if(!(await alpha('light')).equals(await alpha('dark')))throw Error('Theme alpha mismatch: '+name+'/'+type);}
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('40 PNGs and editable SVG sources exported; dimensions verified.');
})();
