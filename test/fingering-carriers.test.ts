import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {importPackage,digitMetrics,type ScorePackage,type Seat} from '../src/package';
import {hollowStemSvg} from '../vendor/iso-notation/src/render/janko/hollow-stem';
import {fingeringCarriers} from '../src/fingering-carriers';
import {annotationPositions,ANNOTATION_COLOR} from '../src/fingering-presentation';
import {expertSettings} from '../src/expert-settings';
import {fingerPreferences} from '../src/input';
import {DOMParser} from '@xmldom/xmldom';
import {actualPageObstacles,boxesOverlap,type AnnotationBox} from '../src/svg-annotation-clearance';
const p=await importPackage(readFileSync(new URL('../fixtures/schumann-op68-no14.isoscore',import.meta.url)),{allowLegacyTempo:true});
const base=p.score.notes[0];
function note(id:string,pitch:number,tick=0,duration=48,hand:'LH'|'RH'='RH') {return {...base,id,startTick:tick,durationTicks:duration,hand,eventKind:'pitched' as const,pitch:{...base.pitch,octave:Math.floor(pitch/12),pitchClass:pitch%12}};}
function seat(id:string,owners:string[],y:number,x=50,continuation=false):Seat {return {...p.seats[0],id,ownerIds:owners,x,baseline:y+3,fontSize:6,system:0,page:0,continuation};}
const head=(seat:Seat,x=seat.x)=>`<g class="janko-reading-head" data-note-x="${x}" data-owner-ids="${seat.ownerIds.join('|')}"><rect class="janko-knockout" x="${x-3}" y="${seat.baseline-7}" width="6" height="8"/><text data-viewer-seat="${seat.id}">${seat.pitchDigit}</text></g>`;
const stem=(x:number,y1:number,y2:number)=>`<line class="janko-stem" x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke-width=".9"/>`;
function fixture(notes:ScorePackage['score']['notes'],seats:Seat[],ink:string,heads=seats.map(s=>head(s)).join('')) {return {score:{...p.score,notes},seats,pages:[`<svg xmlns="http://www.w3.org/2000/svg"><g id="system-1">${ink}${heads}</g></svg>`]};}

