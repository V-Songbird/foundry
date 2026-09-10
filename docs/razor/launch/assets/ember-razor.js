// Compatibility entry point. The retained previous generator is historical only.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../../shared/launch/assets/ember-approved');
require(path.join(root,'build.cjs'));
const out=process.argv[2]||path.join(__dirname,'mascot-razor.svg');
fs.copyFileSync(path.join(root,'razor.svg'),out);
console.log('Wrote current approved razor mascot:',out);
