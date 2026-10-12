import assert from 'node:assert/strict';import test from 'node:test';
import {CalibrationPageInput} from '../src/calibration-page-input';
const note=(type:'note-on'|'note-off',velocity=80,deviceId='piano')=>({kind:'midi' as const,type,deviceId,channel:0,note:60,velocity});
test('A rating note held during setup or measurement cannot grade after entering a trial',()=>{
 const input=new CalibrationPageInput();assert.equal(input.admit(note('note-on'),false),null);
 assert.equal(input.admit(note('note-on'),true),null);
 assert.equal(input.admit(note('note-off'),true)?.type,'note-off');
 assert.equal(input.admit(note('note-on'),true)?.type,'note-on');
});
test('Velocity-zero release clears a held control while other pages remain isolated',()=>{
 const input=new CalibrationPageInput();input.admit(note('note-on'),true);
 assert.equal(input.admit(note('note-on'),false),null);
 assert.equal(input.admit(note('note-on',0),false)?.type,'note-off');
 assert.equal(input.admit(note('note-on'),true)?.type,'note-on');
 assert.equal(input.admit({kind:'manual',type:'key-down',code:'Digit2'},false),null);
 assert.equal(input.admit({kind:'manual',type:'key-up',code:'Digit2'},false)?.type,'key-up');
});
test('Device lifecycle cleanup does not confuse distinct MIDI sources',()=>{
 const input=new CalibrationPageInput();input.admit(note('note-on'),false);
 assert.equal(input.admit(note('note-on',80,'other'),true)?.type,'note-on');input.clear();
 assert.equal(input.admit(note('note-on'),true)?.type,'note-on');
});
