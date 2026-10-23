import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import {defaultView,EDITOR_COLUMN,EDITOR_GUTTER,readerFit,viewportFit,type ViewState} from '../src/state';

const source=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8');
const production=(start:string,end:string)=>stripTypeScriptTypes(source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start))));
const view=(change:Partial<ViewState>={}):ViewState=>({...defaultView(),...change});
const page=595.276,gap=12;
/** Page edges on screen, in the surface's own (rotated) pixels. */
function edges(w:number,h:number,v:ViewState,total=3){
 const fit=readerFit(w,h,v,total,EDITOR_COLUMN),natural=fit.pages.length*page+(fit.pages.length-1)*gap,width=natural*fit.scale,left=(fit.width-width)/2-fit.shift;
 return {fit,left,right:fit.width-left-width};
}

test('one page on a large or a small screen keeps its size and place; the editor column is the room beside it',()=>{
 for(const [w,h] of [[1920,1080],[1280,720],[960,540],[1366,768],[1280,800]]){
  const v=view(),plain=viewportFit(w,h,v,3),{fit,left,right}=edges(w,h,v);
  assert.equal(fit.scale,plain.scale,`${w}x${h} scale`);assert.equal(fit.shift,0);assert.deepEqual(fit.pages,plain.pages);
  assert.ok(right>=EDITOR_COLUMN,`${w}x${h} leaves the editor its column`);assert.ok(Math.abs(fit.column-right)<1e-6);assert.ok(Math.abs(left-right)<1e-6);
 }
});

test('pages that crowd the column are centred in the room left of it, and shrink only as much as that room needs',()=>{
 const tv=edges(1920,1080,view({count:2}));
 assert.equal(tv.fit.scale,viewportFit(1920,1080,view({count:2}),3).scale,'two pages on a 1920×1080 screen only move');
 for(const [w,h,count] of [[1920,1080,2],[1280,720,2],[1280,720,3],[1920,1080,3],[1366,768,2],[1080,1920,1]] as const){
  const {fit,left,right}=edges(w,h,view({count}));
  assert.ok(right>=EDITOR_COLUMN-1e-6,`${w}x${h}x${count} column`);assert.ok(Math.abs(fit.column-right)<1e-6,`${w}x${h}x${count} the column is the room right of the pages`);
  // Centred in the space beside the column, not against the screen's left edge.
  assert.ok(Math.abs(left-(right-EDITOR_COLUMN))<1e-6,`${w}x${h}x${count} centred`);assert.ok(left>=EDITOR_GUTTER-1e-6,`${w}x${h}x${count} clear of the edge`);
  assert.ok(fit.scale<=viewportFit(w,h,view({count}),3).scale);
 }
 // A 1920×1080 screen at 150% with two pages: the pages stand off the left edge by the gutter, as the column does from the right.
 const tv150=edges(1280,720,view({count:2}));assert.ok(Math.abs(tv150.left-EDITOR_GUTTER)<1e-6);
 const turned=edges(1920,1080,view({rotation:90})),upright=edges(1080,1920,view());
 assert.deepEqual(turned.fit,{...upright.fit,width:upright.fit.width,height:upright.fit.height});
});

test('a score that cannot be edited keeps the plain fit',()=>{
 for(const count of [1,2,3] as const){const v=view({count});assert.deepEqual(readerFit(1280,720,v,3),{...viewportFit(1280,720,v,3),shift:0,column:(1280-viewportFit(1280,720,v,3).scale*(Math.min(count,3)*page+(Math.min(count,3)-1)*gap))/2});}
});

