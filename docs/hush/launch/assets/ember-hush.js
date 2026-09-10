// Compatibility entry point. The retained previous generator is historical only.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../../shared/launch/assets/ember-approved');
require(path.join(root,'build.cjs'));
const out=process.argv[2]||path.join(__dirname,'mascot-hush.svg');
fs.copyFileSync(path.join(root,'hush.svg'),out);
console.log('Wrote current approved hush mascot:',out);
