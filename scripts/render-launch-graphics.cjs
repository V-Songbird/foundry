// Render the final recorded demo frame for launch posts; source SVGs stay intact.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const sharp=require('sharp');
const root=path.resolve(__dirname,'..');
const text=s=>[...s.matchAll(/<text\b[^>]*>[\s\S]*?<\/text>/g)].map(m=>m[0]);
(async()=>{
 for(const brand of ['hush','razor']){
  const original=fs.readFileSync(path.join(root,`docs/shared/launch/assets/graphics-ink/${brand}-demo.svg`),'utf8');
  const frame=original.replace(/<g([^>]*)>\s*<animate\s+attributeName="opacity"([^>]+)\/>/g,(_,attrs,animation)=>{
   const values=animation.match(/values="([^"]+)"/)[1].split(';');
   return `<g${attrs.replace(/\s+opacity="[^"]*"/,'')} opacity="${values.at(-1)}">`;
  });
  assert.ok(!/<animate\b/.test(frame),'Unexpected animation: add an explicit frame rule');
  assert.deepEqual(text(frame),text(original));
  const size=original.match(/viewBox="0 0 (\d+) (\d+)"/).slice(1).map(Number);
  for(const theme of ['light','dark']){
   const svg=frame.replace(/@media\s*\(prefers-color-scheme:\s*dark\)\s*\{((?:[^{}]|\{[^{}]*\})*)\}/g,theme==='dark'?'$1':'');
   const file=path.join(root,`docs/${brand}/launch/assets/${brand}-${theme}.png`);
   await sharp(Buffer.from(svg)).resize(size[0]*2,size[1]*2).png().toFile(file);
   console.log(`${brand}/${theme}: final frame rendered; recorded text preserved`);
  }
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
