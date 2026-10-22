import type {Metadata} from './package';

/** How a work is named everywhere the viewer names it: composer, then the
 * catalogue the composer's works are known by (Op., BWV, K., D., ...), then
 * the number within that catalogue entry, then the piece's own title. */
export interface WorkName {composer:string;catalogue?:string;catalogueNumber?:number;collection?:string;number?:number;title:string}

const CATALOGUES='Op\\.|BWV|KV|K\\.|D\\.|Hob\\.|WoO|HWV|RV|Sz\\.|S\\.|L\\.';
// "Goldberg Variations, BWV 988: Variatio 1" or "Album für die Jugend, Op. 68, No. 13: Mai".
const titled=new RegExp(`^(.+?),\\s*((?:${CATALOGUES})\\s*\\d[\\w./]*)(?:,?\\s*(?:No\\.|Nr\\.)\\s*(\\d+))?(?::\\s*(.+))?$`);
// "Op. 68, No. 13" as MusicXML writes a work number.
const workNumber=new RegExp(`^((?:${CATALOGUES})\\s*\\d[\\w./]*)(?:,?\\s*(?:No\\.|Nr\\.)\\s*(\\d+))?$`);

/** "Op.68" and "Op. 68" are one catalogue entry. */
const spaced=(label:string|undefined)=>label?.trim().replace(/\s+/g,' ').replace(/^(\D*?\.)(?=\d)/,'$1 ');
const firstNumber=(label:string)=>{const n=/\d+/.exec(label);return n?Number(n[0]):undefined;};
/** A leading "Nr. 14 ·" repeats the number the catalogue already shows; "No. 1 in B-flat" is a title. */
const withoutNumber=(title:string,number:number)=>title.replace(new RegExp(`^(?:Nr\\.|No\\.|Nº|N\\.)\\s*${number}(?!\\d)\\s*[·.:,–—-]\\s*`,'i'),'').trim()||title;

export function workName(m:Metadata):WorkName {
 const composer=(m.composer??'').trim();
 let catalogue=spaced(m.opusLabel)||(m.opus!==undefined?`Op. ${m.opus}`:undefined),number=m.piece,collection:string|undefined,title=(m.title??'').trim();
 if(!catalogue){const t=titled.exec(title);if(t){collection=t[1].trim();catalogue=spaced(t[2])!;number=t[3]?Number(t[3]):number;title=t[4]?.trim()||collection;if(title===collection)collection=undefined;}}
 if(number!==undefined)title=withoutNumber(title,number);
 return {composer,...(catalogue?{catalogue,catalogueNumber:m.opus??firstNumber(catalogue)}:{}),...(collection?{collection}:{}),...(number!==undefined?{number}:{}),title};
}

/** "Op. 68, No. 14", or the catalogue alone; empty for an uncatalogued work. */
export function catalogueLine(name:WorkName){return [name.catalogue,name.number!==undefined?`No. ${name.number}`:undefined].filter(Boolean).join(', ');}
/** Catalogue entry heading in the library: "Op. 68" or "BWV 988 · Goldberg Variations". */
export function catalogueHeading(name:WorkName){return [name.catalogue,name.collection].filter(Boolean).join(' · ');}
/** A work named within a sentence: composer › catalogue › number ("Robert
 * Schumann › Op. 68 › No. 13"), with its own title instead of a number when it
 * has none ("J. S. Bach › BWV 988 › Variatio 1. a 1 Clav."). */
export function workReference(m:Metadata){const name=workName(m);return [name.composer,name.catalogue,name.number!==undefined?`No. ${name.number}`:name.title].filter(Boolean).join(' › ');}
/** Composer, catalogue and number in reading order, before the title. */
export function workContext(name:WorkName){return [name.composer,catalogueLine(name)].filter(Boolean).join(' · ');}

/** "Op." of "Op. 68": Op. and WoO works, or Op. and D. numbers, are separate runs. */
const catalogueSystem=(name:WorkName)=>/^\D*/.exec(name.catalogue??'')![0].trim();
/** Composer, then catalogued works by catalogue and number, then the rest by title. */
export function workOrder(a:Metadata,b:Metadata){
 const x=workName(a),y=workName(b);
 return (!x.composer?1:0)-(!y.composer?1:0)||x.composer.localeCompare(y.composer)
  ||(x.catalogue?0:1)-(y.catalogue?0:1)||catalogueSystem(x).localeCompare(catalogueSystem(y))||(x.catalogueNumber??0)-(y.catalogueNumber??0)||(x.catalogue??'').localeCompare(y.catalogue??'',undefined,{numeric:true})
  ||((x.number??Infinity)-(y.number??Infinity)||0)||x.title.localeCompare(y.title);
}

/** A MusicXML work number such as "Op. 68, No. 13". A movement number is not
 * a number within the catalogue entry (a sonata's second movement is not No. 2). */
export function musicXmlCatalogue(workNumberText:string|undefined):Pick<Metadata,'opus'|'opusLabel'|'piece'> {
 const w=workNumber.exec(workNumberText?.trim()??'');if(!w)return {};
 const opusLabel=w[1].replace(/\s+/g,' '),piece=w[2]?Number(w[2]):undefined;
 return {opusLabel,...(/^Op\./.test(opusLabel)&&firstNumber(opusLabel)!==undefined?{opus:firstNumber(opusLabel)}:{}),...(piece!==undefined?{piece}:{})};
}

const escape=(text:string)=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
/** Heading content: the muted composer and catalogue line, then the title. */
export function workHeadingMarkup(m:Metadata){const name=workName(m),context=workContext(name);return `${context?`<span class="work-context">${escape(context)}</span>`:''}<span class="work-title">${escape(name.title)}</span>`;}
