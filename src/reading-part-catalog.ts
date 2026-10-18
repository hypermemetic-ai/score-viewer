import {guitarProContext,type GuitarProContext} from './guitar-pro-provider';
import {admittedDualArchiveSha256,type ScorePackage} from './package';
import {collectionId,type Entry} from './state';
import {scoreFileSha256} from './score-file-name';

const escape=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export const sourcePartLabel=(context:GuitarProContext)=>`${context.family==='bass'?'Bass':'Guitar'}${context.sourceName?` · ${context.sourceName}`:` · Track ${context.sourceTrackId}`}`;
/** A descriptive library hint never becomes family authority. Records are
 * populated only from actual public receiving contexts and exact archives. */
export class ReadingPartCatalog {
 #entries=new Map<string,{file:string;context:GuitarProContext}>();
 remember(entry:Entry,p:ScorePackage){
  const context=guitarProContext(p);if(!context)return;
  if(collectionId(p)!==entry.id||scoreFileSha256(entry.file)!==admittedDualArchiveSha256(p))throw Error('Source part differs from its exact managed archive.');
  this.#entries.delete(entry.id);this.#entries.set(entry.id,{file:entry.file,context});
  while(this.#entries.size>64)this.#entries.delete(this.#entries.keys().next().value!);return context;
 }
 context(entry:Entry){const record=this.#entries.get(entry.id);return record?.file===entry.file?record.context:undefined;}
 summary(entry:Entry){const context=this.context(entry);return context?sourcePartLabel(context):entry.guitarPro?`Prepare source part · ${entry.guitarPro.sourceName??`Track ${entry.guitarPro.sourceTrackId}`}`:'';}
 siblings(entries:readonly Entry[],selected:Entry){
  const actual=this.context(selected);if(!actual)return [];
  return entries.filter(entry=>{const context=this.context(entry);return context?context.groupId===actual.groupId&&context.inputSha256===actual.inputSha256:
   entry.guitarPro?.groupId===actual.groupId&&entry.guitarPro.inputSha256===actual.inputSha256;});
 }
 control(entries:readonly Entry[],selected:Entry){
  if(!this.context(selected))return '<span class="reading-instrument" aria-label="Instrument">Unknown instrument</span>';
  return `<select name="readingPart" data-reading-part aria-label="Instrument">${this.siblings(entries,selected).map(entry=>
   `<option value="${entry.id}"${entry.id===selected.id?' selected':''}>${escape(this.summary(entry))}</option>`).join('')}</select>`;
 }
}
