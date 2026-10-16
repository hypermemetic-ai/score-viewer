import type {SourceTrackInfo,GuitarProReport,InspectionResult} from 'score-converter-proof/guitar-pro/webview';
import type {QuantizedGridScore} from '../vendor/iso-notation/src/model/types';
import type {Metadata,ScorePackage} from './package';

export const GUITAR_PRO_FILES=Object.freeze({original:'guitar-pro/original.gp',report:'guitar-pro/report.json',
 xml:'guitar-pro/converted.musicxml',descriptor:'guitar-pro/import.json'} as const);
export interface GuitarProSourceIdentity {
 version:'viewer-guitar-pro-source-v1';inputSha256:string;sourceTrackId:string;musicxmlPartId:string;
 scoreId:string;groupId:string;converterArchiveSha256:string;converterSourceTree:string;
 projection:'portable-musicxml-retain-v1/shared-c2-outward-v1';
}
export interface GuitarProContext extends GuitarProSourceIdentity {
 family:'guitar'|'bass';profile:string;sourceName?:string;
}
/** Discovery descriptions are not conversion or instrument authority. */
export interface GuitarProInspection {readonly inputSha256:string;readonly tracks:readonly SourceTrackInfo[];readonly report:InspectionResult['report']}
export interface GuitarProPreparedInput {
 score:QuantizedGridScore;metadata:Metadata;retainedFiles:Record<string,Uint8Array>;sourceIdentity:GuitarProSourceIdentity;
}
export interface GuitarProStageOptions {
 signal?:AbortSignal;checkpoint?:()=>void|Promise<void>;
 /** No managed writes. Return bytes only after both views and independent cold admission. */
 prepareAndAdmit:(input:GuitarProPreparedInput,signal?:AbortSignal)=>Promise<{bytes:Uint8Array;package:ScorePackage}>;
}
export interface StagedGuitarProPart {readonly sourceTrackId:string;readonly package:ScorePackage;readonly bytes:Uint8Array;readonly context:GuitarProContext}
export interface StagedGuitarProImport {readonly groupId:string;readonly inputSha256:string;readonly parts:readonly StagedGuitarProPart[]}
export interface GuitarProColdOptions {signal?:AbortSignal;checkpoint?:()=>void|Promise<void>}

/** Keeps an actual public refusal's code and report available to the UI. It
 * cannot grant source or family authority. */
export class GuitarProImportRefusal extends Error {
 readonly code:string;
 constructor(readonly report:GuitarProReport|InspectionResult['report'],fallback='Guitar Pro intake refused.'){
  const blocked=report.findings.find(f=>f.disposition==='blocking');
  super(blocked?.message??fallback);this.name='GuitarProImportRefusal';this.code=blocked?.code??'conversion-refused';
 }
}
const otherFamilies:Readonly<Record<string,string>>={keyboard:'a keyboard',vocal:'a vocal',percussion:'a percussion',other:'not a guitar or bass'};
/** The converter also admits other instruments as arrangements. The viewer
 * reads tuned guitar and bass parts only, and refuses the rest plainly. */
export function guitarProFamilyRefusal(instrumentFamily:string,scoreKind:string):string|undefined{
 if(instrumentFamily!=='guitar'&&instrumentFamily!=='bass')
  return `This source part is ${otherFamilies[instrumentFamily]??'not a guitar or bass'} part. Guitar Pro import reads guitar and bass parts only.`;
 if(scoreKind!=='fretted')return 'This source part has no string tuning to read. Guitar Pro import reads tuned guitar and bass parts only.';
}
export const EARLIER_GUITAR_PRO_CONVERTER='This part was imported with an earlier Guitar Pro converter. Its music opens as before; its instrument name and other source parts aren\'t available.';
