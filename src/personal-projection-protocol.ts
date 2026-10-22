import type {PersonalHandEngineState,PersonalOwnerHand,PresentationAnnotationGeometry,PresentationSeat,PreparationStage,ScoreRenderingRecipe} from '../vendor/iso-notation/src/score-presentation';
import type {QuantizedGridScore} from '../vendor/iso-notation/src/model/types';
import type {EncodedDerivedPayload} from './derived-payload';

/** Everything a projection core is made from. Its identity is the caller's
 * digest of the captured package, never a claim made by the worker. */
export interface ProjectionCoreInputs {source:QuantizedGridScore;baseline:QuantizedGridScore;recipe:ScoreRenderingRecipe}
/** The parts of one personal projection the reader displays. */
export interface ProjectionView {score:QuantizedGridScore;pages:string[];seats:PresentationSeat[];annotationGeometry:PresentationAnnotationGeometry}
/** `warm` may carry an engine this build saved for the same core: the
 * worker resumes from it when it reproduces, and engraves otherwise. `save`
 * asks for the core's settled engine, encoded here for the reader's disk
 * cache, so the reader's thread neither copies nor serializes it. */
export type ProjectionRequest={id:number;key:string;create?:ProjectionCoreInputs}&(
 {kind:'warm';saved?:PersonalHandEngineState}|{kind:'project';owners:PersonalOwnerHand[];digest:string}|{kind:'save'});
export interface SerializedProjectionError {name:string;message:string;code?:string;ownerIds?:string[];context?:Record<string,unknown>}
export type ProjectionResponse=
 {id:number;kind:'stage';stage:PreparationStage}|
 {id:number;kind:'missing'}|
 /** A warm says how it settled: from the saved engine, by engraving, or not
  * at all because the core had already settled. */
 {id:number;kind:'done';view?:ProjectionView;settled?:'restored'|'engraved'|'already';engine?:EncodedDerivedPayload}|
 {id:number;kind:'error';error:SerializedProjectionError};
