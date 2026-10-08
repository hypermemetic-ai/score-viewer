import type {ScorePackage,FingerLayer} from './package';
import {pianoRequestAuthority,type PerformingHandPolicy} from './piano-request-authority';
import type {PianoAssignmentConstraint} from '../vendor/iso-notation/src/model/piano-finger-assignments';
import {scoreWithCalculationContext} from '../vendor/iso-notation/src/model/piano-calculation-context';
import {APPROVED_SCORE_RENDERING_ENGINE,CALCULATED_HAND_SCORE_RENDERING_ENGINE} from '../vendor/iso-notation/src/render/janko/score-rendering-recipe';

import {ANNOTATION_INK_POLICY} from './annotation-ink-policy';

export const PIANO_PREPARATION_IDENTITY_VERSION='viewer-piano-preparation-v3' as const;
const ENGINE_IDENTITY_VERSION='viewer-piano-preparation-v2' as const;
const LEGACY_IDENTITY_VERSION='viewer-piano-preparation-v1' as const;
export interface PianoPreparationIdentity {
  version:typeof PIANO_PREPARATION_IDENTITY_VERSION|typeof ENGINE_IDENTITY_VERSION|typeof LEGACY_IDENTITY_VERSION;
  sourceSha256:string;layoutId:'conventional-piano'|'janko-four-row';profileId:string;profileSha256:string;
  handPolicy:PerformingHandPolicy;maxExpansions:number;
  contextSha256:string;authoritySha256:string;assignmentSha256:string;calculatorSha256:string;
  recipeSha256:string|null;payloadSha256:string;requestSha256:string;sha256:string;
}
/** Object order is incidental; array order remains meaningful by default. */
export function canonicalJson(value:unknown):string {
  const visit=(v:any):any=>Array.isArray(v)?v.map(visit):v&&typeof v==='object'?
    Object.fromEntries(Object.keys(v).sort().filter(k=>v[k]!==undefined).map(k=>[k,visit(v[k])])):v;
  return JSON.stringify(visit(value));
}
export const identityHash=async(value:unknown)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonicalJson(value))))).map(n=>n.toString(16).padStart(2,'0')).join('');
const bytesHash=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(n=>n.toString(16).padStart(2,'0')).join('');
const canonicalConstraints=(constraints:readonly PianoAssignmentConstraint[])=>[...new Set(constraints.map(canonicalJson))].sort();
export const authorityIdentity=(constraints:readonly PianoAssignmentConstraint[])=>identityHash(canonicalConstraints(constraints));
export function canonicalOwnerAssignments(layer:FingerLayer):unknown[] {
  return layer.attacks.flatMap(a=>a.owners.map(o=>({id:o.id,hand:a.hand,finger:a.finger,
    ...(a.row===undefined?{}:{row:a.row}),...(a.contact===undefined?{}:{contact:a.contact})}))).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
}
export async function preparationRequestIdentity(p:ScorePackage,policy:PerformingHandPolicy,constraints:readonly PianoAssignmentConstraint[],maxExpansions=2_000_000):Promise<string>{
  return requestIdentity(p,policy,constraints,maxExpansions,PIANO_PREPARATION_IDENTITY_VERSION);
}
async function requestIdentity(p:ScorePackage,policy:PerformingHandPolicy,constraints:readonly PianoAssignmentConstraint[],maxExpansions:number,version:PianoPreparationIdentity['version']):Promise<string>{
  const source=scoreWithCalculationContext(p.sourceScore??p.score,p.calculationContext,p.sourceSha256??p.manifest.semanticSha256);
  return identityHash({sourceSha256:p.sourceSha256,layoutId:p.keyboardLayout,profileId:p.profileId,profileSha256:p.profileSha256,
    contextSha256:await identityHash({referencePerformanceTempo:source.referencePerformanceTempo,calculationContext:p.calculationContext,
      ...(version===PIANO_PREPARATION_IDENTITY_VERSION?{annotationInkPolicy:ANNOTATION_INK_POLICY}:{})}),
    handPolicy:policy,authoritySha256:await authorityIdentity(constraints),maxExpansions,
    rendering:{recipe:p.renderingRecipe??null,installedEngine:p.manifest.engineVersion,approvedEngine:APPROVED_SCORE_RENDERING_ENGINE,
      ...(version===LEGACY_IDENTITY_VERSION?{}:{calculatedEngine:CALCULATED_HAND_SCORE_RENDERING_ENGINE}),
      ...(version===PIANO_PREPARATION_IDENTITY_VERSION?{annotationInkPolicy:ANNOTATION_INK_POLICY}:{})}});
}
/** Compatibility metadata does not establish painted/source coverage. The
 * package and ISO's actual source/geometry validators must admit that first. */
