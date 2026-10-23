import {deflateSync,inflateSync,strToU8} from 'fflate';

/** One derived-file payload as the cache stores it: its JSON's digest and
 * length, and the deflated bytes. Made wherever the value lives, so a large
 * value (a settled engine) is serialized and compressed on the thread that
 * holds it, not the reader's. */
export interface EncodedDerivedPayload {payloadSha256:string;payloadBytes:number;body:Uint8Array}
export async function encodeDerivedPayload(value:unknown):Promise<EncodedDerivedPayload>{
 const payload=strToU8(JSON.stringify(value)),digest=new Uint8Array(await crypto.subtle.digest('SHA-256',payload));
 return {payloadSha256:Array.from(digest,n=>n.toString(16).padStart(2,'0')).join(''),payloadBytes:payload.byteLength,body:deflateSync(payload,{level:1})};
}
/** The value an encoded payload holds, checked against its own length and
 * digest: undefined when the bytes are not exactly what was encoded. Run on
 * the thread that uses the value (a settled engine is restored in the hand
 * drawing worker), so the reader's thread never inflates or parses it. */
export async function decodeDerivedPayload(encoded:EncodedDerivedPayload,maxBytes=256*1024*1024):Promise<unknown>{
 try{
  if(!Number.isSafeInteger(encoded.payloadBytes)||encoded.payloadBytes<2||encoded.payloadBytes>maxBytes)return;
  const payload=inflateSync(encoded.body,{out:new Uint8Array(encoded.payloadBytes)});
  if(payload.byteLength!==encoded.payloadBytes)return;
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',payload)),n=>n.toString(16).padStart(2,'0')).join('');
  if(digest!==encoded.payloadSha256)return;
  return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(payload));
 }catch{return;}
}
