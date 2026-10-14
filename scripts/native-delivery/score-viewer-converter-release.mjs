import {createHash} from 'node:crypto';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {join,dirname} from 'node:path';
const sha=b=>createHash('sha256').update(b).digest('hex');
export const converterNoticeNames=Object.freeze(['source-package.tgz','source-package-identity.json','SOURCE-NOTICE.txt','NOTICE.txt','guitar-pro.worker.js.LEGAL.txt']);
const assetPrefix='converter/gp/',noticePrefix='notices/score-converter/';
export function converterResourceMap(frontendFiles){
 if(!frontendFiles[assetPrefix+'source-package-identity.json']){
  if(Object.keys(frontendFiles).some(name=>name.startsWith(assetPrefix)))throw Error('Converter runtime has no source/notice identity.');
  return {};
 }
 for(const name of converterNoticeNames)if(!frontendFiles[assetPrefix+name])throw Error('Incomplete converter recipient source closure: '+name);
 return Object.fromEntries(converterNoticeNames.map(name=>['../dist/'+assetPrefix+name,noticePrefix+name]));
}
export function validateConverterRecipient(files,frontendFiles){
 if(!Object.keys(converterResourceMap(frontendFiles)).length)return;
 const mac=Object.keys(files).some(name=>name.startsWith('ISO Score Viewer.app/'));
 for(const name of converterNoticeNames){const pin=frontendFiles[assetPrefix+name];
  for(const path of [noticePrefix+name,...(mac?['ISO Score Viewer.app/Contents/Resources/'+noticePrefix+name]:[])]){
   const b=files[path];if(!b||b.length!==pin.size||sha(b)!==pin.sha256)throw Error('Converter recipient source/notice differs: '+path);
  }
 }
}
export async function packageConverterNotices(source,packet){
 const {frontend}=JSON.parse(await readFile(join(source,'delivery-input','inputs.json')));
 const resources=converterResourceMap(frontend.files);
 for(const name of converterNoticeNames){
  if(!Object.keys(resources).length)break;
  const b=await readFile(join(source,'delivery-input','frontend',assetPrefix+name)),pin=frontend.files[assetPrefix+name];
  if(b.length!==pin.size||sha(b)!==pin.sha256)throw Error('Frozen converter source/notice differs: '+name);
  const path=join(packet,noticePrefix+name);await mkdir(dirname(path),{recursive:true});await writeFile(path,b,{flag:'wx'});
 }
}
export async function verifyBundledConverterNotices(source,resources){
 const {frontend}=JSON.parse(await readFile(join(source,'delivery-input','inputs.json'))),map=converterResourceMap(frontend.files),hashes={};
 for(const name of converterNoticeNames){if(!Object.keys(map).length)break;
  const b=await readFile(join(resources,noticePrefix+name)),pin=frontend.files[assetPrefix+name];
  if(b.length!==pin.size||sha(b)!==pin.sha256)throw Error('Mac converter source/notice differs: '+name);
  hashes[noticePrefix+name]=pin.sha256;
 }
 return hashes;
}