export async function createPianoPreparationIdentity(p:ScorePackage,policy:PerformingHandPolicy,maxExpansions=2_000_000):Promise<PianoPreparationIdentity>{
  return createIdentity(p,policy,maxExpansions,PIANO_PREPARATION_IDENTITY_VERSION);
}
async function createIdentity(p:ScorePackage,policy:PerformingHandPolicy,maxExpansions:number,version:PianoPreparationIdentity['version']):Promise<PianoPreparationIdentity>{
  if(!p.sourceSha256||!p.keyboardLayout||!p.profileId||!p.profileSha256||!p.fingerLayer)
    throw Error('Preparation identity needs complete source, keyboard, profile and assignments.');
  if(!['calculate','retain-imported'].includes(policy)||!Number.isSafeInteger(maxExpansions)||maxExpansions<1)
    throw Error('Preparation identity has an unsupported calculation policy.');
  const source=scoreWithCalculationContext(p.sourceScore??p.score,p.calculationContext,p.sourceSha256),
    constraints=pianoRequestAuthority(p,source,p.keyboardLayout,p.fingerLayer,undefined,policy);
  if(policy==='calculate'&&Array.isArray(p.fingerLayer.operatorConstraints)&&
    p.fingerLayer.operatorConstraints.some((q:any)=>q?.provenance?.kind==='editorial-hand-retention'))
    throw Error('A retained-hand layer cannot claim joint-hand preparation.');
  const content={version,sourceSha256:p.sourceSha256,layoutId:p.keyboardLayout,
    profileId:p.profileId,profileSha256:p.profileSha256,handPolicy:policy,maxExpansions,
    contextSha256:await identityHash({referencePerformanceTempo:source.referencePerformanceTempo,calculationContext:p.calculationContext,
      ...(version===PIANO_PREPARATION_IDENTITY_VERSION?{annotationInkPolicy:ANNOTATION_INK_POLICY}:{})}),
    authoritySha256:await authorityIdentity(constraints),assignmentSha256:await identityHash(canonicalOwnerAssignments(p.fingerLayer)),
    calculatorSha256:await identityHash({version:p.fingerLayer.version,plannerVersion:p.fingerLayer.plannerVersion,
      inputSha256:p.fingerLayer.inputSha256,search:p.fingerLayer.search}),
    recipeSha256:p.renderingRecipe?await identityHash(p.renderingRecipe):null,
    payloadSha256:await identityHash({scoreSha256:p.manifest.revision,seats:p.seats,pageSha256:await Promise.all(p.pages.map(bytesHash))}),
    requestSha256:await requestIdentity(p,policy,constraints,maxExpansions,version)};
  return{...content,sha256:await identityHash(content)};
}
export async function validatePianoPreparationIdentity(raw:unknown,p:ScorePackage):Promise<PianoPreparationIdentity>{
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid piano preparation identity.');
  const q=raw as PianoPreparationIdentity;
  if(q.version!==PIANO_PREPARATION_IDENTITY_VERSION&&q.version!==ENGINE_IDENTITY_VERSION&&q.version!==LEGACY_IDENTITY_VERSION)throw Error('Unsupported piano preparation identity.');
  if(q.version===LEGACY_IDENTITY_VERSION&&(p.score.performingHandPresentation||p.renderingRecipe?.engineId===CALCULATED_HAND_SCORE_RENDERING_ENGINE))
    throw Error('A calculated-hand edition cannot use the legacy preparation identity.');
  const expected=await createIdentity(p,q.handPolicy,q.maxExpansions,q.version);
  if(canonicalJson(q)!==canonicalJson(expected))throw Error('Piano preparation identity differs from its actual source, assignments or presentation.');
  return structuredClone(expected);
}
