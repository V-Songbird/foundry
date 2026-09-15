#!/usr/bin/env node
"use strict";
const fs=require("node:fs"),path=require("node:path");
const {execFileSync}=require('node:child_process');
const {git,branchRef,readCatalog,layoutOf,CATALOGS}=require("./check-platform-marketplaces");
const NAV=['check-readme-nav.js','vendor/github-slugger-regex.js','vendor/github-slugger-LICENSE'];
const FILES=['check-platform-layout.js','check-platform-layout.test.js','check-readme-parity.js','check-readme-parity.test.js',
 'check-readme-candidate.js','check-readme-candidate.test.js',...NAV];
const copies=files=>files.map(file=>['scripts/git-hooks/'+file,'scripts/git-hooks/'+file]);
const PAIRS=[...copies(FILES),
 ['.github/PLUGIN_PLATFORM_LAYOUT_WORKFLOW.yml','.github/workflows/platform-layout.yml'],
 ['.github/PLUGIN_README_PARITY_WORKFLOW.yml','.github/workflows/readme-parity.yml'],
 ['.github/README_COORDINATION.md','.github/README_COORDINATION.md']];
// A package on main keeps only the README navigation check its plugin pre-commit runs.
const PACKAGE_PAIRS=copies(NAV);
const normalize=text=>text.replace(/\r\n/g,'\n');

// One [plugin, branch, local checkouts] row per maintained plugin branch, with the
// layout taken from the Claude catalog. An edition may be checked out in the
// submodule or in a local platform-isolation worktree.
function branches(catalog){
 return catalog.plugins.flatMap(({name})=>layoutOf(catalog,name)==='package'?[[name,'main',[name]]]:
  ['Claude','Codex'].map(platform=>[name,platform,[name,`.claude/worktrees/platform-isolation/${name}-${platform}`]]));
}

function compareCopies(readRoot,readEdition,rows){
 const errors=[];
 for(const [plugin,branch,checkouts] of rows) for(const [canonical,file] of branch==='main'?PACKAGE_PAIRS:PAIRS){
  try{
   if(normalize(readRoot(canonical))!==normalize(readEdition(plugin,branch,checkouts,file)))errors.push(`${plugin}/${branch}: ${file} differs from ${canonical}`);
  }catch(error){errors.push(`${plugin}/${branch}: cannot verify ${file}: ${error.message}`);}
 }
 return errors;
}

function main(root=path.resolve(__dirname,'../..')){
 let rows;
 try{rows=branches(readCatalog(root,CATALOGS.Claude));}catch(error){console.error(`Cannot read Claude marketplace: ${error.message}`);return 1;}
 const errors=compareCopies(file=>fs.readFileSync(path.join(root,file),'utf8'),(plugin,branch,checkouts,file)=>{
  // A checkout path can be switched by the developer. Only read its working
  // files when Git confirms that it is the requested branch.
  for(const checkout of checkouts){
   const candidate=path.join(root,checkout);
   if(fs.existsSync(candidate)&&git(candidate,['branch','--show-current'])===branch)return fs.readFileSync(path.join(candidate,file),'utf8');
  }
  const repo=path.join(root,plugin);
  const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('GIT_')));
  return execFileSync('git',['-C',repo,'show',`${branchRef(repo,branch)}:${file}`],{env,encoding:'utf8',stdio:['ignore','pipe','pipe'],maxBuffer:4*1024*1024});
 },rows);
 // Native development skills share one body, not independently drifting ports.
 for(const skill of ['coordinate-readmes','tinta-y-oficio']){
  try{
   const a=fs.readFileSync(path.join(root,'.claude/skills',skill,'SKILL.md'),'utf8');
   const b=fs.readFileSync(path.join(root,'.agents/skills',skill,'SKILL.md'),'utf8');
   if(normalize(a)!==normalize(b))errors.push(`Native ${skill} skills differ`);
  }catch(error){errors.push(error.message);}
 }
 if(errors.length){console.error(errors.join('\n'));return 1;}
 console.log(`Maintenance copies agree across ${rows.length} plugin branches and shared native skills.`);return 0;
}
module.exports={compareCopies,branches,main,PAIRS,PACKAGE_PAIRS};
if(require.main===module)process.exitCode=main();
