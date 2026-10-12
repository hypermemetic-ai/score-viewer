import {hashBytes} from './package';

const historicalFiles=['calibration.json','calibration-pilot-v1.json','calibration-effort-v2.json','calibration-fingertips-v1.json'] as const;
export async function retainedCalibrationBytes(bytes:Uint8Array){
 let raw='';for(let i=0;i<bytes.length;i+=8192)raw+=String.fromCharCode(...bytes.subarray(i,i+8192));
 return{encoding:'base64',bytes:bytes.length,sha256:await hashBytes(bytes),data:btoa(raw)};
}
/** Original bytes retain their protocol identity even when they cannot be admitted. */
export async function retainedCalibrationEvidence(files:{read(name:string):Promise<Uint8Array|undefined>}){
 return Promise.all(historicalFiles.map(async filename=>{
  const bytes=await files.read(filename);
  if(!bytes)return{filename,present:false as const};
  return{filename,present:true as const,...await retainedCalibrationBytes(bytes)};
 }));
}
