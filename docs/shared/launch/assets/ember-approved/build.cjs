const fs = require('node:fs');
const path = require('node:path');
const base = fs.readFileSync(path.join(__dirname,'source/hush-approved.svg'),'utf8');
const palette = {hush:['#2c75a5','#79b6de','#edf4f7','#253740'],foreman:['#21553b','#9ec8ac','#edf3ed','#283b30'],razor:['#bf4935','#eb8d79','#faf0ec','#412c29']};
for (const plugin of Object.keys(palette)) {
  const source = fs.readFileSync(path.join(__dirname,`source/${plugin}-original.svg`),'utf8');
  let svg = base.replace(/HUSH \/ EMBER ESENCIAL · REVISIÓN 05/,plugin.toUpperCase()+' / EMBER');
  palette.hush.forEach((color,i)=>svg=svg.replaceAll(color,palette[plugin][i]));
  if (plugin !== 'hush') {
    const closing = [...source.matchAll(/<text\b[^>]*>([^<]+)<\/text>/g)].at(-1)[1];
    svg = svg.replace(/<title id="title">[\s\S]*?<\/desc>/,`<title id="title">Ember — ${plugin}</title><desc id="desc">${plugin==='foreman'?'Scattered papers gather into a plan while Ember settles.':'Unnecessary extras are removed, leaving what was requested.'} Original closing line: ${closing} Illustrative animation, not benchmark timing.</desc>`);
    const start=svg.indexOf('<g class="noise '), end=svg.indexOf('<path d="M30 338',start);
    let scene='',extraCSS='';
    if(plugin==='foreman') {
      const labels=['Task #1','Side Request','Issue 104'];
      scene=labels.map((label,i)=>`<g style="animation:merge${i} 14s ease-in-out infinite">${i!==1?'<path d="M-11 18L-14 -8 28 -12 43 -2 143 -5 148 73 -9 77Z" class="wash edge"/><path d="M3 -7L122 -11 132 55 5 61Z" class="paper edge"/>':''}<path d="${i===1?'M0 0Q61 -3 131 1L133 37 122 40 131 45 120 49 130 54 120 60 105 56 97 64 84 59 72 65 59 60 45 66 31 61 16 66 -1 62Z':'M0 0Q61 -3 131 1L134 61Q66 65 -1 62Z'}" class="warm edge"/>${i!==1?'<path d="M-12 54Q55 48 149 52L146 77 -9 80Z" class="wash edge"/>':'<path d="M113 71l11 -4 8 7 -13 9Z" class="warm edge"/>'}<text x="12" y="25" class="ink" font-size="17">${label}</text><path d="M12 40q48 -2 106 1M12 51h72" class="line"/></g>`).join('')+'<g class="calm"><path d="M51 161Q159 158 267 163L269 318Q161 322 51 318Z" class="wash edge"/><text x="69" y="190" class="ink" font-size="19">the plan</text>'+labels.map((label,i)=>`${i===2?'<path d="M69 274l16 1 -1 15 -16 -1Z" fill="none" stroke="var(--blue)" stroke-width="2"/>':`<path d="M69 ${220+i*33}l6 6 11 -13" fill="none" stroke="var(--blue)" stroke-width="3"/>`}<text x="98" y="${226+i*33}" class="ink" font-size="17">${label}</text>`).join('')+'</g>';
      extraCSS=labels.map((_,i)=>`@keyframes merge${i}{0%,28%{opacity:1;transform:translate(${48+i*29}px,${69+i*73}px) rotate(${i%2?13:-10}deg)}${43+i*3}%{opacity:1;transform:translate(66px,${203+i*33}px) rotate(0) scale(.85,.35)}${48+i*3}%,100%{opacity:0;transform:translate(66px,${203+i*33}px) scale(.85,.35)}}`).join('');
    } else {
      scene='<g class="noise"><path d="M51 80Q142 74 268 81L269 169Q158 175 52 170Z" class="warm edge"/><text x="70" y="107" class="ink" font-size="17">helper.js?</text><text x="70" y="134" class="ink" font-size="17">a new package?</text><circle cx="292" cy="160" r="6" class="warm edge"/><circle cx="309" cy="177" r="3" class="warm edge"/></g><g class="calm"><path d="M32 159Q149 156 284 162L284 317Q157 321 33 317Z" class="wash edge"/><text x="49" y="187" class="ink" font-size="18" font-weight="600">Before adding…</text><text x="49" y="222" class="ink" font-size="17">1. Needed?</text><text x="49" y="254" class="ink" font-size="17">2. Already here?</text><text x="49" y="286" class="ink" font-size="17">3. Standard library?</text></g>';
    }
    svg=svg.slice(0,start)+scene+'\n'+svg.slice(end);
    svg=svg.replace('</style>',extraCSS+'</style>');
    svg=svg.replace(/<g class="shh">[\s\S]*?<\/g>/,'');
    // The illustration uses the same expressive gesture; the Hush-only shh is omitted.
    svg=svg.replace('animation:typing 14s linear -.07s infinite,hand-off 14s ease-in-out infinite','animation:typing 14s linear -.07s infinite');
    if(plugin==='foreman') {
      svg=svg.replace('M-34 -41l16 7m36 0 16 -7M-10 2Q0 -7 11 2','M-34 -39l15 -6M19 -45l15 6M-31 -28l10 5 -10 5M31 -28l-10 5 10 5M-11 4Q0 -9 11 4');
      svg=svg.replace(/<g class="typing-left">[\s\S]*?<\/g>/,'<g class="point"><path d="M-58 15Q-80 24 -108 2Q-120 -4 -121 4Q-123 12 -109 18L-61 41" class="body edge"/></g>');
      svg=svg.replace(/<g class="typing-right">[\s\S]*?<\/g>/,'<g class="point"><path d="M57 15Q50 43 5 38L-24 27Q-35 20 -35 28Q-36 35 -24 39L8 54Q56 63 65 28" class="body edge"/></g>');
      svg=svg.replace('<g class="point">','<g class="resting"><path d="M-59 16Q-71 34 -48 47Q-36 49 -35 39L-43 25M59 16Q71 34 48 47Q36 49 35 39L43 25" class="body edge"/></g><g class="point">');
      svg=svg.replace('</style>','.eyelids{animation:calm 14s ease-in-out infinite}.resting{animation:resting 14s ease-in-out infinite}@keyframes resting{0%,64%,100%{opacity:1}72%,95%{opacity:0}}.point{transform-origin:0 20px;animation:point 14s ease-in-out infinite}@keyframes point{0%,64%,100%{opacity:0;transform:rotate(-9deg)}72%,95%{opacity:1;transform:rotate(0)}}</style>');
    } else {
      svg=svg.replace(/<g class="stress"><g class="tense">[\s\S]*?<\/g><\/g>/,'<g class="noise"><path d="M-33 -38q8 -4 16 0M18 -42l15 1M-5 0h10" class="mark"/><path d="M56 19Q27 18 18 2Q12 -5 9 1Q7 8 16 12L42 36" class="body edge"/></g>');
      svg=svg.replace('class="typing-left"','class="typing-left working"').replace('class="typing-right"','class="typing-right working"');
      svg=svg.replace('</style>','.working{opacity:0;animation:work 14s ease-in-out infinite!important}@keyframes work{0%,51%,100%{opacity:0}56%,95%{opacity:1}}.flame-move{animation:none;transform:scale(.9)}.typing-left path{animation:slowTap .6s ease-in-out infinite alternate}.typing-right path{animation:slowTap .6s ease-in-out -.6s infinite alternate}@keyframes slowTap{to{transform:translateY(-3px)}}</style>');
    }
    svg=svg.replace('>hush</text>',`>${plugin==='foreman'?'Foreman':'razor'}</text>`);
    if(plugin==='foreman') svg=svg.replace('font-size="20" font-weight="600">Foreman','font-size="17" font-weight="600">Foreman');
    svg=svg.replace(/<g transform="translate\(650 221\) scale\(1.15\)">[\s\S]*?<\/g>/,`<text x="656" y="224" class="ink" text-anchor="middle" font-size="20" font-weight="600">${closing}</text>`);
    svg=svg.replace('Same Ember. Less chatter.',plugin==='foreman'?'One plan. A clear next step.':'Only what you asked for.');
    if(!svg.includes('>'+closing+'</text>')) throw Error('Closing text changed: '+plugin);
  }
  svg=svg.replace(/<g class="hush">([\s\S]*?)<\/g>/,'<g class="hush"><g transform="translate(619 85) scale(1.5) translate(-619 -85)">$1</g></g>');
  svg=svg.replace('font-weight="600">'+(plugin==='foreman'?'Foreman':plugin)+'</text>','font-weight="700">'+(plugin==='foreman'?'Foreman':plugin)+'</text>');
  fs.writeFileSync(path.join(__dirname,plugin+'.svg'),svg);
}
console.log('Built Hush, Foreman and Razor; original closing text retained.');
