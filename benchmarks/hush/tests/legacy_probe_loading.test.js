"use strict";
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),os=require('node:os'),cp=require('node:child_process');
const probes=path.resolve(__dirname,'../experiments/output-probes');
const {loadLegacyHush}=require(path.join(probes,'legacy-hush'));
test('historical helpers can be imported without accessing user transcripts',()=>{
 assert.equal(typeof require(path.join(probes,'hush-corpus-probe')).extractToolCalls,'function');
 assert.equal(typeof require(path.join(probes,'hush-flatten-probe')).flattenRecords,'function');
});
for(const name of ['hush-corpus-probe.js','hush-flatten-probe.js','hush-delta-smoke.js'])test(name+' supports a side-effect-free help path',()=>{
 const r=cp.spawnSync(process.execPath,[path.join(probes,name),'--help'],{encoding:'utf8',env:{...process.env,HUSH_DIR:path.join(os.tmpdir(),'missing-hush-for-help')}});
 assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/Historical/);
});
test('live delta measurement requires an explicit opt-in',()=>{
 const r=cp.spawnSync(process.execPath,[path.join(probes,'hush-delta-smoke.js')],{encoding:'utf8'});
 assert.equal(r.status,2);assert.match(r.stderr,/--allow-live/);
});
test('missing historical source fails clearly rather than using a guessed API',()=>assert.throws(()=>loadLegacyHush(['mcpTableCandidate'],path.join(os.tmpdir(),'missing-hush-source')),/Set HUSH_DIR/));
test('an explicitly selected compatible source is used unchanged',()=>{
 const root=fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()),'legacy-hush-test-'));
 try{
  fs.mkdirSync(path.join(root,'hooks'));fs.writeFileSync(path.join(root,'hooks/compress-tool-output.js'),'module.exports={mcpTableCandidate:()=>"retained"};\n');
  const loaded=loadLegacyHush(['mcpTableCandidate'],root);assert.equal(loaded.api.mcpTableCandidate(),'retained');
  assert.throws(()=>loadLegacyHush(['renderMcpTable'],root),/retired Hush exports/);
 }finally{
  if(!path.resolve(root).startsWith(fs.realpathSync(os.tmpdir())+path.sep))throw Error('Unsafe fixture cleanup');fs.rmSync(root,{recursive:true,force:true});
 }
});
