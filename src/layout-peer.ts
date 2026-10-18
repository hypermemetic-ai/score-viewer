import type {LayoutPeerPort} from '../vendor/iso-notation/src/score-presentation';

/** A worker that lays systems out alongside an engrave, with how to stop it. */
export type LayoutPeer=LayoutPeerPort&{terminate():void};
export type StartLayoutPeer=()=>LayoutPeer|undefined;

/** A second worker for an engrave's first layout pass, when the machine
 * reports two or more cores. The engrave never waits for it: a worker that
 * cannot start, fails or is slow leaves the one-worker engrave and its same
 * pages. */
export const startLayoutPeer:StartLayoutPeer=()=>{
 if(typeof Worker!=='function'||!((globalThis.navigator?.hardwareConcurrency??1)>=2))return undefined;
 try{
  const worker=new Worker(new URL('./layout-peer-worker.ts',import.meta.url),{type:'module'});
  // A worker that fails to load never answers; the engrave goes on alone.
  worker.addEventListener('error',event=>{event.preventDefault();worker.terminate();});
  return worker;
 }catch{return undefined;}
};

/** Runs one engrave with a layout peer when one starts, and stops the peer
 * when the engrave ends, so it holds no memory between engraves. */
export async function withLayoutPeer<T>(run:(layoutPeer:LayoutPeerPort|undefined)=>Promise<T>,start:StartLayoutPeer=startLayoutPeer):Promise<T>{
 const peer=start();
 try{return await run(peer);}finally{peer?.terminate();}
}
