"use strict";
const {test}=require('node:test'),assert=require('node:assert/strict');
const {compareCopies,PAIRS}=require('./check-maintenance-copies');
const source=file=>file+'\n';
const read=(plugin,platform,checkout,file)=>source(PAIRS.find(pair=>pair[1]===file)[0]);
test('all six editions are checked, tolerating only line-ending differences',()=>{
 const seen=new Set();
 assert.deepEqual(compareCopies(source,(plugin,platform,checkout,file)=>{seen.add(plugin+'/'+platform);return read(plugin,platform,checkout,file).replace(/\n/g,'\r\n');}),[]);
 assert.equal(seen.size,6);
});
test('a stale deep-worktree copy fails',()=>{
 const errors=compareCopies(source,(plugin,platform,checkout,file)=>plugin==='razor'&&platform==='Claude'&&file.endsWith('check-readme-nav.js')?'old implementation':read(plugin,platform,checkout,file));
 assert.equal(errors.length,1);assert.match(errors[0],/razor\/Claude/);
});
test('missing peer files are unverified failures, not silent passes',()=>{
 assert.ok(compareCopies(source,()=>{throw Error('missing peer ref');}).every(error=>error.includes('cannot verify')));
});
