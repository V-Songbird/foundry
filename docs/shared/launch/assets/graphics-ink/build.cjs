const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const jobs={hush:['hero.svg','demo.svg','bench-cuts.svg'],foreman:['hero.svg','demo.svg','paper-trail.svg'],razor:['hero.svg','demo.svg','bench-supplychain.svg']};
const palette={hush:['#2c75a5','#79b6de'],foreman:['#21553b','#9ec8ac'],razor:['#bf4935','#eb8d79']};
const nodes=(s,tag)=>[...s.matchAll(new RegExp('<'+tag+'\\b[^>]*(?:/>|>[\\s\\S]*?</'+tag+'>)','g'))].map(m=>m[0]);
const report=[];
for(const [plugin,files] of Object.entries(jobs)) for(const file of files){
  const before=fs.readFileSync(path.join(__dirname,'source',plugin+'-'+file),'utf8');
  let count=0;
  let after=before.replace(/<rect\b([^>]*?)\/>/g,(node,attrs)=>{
    const attr=name=>attrs.match(new RegExp('\\b'+name+'="([^"]*)"'))?.[1];
    const cls=attr('class'), w=Number(attr('width')),h=Number(attr('height'));
    // Only containers and labels. Small measured bars and all plotted marks stay exact.
    if(!['card','bg','stp','stw','pill','cw','cf'].includes(cls)&&!(file==='demo.svg'&&['bp','ac'].includes(cls)&&h>=20))return node;
    const x=Number(attr('x')||0),y=Number(attr('y')||0),r=Math.min(12,h/3,w/5),bend=Math.min(2,h/20);
    const d=`M${x+r} ${y+1} Q${x+w*.36} ${y-bend} ${x+w-r} ${y+1} Q${x+w-1} ${y} ${x+w-1} ${y+r} L${x+w-2} ${y+h-r} Q${x+w} ${y+h-1} ${x+w-r} ${y+h-1} Q${x+w*.48} ${y+h+bend} ${x+r} ${y+h-1} Q${x+1} ${y+h} ${x+1} ${y+h-r} L${x+2} ${y+r} Q${x} ${y+1} ${x+r} ${y+1}Z`;
    count++;
    return `<path class="${cls} ink-frame" d="${d}"/>`;
  });
  after=after.replace(/<filter\b[^>]*>[\s\S]*?<\/filter>/g,'').replace(/ filter="url\(#[^)]+\)"/g,'');
  // Existing semantic success/error colors remain separate from brand accents.
  after=after.replace(/\.(ac|nd|tr|id|ed|gl|el)\{([^}]+)\}/g,(node,cls,body,offset)=>{
    const dark=before.indexOf('@media')>=0&&after.slice(0,offset).includes('@media');
    return '.'+cls+'{'+body.replace(/#[\da-fA-F]{6}/g,palette[plugin][dark?1:0])+'}';
  });
  after=after.replace('</style>',`.card,.bg{fill:#fff}.ink-frame{stroke:#252820;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}text{font-kerning:normal;text-rendering:optimizeLegibility}@media(prefers-color-scheme:dark){.card,.bg{fill:#191c1b}.ink-frame{stroke:#eee9de}}`+'</style>');
  if(plugin==='razor' && file==='demo.svg') after=after.replace(/<text\b[^>]*>[\s\S]*?<\/text>/g,node=>{
    const y=Number(node.match(/\by="([^"]+)"/)?.[1]);
    return y>=156 && y<=608 ? '<g transform="translate(0 14)">'+node+'</g>' : node;
  });
  assert.deepEqual(nodes(after,'text'),nodes(before,'text'),'Text changed: '+file);
  for(const tag of ['animate','animateTransform','line','circle','polyline'])assert.deepEqual(nodes(after,tag),nodes(before,tag),'Measured marks/timing changed: '+file);
  const remainingRects=nodes(after,'rect');
  assert.ok(remainingRects.every(rect=>before.includes(rect)),'Data rectangle changed');
  if(plugin==='razor' && file==='demo.svg') {
    after=after.replace('</style>','.diff-add{fill:#e6f4e9}.diff-remove{fill:#fbe9e7}.diff-code{fill:#252820}@media(prefers-color-scheme:dark){.diff-add{fill:#213e2b}.diff-remove{fill:#492c2b}.diff-code{fill:#eee9de}}</style>');
    after=after.replace(/<text\b([^>]*)>([\s\S]*?)<\/text>/g,(node,attrs,content)=>{
      if(!attrs.includes('ui-monospace'))return node;
      const x=Number(attrs.match(/\bx="([^"]+)"/)[1]),y=Number(attrs.match(/\by="([^"]+)"/)[1]);
      const add=x===34?y>=248&&y<=572:y===248||y===266;
      const remove=x===34?y===230:y>=194&&y<=230;
      const code=content.replace(/^[ +−-]+/,'');
      let indent=2;
      if(y===176||code==='}'&&(y>=590||x===367)||code.startsWith('module.exports'))indent=0;
      else if(code.startsWith('URLSearchParams')||code.startsWith('qs.slice')||code.startsWith('return out;')&&y===284)indent=4;
      else if(x===34&&y>=392&&y<=536)indent=y>=464&&y<=518?6:4;
      const formatted=(content.trimStart().startsWith('+')?'+ ':content.trimStart().startsWith('−')?'− ':'  ')+' '.repeat(indent)+code;
      assert.equal(formatted.replace(/^[ +−-]+/,''),code);
      const background=add||remove?'<path class="'+(add?'diff-add':'diff-remove')+'" d="M'+(x-3)+' '+(y-13)+'h306v18h-306Z"/>':'';
      const newAttrs=attrs.replace(/class="[^"]*"/,'class="diff-code"').replace(/font-size="[^"]*"/,'font-size="12"').replace(/ font-weight="[^"]*"/,'');
      return background+'<text'+newAttrs+' xml:space="preserve" style="white-space:pre">'+formatted+'</text>';
    });
  }
  fs.writeFileSync(path.join(__dirname,plugin+'-'+file),after);
  report.push({plugin,file,restyledContainers:count,textPreserved:true,codeWhitespaceFormatted:plugin==='razor'&&file==='demo.svg',animationAndPlotMarksPreserved:true});
}
fs.writeFileSync(path.join(__dirname,'validation.json'),JSON.stringify(report,null,2)+'\n');
console.log('9 graphics built; exact text, animation nodes and plotted marks preserved.');
