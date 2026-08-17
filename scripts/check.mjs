import { spawnSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
const roots = ['server.mjs','lib','public','scripts','tests'];
const files = [];
function walk(target) {
  const stat = statSync(target);
  if (stat.isDirectory()) for (const name of readdirSync(target)) walk(path.join(target, name));
  else if (/\.(mjs|js)$/.test(target)) files.push(target);
}
roots.forEach(walk);
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(`Syntax check passed for ${files.length} JavaScript files.`);
