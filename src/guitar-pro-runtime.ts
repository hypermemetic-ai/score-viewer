import type * as PublicGuitarPro from 'score-converter-proof/guitar-pro/webview';
/** These unchanged assets are emitted from the resolved supported package export.
 * Native platform acceptance must exercise this same origin and Worker graph. */
export function guitarProPublicEntryUrl(){return new URL((import.meta.env?.BASE_URL??'./')+'converter/gp/index.js',location.href).href;}
let runtime:Promise<typeof PublicGuitarPro>|undefined;
export function guitarProRuntime():Promise<typeof PublicGuitarPro>{
 return runtime??=import(/* @vite-ignore */ guitarProPublicEntryUrl()).catch(error=>{runtime=undefined;throw error;});
}
