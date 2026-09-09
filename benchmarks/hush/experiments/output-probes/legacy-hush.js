"use strict";
const path=require('node:path');
const fs=require('node:fs');

function loadLegacyHush(required, directory=process.env.HUSH_DIR) {
  const root=directory?path.resolve(directory):path.resolve(__dirname,'../../../../hush');
  const file=path.join(root,'hooks/compress-tool-output.js');
  if(!fs.existsSync(file))throw new Error(`Historical Hush source is missing at ${file}. Set HUSH_DIR to a compatible retained checkout.`);
  const api=require(file);
  const missing=required.filter(name=>typeof api[name]!=='function');
  if(missing.length)throw new Error(`This historical probe needs retired Hush exports: ${missing.join(', ')}. Set HUSH_DIR to the source revision used by the experiment; the current plugin must not be changed to satisfy the probe.`);
  return {root,api};
}
module.exports={loadLegacyHush};
