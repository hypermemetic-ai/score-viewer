import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

/**
 * A source-check receipt is copied byte for byte into the public seal, so it
 * names no one's files or private scores. Scores are named by public studio
 * ids (as `fixtures/` and the notation's public scores name them) or as the
 * literal "a private score"; data copies as "a private data copy".
 *
 * Refused: home and user-profile paths, private data copies and score
 * archives outside `fixtures/`, and any name on the deny-list. The deny-list
 * holds salted SHA-256 digests of normalized names, so it prints none of them;
 * `SCORE_VIEWER_PRIVATE_SCORE_NAMES` may name a local file of further names,
 * one per line, that is never committed. A refusal says what kind of name was
 * found and where, never the name.
 */
const SALT='score-viewer/receipt-privacy/1\0';
const DENIED=new Set(JSON.parse(readFileSync(new URL('./private-score-names.json',import.meta.url),'utf8')).digests);
const PATHS=[
  [/(?:^|[\s"'`(=:])\/home\/[^\s/"'`]+/,'a home directory path'],
  [/(?:^|[\s"'`(=:])\/Users\/[^\s/"'`]+/,'a user directory path'],
  [/\b[A-Za-z]:[\\/]+Users[\\/]/i,'a Windows user directory path'],
  [/%USERPROFILE%|\$env:USERPROFILE|\$HOME\b/i,'a user directory path'],
  [/~[\\/]\.(?:local|config)\b/,'a per-user state path'],
  [/owner-data/i,'a private data copy path'],
  [/(?:^|[\s"'`(=:])(?:\/|~|[A-Za-z]:[\\/])(?![^\s"'`]*\bfixtures[\\/])[^\s"'`]*\.tuna\b/,'a score archive path outside fixtures/'],
];
/** Lower case, accents dropped, every run of other characters one space. */
export const normalizeName=name=>name.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export const nameDigest=name=>createHash('sha256').update(SALT+normalizeName(name)).digest('hex');
const MAX_WORDS=8;
function localDigests(){
  const file=process.env.SCORE_VIEWER_PRIVATE_SCORE_NAMES;if(!file)return [];
  return readFileSync(file,'utf8').split(/\r?\n/).map(line=>line.trim()).filter(line=>line&&!line.startsWith('#')).map(nameDigest);
}
function* strings(value,path='$'){
  if(typeof value==='string')yield [path,value];
  else if(Array.isArray(value))for(const [i,v] of value.entries())yield* strings(v,`${path}[${i}]`);
  else if(value&&typeof value==='object')for(const [k,v] of Object.entries(value)){yield [`${path} (key)`,k];yield* strings(v,`${path}.${k}`);}
}
/** Every privacy problem in a parsed receipt, as `{where, kind}`; empty when it is public. */
export function receiptPrivacyProblems(receipt){
  const denied=new Set([...DENIED,...localDigests()]),problems=[];
  for(const [where,text] of strings(receipt)){
    for(const [pattern,kind] of PATHS)if(pattern.test(text))problems.push({where,kind});
    const words=normalizeName(text).split(' ').filter(Boolean);let named=false;
    for(let i=0;i<words.length&&!named;i++)for(let n=1;n<=MAX_WORDS&&i+n<=words.length;n++)if(denied.has(nameDigest(words.slice(i,i+n).join(' ')))){named=true;break;}
    if(named)problems.push({where,kind:'a private score name (write "a private score" or a public studio id)'});
  }
  return problems;
}
/** Refuse a receipt that would publish a private name or path. */
export function refusePrivateReceipt(receipt){
  const problems=receiptPrivacyProblems(receipt);
  if(problems.length)throw Error('Source-check receipt is not public: '+problems.map(p=>`${p.kind} at ${p.where}`).join('; '));
}
