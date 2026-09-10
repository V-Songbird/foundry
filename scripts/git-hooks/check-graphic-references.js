#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const archive=file=>/^benchmarks\/[^/]+\/(records(?:-archive)?|experiments)\//.test(file)||/\/source\//.test(file)||/^docs\/shared\/launch\/assets\/(tinta-y-oficio-v[12]|ember-options|ember-icons|dark-previews)\//.test(file)||file.endsWith('tinta-y-oficio-legacy.md');
function check(file,text){
 if(archive(file))return [];
 // Code examples describe embedding syntax, not displayed artwork.
 const body=text.replace(/^\s*(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\s*\1\s*$/gm,'');
 const errors=[];
 for(const match of body.matchAll(/<(?:img|source)\b[^>]*?\bsrc(?:set)?=["']([^"']+)["']|!\[[^\]]*\]\(([^)]+)\)/g)){
  const ref=match[1]||match[2];
  if(/raw\.githubusercontent\.com\/V-Songbird\//i.test(ref))errors.push(`${file}: embed the maintained local graphic; keep ${ref} as an ordinary provenance link`);
  if(!/^(?:https?:|data:|#)/.test(ref)){
   const target=path.resolve(root,path.dirname(file),ref);
   const relative=path.relative(root,target).split(path.sep).join('/');
   if(archive(relative))errors.push(`${file}: current page embeds archived artwork ${ref}`);
   if(!fs.existsSync(target))errors.push(`${file}: missing graphic ${ref}`);
  }
 }
 return errors;
}
function main(){
 const files=execFileSync('git',['ls-files','*.md','*.html'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(Boolean);
 const errors=files.flatMap(file=>check(file,fs.readFileSync(path.join(root,file),'utf8')));
 if(errors.length){console.error(errors.join('\n'));return 1;}
 console.log('Current documentation graphics resolve locally; archived evidence and design history remain separate.');return 0;
}
module.exports={check,archive,main};
if(require.main===module)process.exitCode=main();