test('literal No.14 resolves all source seats, including two shared-head independent-duration aliases',()=>{
 const before=JSON.stringify(p),c=fingeringCarriers(p);assert.equal(c.size,381);assert.ok([...c.values()].every(c=>c.kind==='stem'));
 for(const id of ['seat-283','seat-287']){assert.equal(p.seats.find(s=>s.id===id)!.ownerIds.length,2);assert.equal(c.get(id)!.stemIds.length,2);}
 assert.equal(c.get('seat-1')!.x,50.9);assert.notEqual(c.get('seat-1')!.x,p.seats[1].x,'optical digit x is not the rhythm column');
 assert.equal(JSON.stringify(p),before);
});
test('same-column independent voices and unrelated nearby stems retain their own carriers',()=>{
 const a=seat('a',['a'],100),b=seat('b',['b'],125),q=fixture([note('a',60,0,48),note('b',55,0,24)],[a,b],stem(50,95.8,80)+stem(50,120.8,110)+stem(53.2,96,40));
 const c=fingeringCarriers(q);assert.equal(c.get('a')!.edge,80);assert.equal(c.get('b')!.edge,110);assert.notEqual(c.get('a')!.id,c.get('b')!.id);
 const orphan=fixture([note('a',60)],[a],stem(51,75,50));assert.equal(fingeringCarriers(orphan).get('a')!.kind,'head','an unrelated stem is never borrowed');
 const high=seat('high',['high'],80),low=seat('low',['low'],100),independent=fixture([{...note('high',72),voice:1,sourceProvenance:undefined},{...note('low',60),voice:2,sourceProvenance:undefined}],[high,low],stem(50,75.8,60));
 assert.notEqual(fingeringCarriers(independent).get('high')!.id,fingeringCarriers(independent).get('low')!.id,'independent source voices do not become a chord solely through same-onset timing');
});
test('source-linked optical offsets, repeat and continuation seats use their actual page attachment',()=>{
 const a=seat('a',['a'],100,49.8),q=fixture([note('a',60)],[a],stem(50,95.8,80),head(a,50));assert.equal(fingeringCarriers(q).get('a')!.x,50);
 const repeated={...a,id:'a-next',page:1,continuation:true,baseline:203},r={...q,seats:[a,repeated],pages:[...q.pages,`<svg xmlns="http://www.w3.org/2000/svg"><g id="system-1">${stem(50,195.8,180)}${head(repeated,50)}</g></svg>`]};
 const c=fingeringCarriers(r);assert.equal(c.get('a-next')!.edge,180);assert.notEqual(c.get('a')!.id,c.get('a-next')!.id);
 const high=seat('high',['high'],80,50,true),low=seat('low',['low'],100,50,true),shared=fixture([note('high',72,0,96),note('low',60,24,72)],[high,low],stem(50,75.8,60));
 assert.equal(fingeringCarriers(shared).get('high')!.id,fingeringCarriers(shared).get('low')!.id,'continued equal releases share the current carrier despite different source starts');
 const independent={...shared,score:{...shared.score,notes:[note('high',72,0,96),note('low',60,24,96)]}};
 assert.notEqual(fingeringCarriers(independent).get('high')!.id,fingeringCarriers(independent).get('low')!.id,'independent remaining durations do not inherit another continuation carrier');
});
test('sloping thick beams use the outer edge at each owning stem, and flags/rings extend its envelope',()=>{
 const a=seat('a',['a'],100),b=seat('b',['b'],100,70),q=fixture([note('a',60),note('b',62,24)],[a,b],`<g class="janko-beam-group">${stem(50,95.8,80)}${stem(70,95.8,70)}<path class="janko-beam" d="M 49 78.5 L 71 67.5 L 71 70.5 L 49 81.5 Z"/></g>`);
 const c=fingeringCarriers(q);assert.equal(c.get('a')!.edge,78);assert.equal(c.get('b')!.edge,68);
 const flagged=fixture([note('a',60)],[a],stem(50,95.8,80)+'<path class="janko-flag" data-stem-x="50" d="M 50 80 C 50 74 53 77 53 85 Z"/><circle class="janko-stem-ring" cx="50" cy="81" r="4" stroke-width="1"/>');
 assert.equal(fingeringCarriers(flagged).get('a')!.edge,74,'whole owning flag envelope is cleared');
});
test('shared compatible chord stems stack by pitch under either actual direction without omission or reflow',()=>{
 for(const direction of [-1,1] as const){
  const high=seat('high',['high'],80),low=seat('low',['low'],100),notes=[note('high',72,0,48,direction===-1?'RH':'LH'),note('low',60,0,48,direction===-1?'RH':'LH')],q=fixture(notes,[high,low],direction===-1?stem(50,75.8,60):stem(50,104.2,120)),before=JSON.stringify(q),positions=annotationPositions(q),a=positions.get('high')!,b=positions.get('low')!;
  assert.equal(a.carrier.id,b.carrier.id);assert.equal(a.carrier.direction,direction);assert.equal(a.x,b.x);assert.ok(a.bounds[3]<b.bounds[1]);assert.ok(direction===-1?b.bounds[3]<60:a.bounds[1]>120);assert.equal(positions.size,2);assert.equal(JSON.stringify(q),before);
 }
});
test('fresh shared continuation stacks move together within original columns and clear actual grid ink for every 1–5 outline',()=>{
 for(const direction of [-1,1] as const){const hand:'RH'|'LH'=direction===-1?'RH':'LH',high=seat('high',['high'],80,50,true),low=seat('low',['low'],100,50,true),
  notes=[note('high',72,0,96,hand),note('low',60,24,72,hand)],q=fixture(notes,[high,low],
   (direction===-1?stem(50,75.8,60):stem(50,104.2,120))+'<line x1="50" y1="0" x2="50" y2="300" stroke="gray" stroke-width=".1" stroke-dasharray="2,3"/>');
  q.pages[0]=q.pages[0].replace('<svg xmlns="http://www.w3.org/2000/svg">','<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300">');
  q.score.performingHandPresentation={version:'performing-hand-presentation-v1',assignmentId:'authored-continuation',owners:notes.map(n=>({id:n.id,
   pitch:n.pitch.octave*12+n.pitch.pitchClass,startTick:n.startTick,durationTicks:n.durationTicks,hand:n.hand}))};
  const geometry={version:'annotation-carrier-geometry-v1' as const,presentationIdentity:'authored-continuation',coverage:'owned-head-and-duration' as const,
   seats:[high,low].map(s=>({seatId:s.id,page:0,system:0,hand,headBounds:{x0:47,y0:s.baseline-7,x1:53,y1:s.baseline+1},
    maskBounds:{x0:47,y0:s.baseline-7,x1:53,y1:s.baseline+1},durationBounds:[{x0:49.5,x1:50.5,y0:direction===-1?60:104.2,y1:direction===-1?75.8:120}]}))},
   candidate={...q,annotationGeometry:geometry},before=JSON.stringify(candidate),positions=annotationPositions(candidate),a=positions.get('high')!,b=positions.get('low')!,
   obstacles=actualPageObstacles(q.pages[0],new Map(geometry.seats.map(g=>[g.seatId,[g.headBounds.x0,g.headBounds.y0,g.headBounds.x1,g.headBounds.y1] as AnnotationBox])));
  assert.notEqual(a.x,50);assert.equal(a.x,b.x);assert.equal(a.carrier.id,b.carrier.id);assert.equal(a.carrier.x,50);assert.ok(Math.abs(a.x-50)<=4);
  assert.ok(a.bounds[3]<b.bounds[1]);assert.ok(direction===-1?b.bounds[3]<60:a.bounds[1]>120);
  for(const position of positions.values())for(const d of Object.values(digitMetrics)){const em=position.fontSize*4/3,
   glyph:AnnotationBox=[position.x+(d[0]-280)*em/1000,position.baseline-d[3]*em/1000,position.x+(d[2]-280)*em/1000,position.baseline-d[1]*em/1000];
   assert.ok(!obstacles.boxes.some(ink=>boxesOverlap(glyph,ink)));assert.ok(glyph[0]>=position.bounds[0]&&glyph[2]<=position.bounds[2]);}
  assert.deepEqual(annotationPositions({...candidate,seats:[low,high]}),positions);assert.equal(JSON.stringify(candidate),before);
 }
});
test('an opposed shared-head alias uses its performing contact branch and retains both engraved branches',()=>{
 const a=seat('a',['a','b'],100),q=fixture([note('a',60,0,48,'RH'),note('b',60,0,24,'RH')],[a],stem(50,95.8,80)+stem(50,104.2,120)),before=JSON.stringify(q),c=fingeringCarriers(q).get('a')!;
 assert.equal(c.kind,'stem');assert.equal(c.direction,-1);assert.equal(c.edge,80);assert.equal(c.stemIds.length,1);assert.equal(c.associatedStemIds.length,2);assert.equal(JSON.stringify(q),before);
});
test('explicit chord bridge identities associate displaced shared members without annexing another onset',()=>{
 const high=seat('high',['high'],80,50),low=seat('low',['low'],100,55),foreign=seat('foreign',['foreign'],120,55),q=fixture([note('high',72),note('low',60),note('foreign',48,24)],[high,low,foreign],stem(50,75.8,60)+'<line class="janko-chord-bridge" data-bridge-notes="high,low" x1="50" y1="80" x2="50" y2="100"/>');
 const c=fingeringCarriers(q);assert.equal(c.get('high')!.id,c.get('low')!.id);assert.notEqual(c.get('low')!.id,c.get('foreign')!.id);
});
test('Expert Options is a visible section with two independent saved choices and concise replacement help',()=>{
 for(const behavior of ['toggle','momentary'] as const)for(const presentation of ['annotations','replacement'] as const){
  const prefs=fingerPreferences({fingerBehavior:behavior,fingerPresentation:presentation}),before=JSON.stringify(prefs),markup=expertSettings(prefs),doc=new DOMParser().parseFromString(markup,'text/html'),elements=Array.from(doc.getElementsByTagName('*'));
  assert.equal(doc.documentElement!.localName,'section');assert.equal(elements.filter(e=>e.localName==='details').length,0);
  assert.equal(elements.find(e=>e.localName==='option'&&e.hasAttribute('selected'))!.getAttribute('value'),behavior);assert.equal(elements.find(e=>e.localName==='input')!.hasAttribute('checked'),presentation==='replacement');
  assert.ok(doc.documentElement!.textContent!.includes('When fingerings are shown, replace note numbers with finger numbers'));assert.ok(doc.documentElement!.textContent!.includes('Hidden fingerings leave note numbers visible.'));assert.ok(doc.documentElement!.textContent!.includes('Show fingerings'));assert.equal(JSON.stringify(prefs),before);
 }
 assert.equal(ANNOTATION_COLOR,'#56788f');
});

