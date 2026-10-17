/// <reference lib="webworker" />
import {createProjectionHost} from './personal-projection-host';
import type {ProjectionRequest} from './personal-projection-protocol';

const scope=self as unknown as DedicatedWorkerGlobalScope;
const host=createProjectionHost(response=>scope.postMessage(response));
scope.onmessage=(event:MessageEvent<ProjectionRequest>)=>{void host.handle(event.data);};
