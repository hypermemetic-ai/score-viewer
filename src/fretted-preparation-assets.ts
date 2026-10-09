import fontData from './URWGothic-Demi.otf?inline';
import copying from '../licenses/URW-base35-COPYING?raw';
import license from '../licenses/URW-base35-LICENSE?raw';
import provenance from '../licenses/URW-base35-provenance.md?raw';
/** Complete public assets are compiled into the intake module. No new native
 * network/CSP permission is needed; the receiver still checks every pin. */
export async function frettedPreparationAssets(signal?:AbortSignal){
 if(signal?.aborted)throw new DOMException('Reading preparation was cancelled.','AbortError');
 const encoded=fontData.match(/^data:[^,]*;base64,([A-Za-z0-9+/=]+)$/)?.[1];if(!encoded)throw Error('Required notation font is unavailable.');
 const font=Uint8Array.from(atob(encoded),character=>character.charCodeAt(0)),encoder=new TextEncoder();
 return {font:{name:'fonts/URWGothic-Demi.otf',bytes:font},notices:{
  'licenses/URW-base35-COPYING':encoder.encode(copying),'licenses/URW-base35-LICENSE':encoder.encode(license),
  'licenses/URW-base35-provenance.md':encoder.encode(provenance)}};
}
