import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DOMParser} from '@xmldom/xmldom';
import {renderOttavaGlyph,OTTAVA_LABELS} from '../vendor/iso-notation/src/render/iso/elements/ottava';
import {URTEXT_SERIF} from '../vendor/iso-notation/src/render/iso/elements/style';

test('all four ottava labels serialize valid XML with the intended quoted serif family',()=>{
 for(const kind of ['up10','up20','down10','down20'] as const){
  const errors:string[]=[],svg=`<svg xmlns="http://www.w3.org/2000/svg">${renderOttavaGlyph(kind,12,34)}</svg>`,doc=new DOMParser({onError:(_level,message)=>errors.push(message)}).parseFromString(svg,'image/svg+xml');
  assert.deepEqual(errors,[]);const text=doc.getElementsByTagName('text')[0];assert.equal(text.getAttribute('font-family'),URTEXT_SERIF);assert.equal(text.textContent,OTTAVA_LABELS[kind]);assert.equal(text.getAttribute('data-ottava-kind'),kind);assert.equal(Number(text.getAttribute('x')),12);assert.equal(text.getAttribute('font-style'),'italic');
 }
});
