/// <reference lib="webworker" />
import {createProjectionHost} from './personal-projection-host';
import type {ProjectionRequest} from './personal-projection-protocol';

const scope=self as unknown as DedicatedWorkerGlobalScope;
const host=createProjectionHost(response=>scope.postMessage(response));
scope.onmessage=(event:MessageEvent<ProjectionRequest>)=>{void host.handle(event.data);};
// A request that cannot be read has no id to answer: fail the worker, so the
// reader's client treats every waiting request as lost rather than waiting.
scope.onmessageerror=()=>{setTimeout(()=>{throw Error('The hand drawing worker received an unreadable request.');});};
