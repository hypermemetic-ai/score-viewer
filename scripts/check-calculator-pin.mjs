import {readFile,lstat,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

export const calculatorRevision='e325912d00efaef887738f4fb0f94a2495d58577';
const calculatorTree='09a8501a13f1764b12aa85588459cdc9872977f1';
const packageName='@hypermemetic-ai/fingering-calculator';
const archivePath=`vendor/fingering-calculator/fingering-calculator-${calculatorRevision}.tgz`;
const digest=(bytes,algorithm='sha256')=>createHash(algorithm).update(bytes).digest(algorithm==='sha512'?'base64':'hex');
function requireValue(value,message){if(!value)throw Error(`Calculator pin: ${message}`);}

export async function verifyCalculatorPin(root=fileURLToPath(new URL('../',import.meta.url))){
 const identity=JSON.parse(await readFile(join(root,'vendor/fingering-calculator/source-package-identity.json'),'utf8'));
 requireValue(identity.version==='viewer-calculator-package-v1'&&identity.sourceRevision===calculatorRevision&&identity.sourceTree===calculatorTree&&
  identity.reviewedPullRequest===27&&identity.packageName===packageName&&identity.packageVersion==='0.1.0','reviewed source identity differs');
 requireValue(identity.archive.path===archivePath,'archive path differs');
 requireValue((await lstat(join(root,archivePath))).isFile(),'archive must be a regular file');
 const archive=await readFile(join(root,archivePath));
 requireValue(archive.length===identity.archive.bytes&&digest(archive)===identity.archive.sha256,'archive bytes differ');
 const pkg=JSON.parse(await readFile(join(root,'package.json'),'utf8')),lock=JSON.parse(await readFile(join(root,'package-lock.json'),'utf8'));
 const specifier=`file:${archivePath}`,entry=lock.packages?.[`node_modules/${packageName}`];
 requireValue(pkg.dependencies?.[packageName]===specifier&&lock.packages?.[''].dependencies?.[packageName]===specifier&&
  entry?.resolved===specifier&&entry.integrity===`sha512-${digest(archive,'sha512')}`,'declaration or package lock differs');
 const installed=join(root,'node_modules',packageName),members=[];
 async function walk(directory,prefix=''){
  for(const name of await readdir(directory)){
   const path=prefix+name,stat=await lstat(join(directory,name));
   requireValue(!stat.isSymbolicLink(),'installed package contains a symbolic link');
   if(stat.isDirectory())await walk(join(directory,name),path+'/');
   else {requireValue(stat.isFile(),'unsupported installed member');members.push(path);}
  }
 }
 await walk(installed);
 const expected=Object.keys(identity.members).sort();
 requireValue(expected.length===70&&JSON.stringify(members.sort())===JSON.stringify(expected),'installed package inventory differs');
 for(const path of expected){
  requireValue(!path.startsWith('/')&&!path.split('/').some(p=>p==='..'),'unsafe member identity');
  const bytes=await readFile(join(installed,path)),wanted=identity.members[path];
  requireValue(bytes.length===wanted.bytes&&digest(bytes)===wanted.sha256,`installed member differs: ${path}`);
 }
 const rootPackage=JSON.parse(await readFile(join(installed,'package.json'),'utf8'));
 requireValue(rootPackage.name===packageName&&rootPackage.exports?.['.']?.import==='./dist/index.js'&&
  rootPackage.exports['.'].types==='./dist/index.d.ts'&&Object.keys(rootPackage.exports).length===1,'root export differs');
 return{calculatorRevision,archiveBytes:archive.length,installedMembers:members.length,byteExact:true};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{console.log(JSON.stringify(await verifyCalculatorPin()));}
 catch(error){console.error(error.message);process.exitCode=1;}
}
