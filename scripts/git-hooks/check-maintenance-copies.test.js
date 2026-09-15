"use strict";
const {test}=require('node:test'),assert=require('node:assert/strict');
const {compareCopies,branches,PAIRS,PACKAGE_PAIRS}=require('./check-maintenance-copies');
const source=file=>file+'\n';
const read=(plugin,platform,checkouts,file)=>source(PAIRS.find(pair=>pair[1]===file)[0]);
const catalog=foremanRef=>({plugins:[{name:'foreman',source:{ref:foremanRef}},{name:'hush',source:{ref:'Claude'}},{name:'example',source:{ref:'Claude'}}]});
const editions=branches(catalog('Claude'));
test('all six editions are checked, tolerating only line-ending differences',()=>{
 const seen=new Set();
 assert.deepEqual(compareCopies(source,(plugin,platform,checkouts,file)=>{seen.add(plugin+'/'+platform);return read(plugin,platform,checkouts,file).replace(/\n/g,'\r\n');},editions),[]);
 assert.equal(seen.size,6);
});
test('each edition may be checked out in its submodule or a platform-isolation worktree',()=>{
 assert.deepEqual(editions.filter(([plugin])=>plugin==='hush'),[
  ['hush','Claude',['hush','.claude/worktrees/platform-isolation/hush-Claude']],
  ['hush','Codex',['hush','.claude/worktrees/platform-isolation/hush-Codex']]]);
});
test('a package plugin is checked once on main, only for the README navigation files',()=>{
 const asked=[];
 assert.deepEqual(compareCopies(source,(plugin,branch,checkouts,file)=>{asked.push([plugin,branch,checkouts,file]);return read(plugin,branch,checkouts,file);},branches(catalog('main'))),[]);
 assert.equal(new Set(asked.map(([plugin,branch])=>plugin+'/'+branch)).size,5);
 const foreman=asked.filter(([plugin])=>plugin==='foreman');
 assert.deepEqual(foreman,PACKAGE_PAIRS.map(([,file])=>['foreman','main',['foreman'],file]));
 assert.ok(foreman.every(([,,,file])=>!/platform-layout|readme-parity|readme-candidate|README_COORDINATION/.test(file)));
});
test('a stale deep-worktree copy fails',()=>{
 const errors=compareCopies(source,(plugin,platform,checkouts,file)=>plugin==='hush'&&platform==='Codex'&&file.endsWith('check-readme-nav.js')?'old implementation':read(plugin,platform,checkouts,file),editions);
 assert.equal(errors.length,1);assert.match(errors[0],/hush\/Codex/);
});
test('missing peer files are unverified failures, not silent passes',()=>{
 assert.ok(compareCopies(source,()=>{throw Error('missing peer ref');},editions).every(error=>error.includes('cannot verify')));
});
