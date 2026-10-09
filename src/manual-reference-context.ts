import {validateReferencePerformanceTempo,type ReferencePerformanceTempo} from '../vendor/iso-notation/src/model/reference-performance-tempo';
import {identityHash} from './piano-preparation-identity';

export interface ManualReferenceIdentity {partId:string;musicalRevision:string}
export interface ManualReferenceContext extends ManualReferenceIdentity {
 version:'manual-reference-context-v1';reference:ReferencePerformanceTempo;
}
const identity=(value:ManualReferenceIdentity)=>{
 if(!value.partId||typeof value.partId!=='string'||!/^[a-f0-9]{64}$/.test(value.musicalRevision))throw Error('Invalid manual reference source identity.');
 return {partId:value.partId,musicalRevision:value.musicalRevision};
};
/** Native-valid managed name; the complete logical namespace is hashed. */
export async function manualReferenceStorageName(value:ManualReferenceIdentity){
 const captured=identity(value);return `practice-${await identityHash({version:'manual-reference-context-v1',...captured})}.json`;
}
export function manualReferenceRecord(value:ManualReferenceIdentity,reference:ReferencePerformanceTempo):ManualReferenceContext {
 return {version:'manual-reference-context-v1',...identity(value),reference:validateReferencePerformanceTempo(structuredClone(reference))};
}
/** A corrupt or differently bound choice refuses without changing its bytes. */
export function readManualReference(raw:unknown,value:ManualReferenceIdentity):ReferencePerformanceTempo|undefined {
 const bound=identity(value);if(raw===null||raw===undefined)return;
 const r=structuredClone(raw) as Partial<ManualReferenceContext>;
 if(!r||r.version!=='manual-reference-context-v1'||r.partId!==bound.partId||r.musicalRevision!==bound.musicalRevision)
  throw Error('The saved playing tempo belongs to a different source part. Saved data retained.');
 return validateReferencePerformanceTempo(r.reference);
}
