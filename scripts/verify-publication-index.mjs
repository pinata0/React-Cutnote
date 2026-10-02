import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync,copyFileSync,mkdirSync,mkdtempSync,writeFileSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
function run(command,args,env=process.env){
  const result=spawnSync(command,args,{cwd:root,env,encoding:'utf8',maxBuffer:32*1024*1024});
  if(result.status!==0)throw new Error('Publication verification failed: '+command+' '+args[0]+' (output withheld)');
  return result.stdout;
}
const gitPath=name=>resolve(root,run('git',['rev-parse','--git-path',name]).trim());
const index=gitPath('index');
const digest=path=>existsSync(path)?createHash('sha256').update(readFileSync(path)).digest('hex'):null;
const before=digest(index);
mkdirSync(join(root,'.security-checks'),{recursive:true});
const scratch=mkdtempSync(join(root,'.security-checks','publication-'));
const temporaryIndex=join(scratch,'index'),objects=join(scratch,'objects');
mkdirSync(objects);
if(existsSync(index))copyFileSync(index,temporaryIndex);
// Both the index AND new blobs stay outside the real repository object database.
const env={...process.env,GIT_INDEX_FILE:temporaryIndex,GIT_OBJECT_DIRECTORY:objects,GIT_ALTERNATE_OBJECT_DIRECTORIES:gitPath('objects')};
run('git',['add','--all','--','.'],env);
const entries=run('git',['ls-files','--stage','-z'],env).split('\0').filter(Boolean);
if(entries.some(entry=>!entry.startsWith('100644 ')&&!entry.startsWith('100755 ')))throw new Error('Unexpected staged mode; publication blocked');
const scan=run(process.execPath,['scripts/check-publication.mjs','--index'],env);
if(digest(index)!==before)throw new Error('Real index changed during verification');
writeFileSync(join(scratch,'manifest.json'),JSON.stringify(entries.map(entry=>({mode:entry.slice(0,6),path:entry.split('\t')[1]})),null,2)+'\n');
console.log(scan.trim());
console.log(`PASS: ${entries.length} staged files verified using isolated index and objects; actual index unchanged (${before===null?'absent':'same hash'}). No tree, commit, ref or push created.`);