test('the reader names a note without a finger as having none',()=>{
 const labels:string[]=[],seat={id:'s1',ownerIds:['n1'],pitchDigit:'7',writtenBar:4};
 const context:any={currentFingerPresentation:()=>'annotations',fingerFor:()=>undefined,handFor:()=>'RH',effectiveHands:()=>()=>'RH',paintFinger:(_text:any,_seat:any,options:any)=>labels.push(options.label)};
 runInNewContext(production('function paintReaderSeats(','/** Save every page'),context);
 const text={dataset:{} as Record<string,string>};
 context.paintReaderSeats({element:{dataset:{}},seats:[{seat,text}]},{},{},{},'finger',new Map([['s1',{}]]),true);
 assert.deepEqual(labels,['Pitch 7, no finger, RH, bar 4']);
 context.fingerFor=()=>3;context.paintReaderSeats({element:{dataset:{}},seats:[{seat,text}]},{},{},{},'finger',new Map([['s1',{}]]),true);
 assert.equal(labels[1],'Pitch 7, finger 3, RH, bar 4');
});

test('while a note is edited, notices sit in the editor column instead of over the music',()=>{
 const node=(name:string)=>{const n:any={name,parentElement:undefined,children:[] as any[],attributes:{} as Record<string,string>,textContent:'',setAttribute(k:string,v:string){n.attributes[k]=v;},append(child:any){child.parentElement?.children.splice(child.parentElement.children.indexOf(child),1);child.parentElement=n;n.children.push(child);}};return n;};
 const body=node('body'),column=node('column'),all=()=>[...body.children,...column.children];
 const context:any={selection:{id:'s1'},practice:undefined,app:{querySelector:(s:string)=>s==='.editor-column'?column:null},window:{setTimeout(){}},
  document:{body,querySelector:(s:string)=>s==='.toast'?all().find(n=>n.className==='toast')??null:null,createElement:()=>node('div')}};
 runInNewContext(production('function notify(','\n'),context);
 context.notify('Bar 21 keeps its written hands: the carried hand can’t be drawn there.');
 assert.equal(column.children.length,1);assert.equal(column.children[0].attributes.role,'status');
 context.selection=undefined;context.notify('Saved.');
 assert.equal(column.children.length,0);assert.equal(body.children[0].textContent,'Saved.');
 assert.equal(all().length,1,'one notice at a time');
});

test('the Finger row reads its source first, then its buttons, and nothing after them',()=>{
 const code=`${production('const button=(','\n')}\n${production('const editorActions=','\n')}\n${production('function editorMemoryMarkup(','/** A row')}`;
 const row=(said:string|undefined,promote:boolean)=>{
  const context:any={esc:(t:string)=>t,current:{entry:{id:'piece'}},selection:{ownerIds:['n1'],writtenBar:1},entries:[],sourceReturn:undefined,controls:{bindings:{}},
   memoryInput:()=>({personal:{}}),resolveMemoryInput:()=>({}),memoryChoiceLabel:()=>said?'Shared':undefined,memoryReferenceTarget:()=>undefined,
   memoryFingerSource:()=>({said,description:'Matching bars follow this bar’s finger.',reference:'here',promote}),workReference:()=>'',actionControlLabel:()=>'G',selectedWarningText:()=>'',editorHandMarkup:()=>'',printedBar:(_id:string,bar:number)=>bar};
  runInNewContext(`${stripTypeScriptTypes(code)};globalThis.markup=editorMemoryMarkup;`,context);return context.markup() as string;};
 const shared=row('Matching bars follow this bar.',true);
 assert.ok(shared.indexOf('Matching bars follow this bar.')<shared.indexOf('<span class="editor-row-actions">'),'the line comes before the buttons');
 assert.match(shared,/<span class="editor-row-actions"><button[^>]*>Source<kbd>G<\/kbd><\/button><button[^>]*>Use for matching bars<\/button><\/span><\/div>$/);
 // With no finger yet the row is its name and Source alone, on one line.
 assert.match(row(undefined,false),/^<div class="editor-row" data-editor-row="finger"><span class="editor-row-name">Finger<\/span><span class="fingering-advice-explanation"[^>]*><\/span><button[^>]*disabled>Source<kbd>G<\/kbd><\/button><\/div>$/);
});
