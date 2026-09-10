const {test}=require('node:test'),assert=require('node:assert/strict');
const {check}=require('./check-graphic-references');
test('a retained-source page displays the current chart and keeps the original as a provenance link',()=>{
 const file='docs/hush/validation/claude-readme-benchmark-source-2026-09-08.md';
 const original='https://raw.githubusercontent.com/V-Songbird/hush/13c24a9bd610a39740eb2816b54cc16b090978ed/assets/bench-cuts.svg';
 assert.equal(check(file,`<img src="${original}">`).length,1);
 assert.deepEqual(check(file,`[Original](${original})\n<img src="../../shared/launch/assets/graphics-ink/hush-bench-cuts.svg">`),[]);
});
test('archives retain their evidence but active pages cannot embed obsolete artwork',()=>{
 assert.deepEqual(check('benchmarks/hush/records/run/README.md','<img src="missing.svg">'),[]);
 assert.ok(check('README.md','<img src="docs/shared/launch/assets/tinta-y-oficio-v1/preview-alpha.png">').some(x=>x.includes('archived artwork')));
 assert.deepEqual(check('README.md','```html\n<img src="example.svg">\n```'),[]);
});
