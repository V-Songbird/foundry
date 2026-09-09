const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../../../..');
const original = fs.readFileSync(path.join(root, 'hush/assets/mascot.svg'), 'utf8');
// Copy the original answer nodes, including punctuation and the link-styled span.
const answer = original.match(/<text class="ink" x="-98" y="-22"[\s\S]*?<text class="mut2"[^>]*>Next: nothing\.<\/text>/)[0];
const narration = [...original.matchAll(/<text[^>]*>(Let me look at the codebase…|Now I'll check the config…|Running the tests…)<\/text>/g)].map(m => m[1]);
if (narration.length !== 3) throw Error('Original narration not found');
const flameFrames = Array.from({length:17},(_,i)=>`${(i*2.1).toFixed(1)}%{transform:rotate(${i%2?10:-10}deg) scale(${i%3===0?'1.09,1.22':'0.98,1.12'})}`).join('');
const typingFrames = Array.from({length:85},(_,i)=>{
  const t=i/84*100;
  const amplitude=t<34?4.5:t<43?4.5*(43-t)/9:t<50?0:2;
  const phase=t<43?t/3:t/9;
  return t.toFixed(3)+'%{transform:translateY('+(-amplitude*(1-Math.cos(phase*Math.PI*2))/2).toFixed(2)+'px)}';
}).join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 820 390" role="img" aria-labelledby="title desc">
<title id="title">Ember esencial — la calma de Hush</title><desc id="desc">Ember teclea estresado; la llama se agita y se acumulan narración y registros. Aparece Hush, Ember hace shh y sigue escribiendo tranquilo. Respuesta conservada literalmente del SVG original: Done. One line to fix. The fix is in pricing.js:39. Next: nothing. La coreografía es ilustrativa, no una reproducción de tiempos del benchmark.</desc>
<style>
:root{--paper:#fff;--ink:#252820;--muted:#67716a;--line:#dadfd8;--blue:#2c75a5;--wash:#edf4f7;--warm:#f4f0e8}
@media(prefers-color-scheme:dark){:root{--paper:#191c1b;--ink:#eee9de;--muted:#b5bfb7;--line:#49524b;--blue:#79b6de;--wash:#253740;--warm:#30342e}}
.paper{fill:var(--paper)}.ink{fill:var(--ink)}.muted,.mut2{fill:var(--muted)}.edge{stroke:var(--ink);stroke-linecap:round;stroke-linejoin:round;stroke-width:3}.line{stroke:var(--line);fill:none;stroke-width:2}.blue{fill:var(--blue)}.wash{fill:var(--wash)}.warm{fill:var(--warm)}text{font-family:Segoe UI,Arial,sans-serif;font-kerning:normal;text-rendering:optimizeLegibility}.body{fill:#ed9852}.flame{fill:#efad50}.mark{fill:none;stroke:var(--ink);stroke-width:3.4;stroke-linecap:round}.link{fill:var(--blue);text-decoration:underline}
.flame-move{transform-origin:0 -77px;animation:fire 14s ease-in-out infinite}.noise,.stress{opacity:0;animation:stress 14s ease-in-out infinite}.stress{animation-name:expression}@keyframes expression{0%,34%,100%{opacity:1}43%,94%{opacity:0}}.noise.two{animation-name:second}.noise.three{animation-name:third}.calm,.late{animation:calm 14s ease-in-out infinite}.hush{animation:hush 14s ease-in-out infinite}.shh{opacity:0;animation:shh 14s ease-in-out infinite}.result{animation:result 14s ease-in-out infinite}.sheet{opacity:0;animation:store 14s ease-in-out infinite}.typing-left{animation:typing 14s linear infinite}.typing-right{animation:typing 14s linear -.07s infinite,hand-off 14s ease-in-out infinite}@keyframes hand-off{0%,40%,55%,100%{opacity:1}44%,50%{opacity:0}}@keyframes typing{${typingFrames}}.tense{animation:tense .16s ease-in-out infinite alternate}.eyelids{animation:blink 14s infinite;transform-origin:0 -24px}
@keyframes fire{${flameFrames}38%{transform:rotate(0) scale(1.1,1.2)}43%{transform:rotate(-3deg) scale(.8,.86)}49%,61%,75%,89%{transform:rotate(2deg) scale(.87,.94)}55%,68%,82%,94%{transform:rotate(-2deg) scale(.85,.92)}100%{transform:rotate(-10deg) scale(1.09,1.22)}}
@keyframes stress{0%,3%{opacity:0}8%,34%{opacity:1}41%,100%{opacity:0}}@keyframes second{0%,12%{opacity:0}17%,34%{opacity:1}41%,100%{opacity:0}}@keyframes third{0%,22%{opacity:0}27%,34%{opacity:1}41%,100%{opacity:0}}
@keyframes calm{0%,40%,100%{opacity:0}49%,94%{opacity:1}}@keyframes hush{0%,35%{opacity:0;transform:translateY(-12px)}42%,94%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(0)}}@keyframes shh{0%,40%{opacity:0}44%,48%{opacity:1;transform:translate(0,0)}0%,40%,54%,100%{opacity:0;transform:translate(4px,6px)}}@keyframes result{0%,66%,100%{opacity:0}72%,95%{opacity:1}}
@keyframes tense{to{transform:translateX(1.2px)}}@keyframes blink{0%,57%,59%,81%,83%,100%{transform:scaleY(1)}58%,82%{transform:scaleY(.1)}}@keyframes store{0%,22%{opacity:0;transform:translateY(0)}27%,35%{opacity:1;transform:translateY(0)}47%{opacity:1;transform:translateY(90px)}51%,100%{opacity:0;transform:translateY(90px)}}
@media(prefers-reduced-motion:reduce){*{animation:none!important}.noise,.stress,.sheet,.shh{opacity:0}.calm,.hush,.result,.late{opacity:1}.flame-move{transform:scale(.85,.92)}}
</style>
<rect class="paper" width="820" height="390" rx="20"/>
<text x="30" y="32" class="muted" font-size="12" letter-spacing="2">HUSH / EMBER ESENCIAL · REVISIÓN 05</text>
${narration.map((line,i)=>`<g class="noise ${['','two','three'][i]}"><g transform="translate(${20+i*9} ${58+i*47})"><path d="M17 1Q87 -3 149 0T265 2Q281 3 280 19Q282 34 268 38L276 49 251 39Q139 44 18 40Q-2 40 1 22Q-2 5 17 1Z" class="warm edge"/><text x="14" y="25" class="ink" font-size="17">${line}</text></g></g>`).join('')}
<g class="sheet"><path d="M87 184Q141 181 201 184L207 232Q148 237 85 234Z" class="wash edge"/><path d="M97 194q39 -2 80 1M97 204q51 2 96 -1M97 214q35 -1 72 1M97 224q41 2 86 -1" stroke="var(--blue)" stroke-width="3" stroke-linecap="round"/></g>
<g transform="translate(75 290)"><path d="M1 3L-1 -8Q1 -15 9 -13L41 -15 55 -4Q91 -7 125 -4Q134 -3 132 5L130 34Q132 43 121 41Q63 44 6 40Q-2 39 0 31Z" class="wash edge"/><text x="65" y="24" text-anchor="middle" class="ink" font-size="14">Full output</text></g>
<path d="M30 338Q141 335 245 338T466 337T650 339T790 337" class="line"/>
<g transform="translate(394 235)">
<ellipse cx="0" cy="95" rx="93" ry="7" fill="var(--ink)" opacity=".07"/>
<g class="flame-move"><path d="M-15 -76 Q-32 -98 0 -128 Q2 -109 17 -98 Q28 -77 7 -71Z" class="flame edge"/><path d="M-5 -79Q-12 -92 1 -104Q0 -93 9 -82Z" fill="#ffd891"/></g>
<path d="M-72 32 C-78 -10 -56 -65 -24 -76 C9 -87 48 -63 64 -29 C84 15 76 48 51 59 C22 74 -26 74 -54 59 Q-73 51 -72 32Z" class="body edge"/>

<ellipse cx="-37" cy="-9" rx="8" ry="4" fill="#d96e44" opacity=".35"/><ellipse cx="37" cy="-9" rx="8" ry="4" fill="#d96e44" opacity=".35"/>
<g class="eyelids"><ellipse cx="-23" cy="-24" rx="4" ry="7" class="ink"/><ellipse cx="23" cy="-24" rx="4" ry="7" class="ink"/></g>
<g class="stress"><g class="tense"><path d="M-34 -41l16 7m36 0 16 -7M-10 2Q0 -7 11 2" class="mark"/><path d="M63 -53Q53 -37 63 -36Q73 -36 63 -53" fill="var(--blue)"/></g></g>
<path d="M-10 -5Q0 4 11 -6" class="mark calm"/>
<path d="M-67 54Q-7 52 66 55Q76 54 75 63L73 79Q74 86 65 85Q-6 82 -67 85Q-77 84 -75 77L-75 62Q-76 54 -67 54Z" class="warm edge"/>
${Array.from({length:12},(_,i)=>`<path transform="translate(${-62+(i%6)*21} ${61+Math.floor(i/6)*11}) rotate(${i%2?2:-2})" d="M0 0L14 -1 15 6 1 6Z" fill="var(--muted)"/>`).join('')}
<g class="typing-left"><path d="M-58 15Q-69 22 -46 58Q-37 65 -30 56L-41 29" class="body edge"/></g>
<g class="typing-right"><path d="M57 15Q69 22 46 58Q37 65 30 56L41 29" class="body edge"/></g>
<g class="shh"><path d="M58 23Q33 21 9 3Q2 -9 -4 -3Q-11 5 0 15L42 44" class="body edge"/><text x="74" y="0" class="ink" font-size="16" font-style="italic">shh…</text></g>
</g>
<g class="hush"><path d="M594 67Q619 64 647 69Q666 71 664 86Q663 104 644 102L593 103Q575 100 576 86Q574 71 594 67Z" class="blue edge"/><text x="619" y="91" text-anchor="middle" class="paper" font-size="20" font-weight="600">hush</text></g>
<g class="result"><path d="M532 157Q652 152 779 158Q798 156 797 177L799 254Q800 276 780 276Q650 280 533 275Q514 278 515 257L516 221 501 214 516 205 514 178Q512 158 532 157Z" class="wash edge"/><g transform="translate(650 221) scale(1.15)">${answer}</g></g>
<text x="410" y="369" text-anchor="middle" class="muted" font-size="14">Same Ember. Less chatter.</text>
</svg>`;
const cleanSvg = svg;
if (!cleanSvg.includes(answer)) throw Error('Original answer changed');
fs.writeFileSync(path.join(__dirname,'04-esencial-refinado.svg'),cleanSvg);
let html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const start=html.indexOf('<main>'),end=html.indexOf('</main>')+7;
html=html.slice(0,start)+`<main><div class="eyebrow">Foundry / Hush / Ember · revisión 05</div><h1>El mismo Ember.<br>Una llama con más carácter.</h1><p class="intro">El diseño esencial, con el teclado, el estrés y el gesto de silencio del original. La respuesta final se copia literalmente de <code>hush/assets/mascot.svg</code>; la coreografía es ilustrativa.</p><div class="toolbar"><button id="pause" aria-pressed="false">Pausar</button><button id="still" aria-pressed="false">Ver resultado estático</button><button id="restart">Reiniciar</button></div><section>${cleanSvg}<p>0–5 s: tecleo nervioso, llama agitada y narración acumulada. 5–7 s: aparece Hush y Ember hace «shh». 7–10 s: sigue trabajando tranquilo. 10–14 s: la respuesta original permanece visible.</p><details><summary>Texto preservado y regla para el skill</summary><p><strong>Done. One line to fix.</strong><br>The fix is in pricing.js:39.<br>Next: nothing.</p><p>Las respuestas y referencias provenientes del material original se extraen literalmente. Cualquier cambio visual debe superar una comparación del texto contra su fuente. La duración de esta escena no se presenta como tiempo del benchmark.</p></details><a href="04-esencial-refinado.svg">Abrir animación independiente →</a></section><footer>Propuesta en revisión. Los assets publicados y las reglas activas siguen intactos. <a href="index.html">Ver las tres propuestas anteriores</a></footer></main>`+html.slice(end);
html=html.replace('<title>Ember · Tres direcciones para Hush</title>','<title>Ember esencial · revisión con respuesta original</title>').replaceAll("'Reiniciar las tres'","'Reiniciar'");
html=html.replace('</style><main>','.still .stress,.still .shh{opacity:0!important}.still .calm,.still .hush{opacity:1!important}.still .flame-move{transform:scale(.85,.92)}</style><main>');
fs.writeFileSync(path.join(__dirname,'refinado.html'),html);
console.log('Original answer SVG nodes preserved verbatim; 3 original narration lines preserved.');
