import {hashBytes} from './package';

const prepared=/^(state|practice|performance)-[a-f0-9]{64}-(?:conventional-piano|janko-four-row)-[a-f0-9]{64}-[a-f0-9]{64}-[a-f0-9]{64}\.json$/;
const legacy=/^(?:state|practice|performance)-[a-fA-F0-9]{64}\.json$/;
const presentation=/^(?:state|practice|performance)-[a-f0-9]{64}-(?:conventional-piano|janko-four-row)-[a-f0-9]{64}-[a-f0-9]{64}\.json$/;
const manualPractice=/^practice-manual-v1-[a-f0-9]{64}\.json$/;
const manualView=/^manual-reading-view-v1-[a-f0-9]{64}\.json$/;
const fixed=new Set(['library.json','preferences.json','calibration.json','practice-error-log.json']);

/** The existing native contract stays bounded and accepts no paths. The full
 * prepared journal identity remains its logical key and content binding. */
export function validPhysicalManagedName(name:string):boolean {
 return typeof name==='string'&&!/[^A-Za-z0-9.-]/.test(name)&&name.length<=230&&(fixed.has(name)||
  /^package-[a-fA-F0-9]{64}\.isoscore$/.test(name)||/^state-version-[a-f0-9]{64}\.json$/.test(name)||legacy.test(name)||presentation.test(name));
}

/** Only the exact known prepared-key shape gets an alias. Other names must
 * already satisfy the retained native filename contract. */
export async function physicalManagedName(name:string):Promise<string> {
 if(typeof name!=='string'||/[^A-Za-z0-9.-]/.test(name))throw Error('Invalid managed file identity');
 // Neutral journals keep their literal logical identity and JSON binding.
 // Full-key hashing fits the existing native path-free storage contract.
 if(manualPractice.test(name))return `practice-${await hashBytes(name)}.json`;
 if(manualView.test(name))return `state-${await hashBytes(name)}.json`;
 if(prepared.test(name))return `${name.slice(0,name.indexOf('-'))}-${await hashBytes(name)}.json`;
 if(!validPhysicalManagedName(name))throw Error('Invalid managed file identity');
 return name;
}

export interface ManagedFileStorage {
 read(name:string):Promise<Uint8Array|null>;
 write(name:string,data:Uint8Array):Promise<void>;
}

/** Browser-only legacy reads preserve existing long-key records and pointers.
 * New writes use the alias; they never delete or rewrite the old raw record.
 * Native callers never attempt the rejected long filename. */
export function managedFileStorage(physical:ManagedFileStorage,readLegacyBrowser?:(name:string)=>Promise<Uint8Array|null>):ManagedFileStorage {
 return {
  async read(name){const file=await physicalManagedName(name),stored=await physical.read(file);
   return stored!==null||file===name||!readLegacyBrowser?stored:readLegacyBrowser(name);},
  async write(name,data){await physical.write(await physicalManagedName(name),data);}
 };
}
