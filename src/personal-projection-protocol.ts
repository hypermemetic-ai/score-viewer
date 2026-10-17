import type {PersonalOwnerHand,PresentationAnnotationGeometry,PresentationSeat,PreparationStage,ScoreRenderingRecipe} from '../vendor/iso-notation/src/score-presentation';
import type {QuantizedGridScore} from '../vendor/iso-notation/src/model/types';

/** Everything a projection core is made from. Its identity is the caller's
 * digest of the captured package, never a claim made by the worker. */
export interface ProjectionCoreInputs {source:QuantizedGridScore;baseline:QuantizedGridScore;recipe:ScoreRenderingRecipe}
/** The parts of one personal projection the reader displays. */
export interface ProjectionView {score:QuantizedGridScore;pages:string[];seats:PresentationSeat[];annotationGeometry:PresentationAnnotationGeometry}
export type ProjectionRequest={id:number;key:string;create?:ProjectionCoreInputs}&(
 {kind:'warm'}|{kind:'project';owners:PersonalOwnerHand[];digest:string});
export interface SerializedProjectionError {name:string;message:string;code?:string;ownerIds?:string[];context?:Record<string,unknown>}
export type ProjectionResponse=
 {id:number;kind:'stage';stage:PreparationStage}|
 {id:number;kind:'missing'}|
 {id:number;kind:'done';view?:ProjectionView}|
 {id:number;kind:'error';error:SerializedProjectionError};
