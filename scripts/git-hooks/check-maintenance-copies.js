#!/usr/bin/env node
"use strict";
const fs=require("node:fs"),path=require("node:path");
const {execFileSync}=require('node:child_process');
const {git,branchRef}=require("./check-platform-marketplaces");
const EDITIONS=[['foreman','Codex','foreman'],['foreman','Claude','.claude/worktrees/platform-isolation/foreman-Claude'],
 ['hush','Claude','hush'],['hush','Codex','.claude/worktrees/platform-isolation/hush-Codex'],
 ['razor','Codex','razor'],['razor','Claude','.claude/worktrees/platform-isolation/razor-Claude']];
const FILES=['check-platform-layout.js','check-platform-layout.test.js','check-readme-parity.js','check-readme-parity.test.js',
 'check-readme-candidate.js','check-readme-candidate.test.js','check-readme-nav.js',
 'vendor/github-slugger-regex.js','vendor/github-slugger-LICENSE'];
const PAIRS=[...FILES.map(file=>['scripts/git-hooks/'+file,'scripts/git-hooks/'+file]),
 ['.github/PLUGIN_PLATFORM_LAYOUT_WORKFLOW.yml','.github/workflows/platform-layout.yml'],
 ['.github/PLUGIN_README_PARITY_WORKFLOW.yml','.github/workflows/readme-parity.yml'],
 ['.github/README_COORDINATION.md','.github/README_COORDINATION.md']];
const normalize=text=>text.replace(/\r\n/g,'\n');

function compareCopies(readRoot,readEdition){
 const errors=[];
 for(const [plugin,platform,checkout] of EDITIONS) for(const [canonical,file] of PAIRS){
  try{
   if(normalize(readRoot(canonical))!==normalize(readEdition(plugin,platform,checkout,file)))errors.push(`${plugin}/${platform}: ${file} differs from ${canonical}`);
  }catch(error){errors.push(`${plugin}/${platform}: cannot verify ${file}: ${error.message}`);}
 }
 return errors;
}

function main(root=path.resolve(__dirname,'../..')){
 const errors=compareCopies(file=>fs.readFileSync(path.join(root,file),'utf8'),(plugin,platform,checkout,file)=>{
  const candidate=path.join(root,checkout);
  // A conventional checkout path can be switched by the developer. Only read
  // its working files when Git confirms that it is the requested edition.
  if(fs.existsSync(candidate)){
   const branch=git(candidate,['branch','--show-current']);
   if(branch===platform)return fs.readFileSync(path.join(candidate,file),'utf8');
  }
  const repo=path.join(root,plugin);
  const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('GIT_')));
  return execFileSync('git',['-C',repo,'show',`${branchRef(repo,platform)}:${file}`],{env,encoding:'utf8',stdio:['ignore','pipe','pipe'],maxBuffer:4*1024*1024});
 });
 // Native development skills share one body, not independently drifting ports.
 for(const skill of ['coordinate-readmes','tinta-y-oficio']){
  try{
   const a=fs.readFileSync(path.join(root,'.claude/skills',skill,'SKILL.md'),'utf8');
   const b=fs.readFileSync(path.join(root,'.agents/skills',skill,'SKILL.md'),'utf8');
   if(normalize(a)!==normalize(b))errors.push(`Native ${skill} skills differ`);
  }catch(error){errors.push(error.message);}
 }
 if(errors.length){console.error(errors.join('\n'));return 1;}
 console.log('Maintenance copies agree across six editions and shared native skills.');return 0;
}
module.exports={compareCopies,main,PAIRS,EDITIONS};
if(require.main===module)process.exitCode=main();
