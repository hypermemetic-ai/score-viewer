import type {PianoReadinessRequest,PianoReadinessResult} from './piano-readiness';
import type {PianoCalculationOptions} from '../vendor/iso-notation/src/model/piano-finger-calculation';

export type PianoReadinessWorkerRequest=Omit<PianoReadinessRequest,'signal'|'onProgress'>;
export type PianoReadinessWorkerResult=
  |Omit<Extract<PianoReadinessResult,{status:'ready'|'editable'}>,'package'>
  |Omit<Exclude<PianoReadinessResult,{status:'ready'|'editable'}>,'retainedPackage'>;
export type PianoReadinessWorkerMessage=
  |{type:'progress';progress:Parameters<NonNullable<PianoCalculationOptions['onProgress']>>[0]}
  |{type:'complete';result:PianoReadinessWorkerResult};

/** A ScorePackage's admitted companion registry is realm-local. Only inert
 * archive/layer/state data crosses the worker boundary; the reader reimports. */
export function readinessWorkerResult(result:PianoReadinessResult):PianoReadinessWorkerResult {
  if('package' in result){
    const {package:_,...wire}=result;return wire;
  }
  const {retainedPackage:_,...wire}=result;return wire;
}
