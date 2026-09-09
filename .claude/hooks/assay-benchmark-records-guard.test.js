"use strict";
const {test}=require('node:test'),assert=require('node:assert/strict');
const {decision}=require('./assay-benchmark-records-guard');
const write=file=>({tool_name:'Write',tool_input:{file_path:file,content:'{"name":"sample","version":"1.0.0"}'}});
test('Claude manifests retain catalog-owned versions',()=>assert.equal(decision(write('sample/.claude-plugin/plugin.json')).hookSpecificOutput.permissionDecision,'deny'));
test('Windows paths and casing keep the same Claude policy',()=>assert.ok(decision(write('D:\\project\\sample\\.CLAUDE-plugin\\plugin.json'))));
test('Codex manifests keep their required native version',()=>assert.equal(decision(write('sample/.codex-plugin/plugin.json')),null));
test('unrelated plugin.json files are outside this guard',()=>assert.equal(decision(write('sample/config/plugin.json')),null));
test('publishing research is no longer forbidden by directory name',()=>{
 for(const command of ['git add benchmarks/hush/results/report.md','git add docs/hush/research/study.md','git commit -m "Publish measured results"'])assert.equal(decision({tool_name:'Bash',tool_input:{command}}),null);
});
test('a version-free Claude edit is allowed',()=>assert.equal(decision({tool_name:'Edit',tool_input:{file_path:'.claude-plugin/plugin.json',new_string:'"description":"Updated"'}}),null));
