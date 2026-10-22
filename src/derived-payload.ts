import {deflateSync,strToU8} from 'fflate';

/** One derived-file payload as the cache stores it: its JSON's digest and
 * length, and the deflated bytes. Made wherever the value lives, so a large
 * value (a settled engine) is serialized and compressed on the thread that
 * holds it, not the reader's. */
export interface EncodedDerivedPayload {payloadSha256:string;payloadBytes:number;body:Uint8Array}
export async function encodeDerivedPayload(value:unknown):Promise<EncodedDerivedPayload>{
 const payload=strToU8(JSON.stringify(value)),digest=new Uint8Array(await crypto.subtle.digest('SHA-256',payload));
 return {payloadSha256:Array.from(digest,n=>n.toString(16).padStart(2,'0')).join(''),payloadBytes:payload.byteLength,body:deflateSync(payload,{level:1})};
}
