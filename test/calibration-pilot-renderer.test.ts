import test from 'node:test';
import assert from 'node:assert/strict';
import {createConventionalCalibrationKeyboard,createIdealJankoCalibrationKeyboard,createExploratoryCalibrationPlan,EXPLORATORY_CALIBRATION_PROTOCOL} from '@hypermemetic-ai/fingering-calculator';
import {pilotKeyboardModel,pilotPlacementText,pilotPitchText,renderPilotKeyboard,renderPilotMovementExample} from '../src/calibration-pilot-renderer';

const janko = () => createIdealJankoCalibrationKeyboard({geometryId:'janko-test',reference:'nominal test dimensions',minMidiPitch:21,maxMidiPitch:108,originMidiPitch:60,oppositeParityGapMm:5,usableWidthMm:18,sideMarginMm:1,usableDepthMm:18,rowDepthsMm:[0,22,44,66],rowHeightsMm:[0,10,20,30],keyTravelMm:4});
const conventional = () => createConventionalCalibrationKeyboard({geometryId:'piano-test',reference:'nominal test dimensions',minMidiPitch:21,maxMidiPitch:108,whiteWidthMm:23.5,whiteDepthMm:150,blackWidthMm:13,blackDepthMm:90,blackFrontDepthMm:50,blackHeightMm:12,whiteTravelMm:10,blackTravelMm:10,sideMarginMm:1});

test('Jankó color toggle preserves every physical key, contact, level and usable center',()=>{
 const keyboard=janko(), plan=createExploratoryCalibrationPlan({keyboard,hand:'RH',anchorMidiPitches:[60]});
 const trial=plan.trials[0],five=pilotKeyboardModel(keyboard,trial),classic=pilotKeyboardModel(keyboard,trial,'classic');
 assert.deepEqual(five.keys.map(({color,...q})=>q),classic.keys.map(({color,...q})=>q));
 assert(five.keys.some((q,i)=>q.color!==classic.keys[i].color));
 const anchor=five.keys.find(q=>q.role==='anchor')!,tested=five.keys.find(q=>q.role==='tested')!;
 assert.equal(anchor.row,2);assert.equal(anchor.level,'lower');assert.equal(tested.row,1);assert.equal(tested.level,'lower');
 assert(five.keys.some(q=>q.row===4&&q.midiPitch===60));assert(five.keys.some(q=>q.midiPitch<60));assert(five.keys.some(q=>q.midiPitch>61));
 const svg=renderPilotKeyboard(keyboard,trial);
 for(const text of ['Row 1','Row 2','Row 3','Row 4','Near · player','horizontal center at each depth','data-midi="60"','data-level="lower"','A1','T2'])assert(svg.includes(text),text);
 assert(!svg.includes('<circle'));
 assert.match(pilotPlacementText(keyboard,trial.anchors[0]),/finger 1 · C4 \(MIDI 60\) · row 2 · lower level/);
});

test('Jankó upper target and left-hand roles use actual core contacts rather than guessed rows',()=>{
 const keyboard=janko(),plan=createExploratoryCalibrationPlan({keyboard,hand:'LH',anchorMidiPitches:[61]});
 const trial=plan.trials[1],model=pilotKeyboardModel(keyboard,trial);
 const anchor=model.keys.find(q=>q.role==='anchor')!,tested=model.keys.find(q=>q.role==='tested')!;
 assert.equal(anchor.row,1);assert.equal(tested.row,4);assert.equal(tested.level,'upper');assert.equal(tested.midiPitch,60);
 const svg=renderPilotKeyboard(keyboard,trial);assert.match(svg,/Left hand/);assert.match(svg,/upper level/);
});

test('conventional rear white usable centers differ from front and remain classic under color argument',()=>{
 const keyboard=conventional(),plan=createExploratoryCalibrationPlan({keyboard,hand:'RH',anchorMidiPitches:[60]});
 const trial=plan.trials[0],model=pilotKeyboardModel(keyboard,trial);
 const anchor=model.keys.find(q=>q.role==='anchor')!;
 assert.equal(anchor.usable.length,3);
 assert.notEqual(anchor.centers[0].x,anchor.centers[1].x);
 assert(anchor.usable[1].xMax-anchor.usable[1].xMin < anchor.usable[0].xMax-anchor.usable[0].xMin);
 assert.deepEqual(model,pilotKeyboardModel(keyboard,trial,'classic'));
 const svg=renderPilotKeyboard(keyboard,trial);assert.match(svg,/conventional key/);assert.equal((svg.match(/class="pilot-center-guide"/g)??[]).length,4);assert(!svg.includes('<circle'));assert(!svg.includes('Row 1'));
});

test('diagram text uses actual MIDI pitch numbering and movement example explains finger versus whole hand',()=>{
 assert.equal(pilotPitchText(60),'C4');assert.equal(pilotPitchText(21),'A0');assert.equal(pilotPitchText(108),'C8');
 const demo=renderPilotMovementExample();assert.match(demo,/Finger adjusts · palm stays/);assert.match(demo,/Whole hand swivels · avoid/);assert.match(demo,/original contact point/);
 assert.equal(EXPLORATORY_CALIBRATION_PROTOCOL.prominentInstruction,'Keep your wrist in place. Keep your hand pointing the same way.');
});
