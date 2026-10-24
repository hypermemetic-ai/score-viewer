import {readFileSync} from 'node:fs';

/**
 * A source-check receipt is copied byte for byte into the public seal, so it
 * names no one's files or private scores. A score is named by a public studio
 * id (`public-score-ids.json`) or as the literal "a private score"; a data
 * copy as "a private data copy".
 *
 * Where a receipt names scores, the rule is positive: a map keyed by score
 * (any key that is not a field name or a relative path) and the fields below
 * hold only public ids or "a private score". Free text is not read for titles;
 * it is refused for home and user-profile paths, private data copies and
 * score archives outside `fixtures/`. `SCORE_VIEWER_PRIVATE_SCORE_NAMES` may
 * name a local file of further names, one per line, that is never committed;
 * any of them anywhere is refused. No private name, nor any digest of one, is
 * kept in this repository. A refusal says what kind of name was found and
 * where, never the name: a location shows a key only when it is a field name.
 */
const PUBLIC=new Set(JSON.parse(readFileSync(new URL('./public-score-ids.json',import.meta.url),'utf8')).ids);
const PRIVATE=/^a private score(?: [1-9][0-9]*)?$/;
const NAME_FIELDS=new Set(['score','scores','title','titles','piece','pieces','work','works','composer','composers','entryId','libraryId']);
const FIELD=/^[A-Za-z][A-Za-z0-9]*$/,RELATIVE_PATH=/^[\w.-]+(?:\/[\w.-]+)+$/;
const PATHS=[
  [/(?:^|[\s"'`(=:])\/home\/[^\s/"'`]+/,'a home directory path'],
  [/(?:^|[\s"'`(=:])\/Users\/[^\s/"'`]+/,'a user directory path'],
  [/\b[A-Za-z]:[\\/]+Users[\\/]/i,'a Windows user directory path'],
  [/%USERPROFILE%|\$env:USERPROFILE|\$HOME\b/i,'a user directory path'],
  [/~[\\/]\.(?:local|config)\b/,'a per-user state path'],
  [/owner-data/i,'a private data copy path'],
  [/(?:^|[\s"'`(=:])(?:\/|~|[A-Za-z]:[\\/])(?![^\s"'`]*\bfixtures[\\/])[^\s"'`]*\.tuna\b/,'a score archive path outside fixtures/'],
];
const UNLISTED='a score name that is not a public studio id (write "a private score" or a public studio id)';
/** Lower case, accents dropped, every run of other characters one space. */
export const normalizeName=name=>name.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const publicName=name=>PUBLIC.has(name)||PRIVATE.test(name);
function localNames(){
  const file=process.env.SCORE_VIEWER_PRIVATE_SCORE_NAMES;if(!file)return [];
  return readFileSync(file,'utf8').split(/\r?\n/).map(line=>line.trim()).filter(line=>line&&!line.startsWith('#')).map(normalizeName).filter(Boolean);
}
/** Every string with its location and whether it names a score; a key is located by position unless it is a field name. */
function* strings(value,path='$',naming=false){
  if(typeof value==='string')yield {where:path,text:value,naming};
  else if(Array.isArray(value))for(const [i,v] of value.entries())yield* strings(v,`${path}[${i}]`,naming);
  else if(value&&typeof value==='object')for(const [i,[k,v]] of Object.entries(value).entries()){
    const field=FIELD.test(k),where=field?`${path}.${k}`:`${path}{key ${i}}`;
    yield {where:`${where} (key)`,text:k,naming:!field&&!RELATIVE_PATH.test(k)};
    yield* strings(v,where,NAME_FIELDS.has(k));
  }
}
/** Every privacy problem in a parsed receipt, as `{where, kind}`; empty when it is public. */
export function receiptPrivacyProblems(receipt){
  const local=localNames(),problems=[];
  for(const {where,text,naming} of strings(receipt)){
    for(const [pattern,kind] of PATHS)if(pattern.test(text))problems.push({where,kind});
    if(naming&&!publicName(text))problems.push({where,kind:UNLISTED});
    const words=` ${normalizeName(text)} `;
    if(local.some(name=>words.includes(` ${name} `)))problems.push({where,kind:'a name on the local private list'});
  }
  return problems;
}
/** Refuse a receipt that would publish a private name or path. */
export function refusePrivateReceipt(receipt){
  const problems=receiptPrivacyProblems(receipt);
  if(problems.length)throw Error('Source-check receipt is not public: '+problems.map(p=>`${p.kind} at ${p.where}`).join('; '));
}
