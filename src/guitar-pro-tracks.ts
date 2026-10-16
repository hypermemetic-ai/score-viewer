import {guitarProFamilyRefusal,type GuitarProInspection} from './guitar-pro-types';
const escape=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
/** Discovery offers source tracks, not fabricated admitted instruments. */
export function guitarProTracksMarkup(inspection:GuitarProInspection){
 return `<h2>Import source parts</h2><div class="gp-source-tracks">${inspection.tracks.map(track=>{
  // A described non-guitar/bass family only withholds a part; it never grants one.
  const family=track.instrument.family,other=family&&family!=='guitar'&&family!=='bass'?guitarProFamilyRefusal(family,'fretted'):undefined,
   available=!other&&track.metadataEligibility.status==='eligible',reason=other??track.metadataEligibility.findings.find(f=>f.disposition==='blocking')?.message;
  return `<label class="gp-source-track" data-options-row><input type="checkbox" data-gp-track="${escape(track.sourceId)}" ${available?'checked':'disabled'}><span>${escape(track.sourceName?.value??`Track ${track.sourceId}`)}${available?'':`<small>${escape(reason??'This source part is not supported.')}</small>`}</span></label>`;
 }).join('')}</div><div class="dialog-actions"><button data-gp-import>Import</button><button data-gp-cancel>Cancel <kbd>Esc</kbd></button></div><p class="control-error" role="alert" data-gp-error></p>`;
}
