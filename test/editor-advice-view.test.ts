import test from 'node:test';import assert from 'node:assert/strict';
import {editorAdviceMarkerLabel} from '../src/editor-advice-view';
import {adviceMarkerSvg} from '../src/fingering-advice-markers';
import type {EditorAdviceWarning} from '../src/fingering-advice';
import type {ScorePackage} from '../src/package';
test('accessible warning marker names musical measures instead of source implementation IDs',()=>{
 const source='14-Petite-etude.ly231-internal-owner',target='14-Petite-etude.ly275-internal-owner';
 const p={seats:[{ownerIds:[source],writtenBar:3},{ownerIds:[source],writtenBar:4,continuation:true},{ownerIds:[target],writtenBar:4}]} as Pick<ScorePackage,'seats'>;
 const warning={transition:{hand:'RH',finger:1,sourceOwnerIds:[source],targetOwnerIds:[target],distanceMm:100,availableMs:250,speedMps:.4},reasons:['fast']} as EditorAdviceWarning;
 const label=editorAdviceMarkerLabel(p,warning),svg=adviceMarkerSvg([{ownerIds:[target],page:0,x:10,y:10,radius:3,warning,label}]);
 assert.match(label,/Right hand, finger 1: measure 3 → measure 4/);assert.match(label,/10 cm; 250 ms available; 40 cm\/s/);assert.match(label,/Above your travel threshold/);
 assert.ok(svg.includes('aria-label='));assert.ok(svg.includes('<title>Right hand'));assert.ok(!svg.includes(source));assert.ok(!svg.includes(target));
});
test('unavailable written owner geometry uses a neutral contact label without revealing opaque IDs',()=>{
 const warning={transition:{hand:'LH',finger:2,sourceOwnerIds:['foreign-source'],targetOwnerIds:['foreign-target'],distanceMm:10,availableMs:0,speedMps:null},reasons:['no-available-time']} as EditorAdviceWarning;
 const label=editorAdviceMarkerLabel({seats:[]},warning);assert.match(label,/Left hand, finger 2: contact → contact/);assert.ok(!label.includes('foreign-'));
});
