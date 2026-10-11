import {createPersonalHandProjection,type OwnerHand} from '../vendor/iso-notation/src/score-presentation';
import {scoreWithCalculationContext} from '../vendor/iso-notation/src/model/piano-calculation-context';
import {calculatedRecipeForRequest} from './calculated-hand-edition';
import {effectiveAssignments} from './personal-assignments';
import {hashBytes,type ScorePackage} from './package';
import type {PersonalState} from './state';

/** A reader session owns detached views; the admitted package remains the source
 * of storage, calculation, personal-owner validation and durable identity. */
export class PersonalPresentationSession {
 private preparation?:Promise<ReturnType<typeof createPersonalHandProjection>>;
 private lastKey?:string;
 private lastView?:ScorePackage;
 constructor(private readonly base:ScorePackage){}
 async project(personal:PersonalState):Promise<ScorePackage>{
  const owners:OwnerHand[]=effectiveAssignments(this.base,personal).map(({id,pitch,startTick,durationTicks,hand})=>({id,pitch,startTick,durationTicks,hand}));
  if(owners.every(a=>this.base.score.notes.find(n=>n.id===a.id)?.hand===a.hand))return this.base;
  const key=JSON.stringify(owners);
  if(key===this.lastKey&&this.lastView)return this.lastView;
  this.preparation??=(async()=>{
   const recipe=await calculatedRecipeForRequest(this.base),source=scoreWithCalculationContext(this.base.sourceScore??this.base.score,
    this.base.calculationContext,this.base.sourceSha256??this.base.manifest.semanticSha256);
   return createPersonalHandProjection(source,this.base.score,recipe);
  })();
  const [session,digest]=await Promise.all([this.preparation,hashBytes(key)]),result=session.project(owners,digest);
  // Archive bytes, manifest, original source, receipts and fingering evidence are
  // retained verbatim. This object is a transient reading, never package admission.
  const view:ScorePackage={...this.base,score:result.score,pages:result.pages,seats:result.seats,annotationGeometry:result.annotationGeometry};
  this.lastKey=key;this.lastView=view;return view;
 }
}