const hollow=(x:number,y1:number,y2:number,value:'half'|'whole'='half')=>hollowStemSvg({kind:'hollow-stem',x,y1,y2,halfWidth:value==='half'?1.25:2.5,width:.6,value});
test('canonical hollow half/whole stems reserve all five finger outlines beyond their stroke exterior',()=>{
 for(const direction of [-1,1] as const)for(const value of ['half','whole'] as const){
  const a=seat('a',['a'],100),y1=direction===-1?94.8:105.2,y2=direction===-1?78.36:121.64,q=fixture([note('a',60,0,value==='half'?96:192,direction===-1?'RH':'LH')],[a],hollow(50,y1,y2,value)),before=JSON.stringify(q),pos=annotationPositions(q).get('a')!;
  assert.equal(pos.carrier.kind,'stem');assert.equal(pos.carrier.direction,direction);assert.ok(Math.abs(pos.carrier.edge-y2)<1e-9,'outer stroke tip, not rectangle centerline');
  assert.ok(direction===-1?pos.bounds[3]<y2:pos.bounds[1]>y2);
  for(const bounds of Object.values(digitMetrics)){const em=pos.fontSize*4/3,top=pos.baseline-bounds[3]*em/1000,bottom=pos.baseline-bounds[1]*em/1000;assert.ok(direction===-1?bottom<y2:top>y2,'each actual finger outline clears the carrier');}
  assert.equal(JSON.stringify(q),before);
 }
});
test('hollow stems preserve compatible chord order, independent values/voices and unrelated incidence',()=>{
 const high=seat('high',['high'],80),low=seat('low',['low'],100),notes=[note('high',72,0,96),note('low',60,0,96)];
 for(const direction of [-1,1] as const){const shared=fixture(notes.map(n=>({...n,hand:direction===-1?'RH' as const:'LH' as const})),[high,low],direction===-1?hollow(50,74.8,60):hollow(50,105.2,120)),positions=annotationPositions(shared),a=positions.get('high')!,b=positions.get('low')!;assert.equal(a.carrier.id,b.carrier.id);assert.ok(a.bounds[3]<b.bounds[1]);assert.ok(direction===-1?b.bounds[3]<60:a.bounds[1]>120);}
 const independent=fixture([notes[0],{...notes[1],durationTicks:192,voice:2,sourceProvenance:undefined}],[high,low],hollow(50,74.8,60)+hollow(50,94.8,70,'whole'));
 const c=fingeringCarriers(independent);assert.equal(c.get('high')!.edge,60);assert.equal(c.get('low')!.edge,70);assert.notEqual(c.get('high')!.id,c.get('low')!.id);
 const unrelated=fixture([note('low',60)],[low],hollow(51,75,50));assert.equal(fingeringCarriers(unrelated).get('low')!.kind,'head');
});
test('hollow carrier aliases and continued/repeated seats keep independent actual branches',()=>{
 const a=seat('a',['a','b'],100),q=fixture([note('a',60,0,96,'RH'),note('b',60,0,192,'RH')],[a],hollow(50,94.8,80)+hollow(50,94.8,70,'whole')+hollow(50,105.2,120)),c=fingeringCarriers(q).get('a')!;
 assert.equal(c.direction,-1);assert.equal(c.edge,70);assert.equal(c.stemIds.length,2);assert.equal(c.associatedStemIds.length,3);
 const high=seat('high',['high'],80,50,true),low=seat('low',['low'],100,50,true),shared=fixture([note('high',72,0,96),note('low',60,24,72)],[high,low],hollow(50,74.8,60));
 const same=fingeringCarriers(shared);assert.equal(same.get('high')!.id,same.get('low')!.id);
 const changed={...shared,score:{...shared.score,notes:[note('high',72,0,96),note('low',60,24,96)]}};assert.notEqual(fingeringCarriers(changed).get('high')!.id,fingeringCarriers(changed).get('low')!.id);
 const repeated={...a,id:'a-repeat',page:1,baseline:203,continuation:true},r={...q,seats:[a,repeated],pages:[...q.pages,`<svg xmlns="http://www.w3.org/2000/svg"><g id="system-1">${hollow(50,194.8,180)}${head(repeated)}</g></svg>`]};
 const distinct=fingeringCarriers(r);assert.equal(distinct.get('a-repeat')!.edge,180);assert.notEqual(distinct.get('a')!.id,distinct.get('a-repeat')!.id);
});
test('malformed or locally transformed hollow rectangles cannot claim a source head carrier',()=>{
 const a=seat('a',['a'],100),valid=hollow(50,94.8,80);
 for(const bad of [valid.replace('width="2.50"','width="NaN"'),valid.replace('x="48.75"','x=" "'),valid.replace('height="14.20"','height="0"'),valid.replace('stroke-width="0.60"','stroke-width="-1"'),valid.replace('data-long-value="half"','data-long-value="other"'),valid.replace('<rect','<rect transform="translate(0,-30)"')]){
  assert.notEqual(bad,valid,'mutation must alter the fixture');assert.equal(fingeringCarriers(fixture([note('a',60)],[a],bad)).get('a')!.kind,'head');
 }
});
