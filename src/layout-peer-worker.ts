/// <reference lib="webworker" />
// The second core's worker for an engrave's first layout pass (layout-peer.ts).
import {serveLayoutPeer} from '../vendor/iso-notation/src/score-presentation';

const scope=self as unknown as DedicatedWorkerGlobalScope;
const handle=serveLayoutPeer(reply=>scope.postMessage(reply));
scope.onmessage=(event:MessageEvent)=>handle(event.data);
