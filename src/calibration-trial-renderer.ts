import {calibrationKeyboardScene,type CalibrationColorLayout,type CalibrationKeyboard,type CalibrationTrial,type CalibrationSurface} from '@hypermemetic-ai/fingering-calculator';

export type CalibrationNoteNames='iso'|'traditional';
export const calibrationEscape=(value:string)=>value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export const calibrationFingerNames=['','Thumb','Index','Middle','Ring','Pinky'] as const;
export function calibrationPitchText(midi:number,names:CalibrationNoteNames='iso'):string {
 return names==='iso' ? (midi%12).toString(12).toUpperCase() : ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'][midi%12]+(Math.floor(midi/12)-1);
}
/** Fixed millimetre-to-screen scale per instrument. Targets move; their key sizes never change. */
export function renderCalibrationTrial(keyboard:CalibrationKeyboard,trial:CalibrationTrial,names:CalibrationNoteNames='iso',colors:CalibrationColorLayout='five-seven'):string {
 const placements=[...trial.anchors,...trial.active];
 const contacts=placements.map(p=>{const key=keyboard.keys.find(k=>k.id===p.keyId);if(!key)throw Error('Calibration contact is missing.');return {placement:p,key};});
 const janko=keyboard.id==='janko-four-row',scale=janko?4.7:2.15;
 const center=contacts.reduce((sum,{key})=>sum+(key.usable[0].xMin+key.usable[0].xMax)/2,0)/contacts.length;
 const x=(value:number)=>700+(value-center)*scale,y=(depth:number)=>375-depth*scale;
 const scene=calibrationKeyboardScene(keyboard,janko?colors:'classic').filter(k=>x(k.usable[0].xMin)>260&&x(k.usable[0].xMax)<1140);
 const rect=(p:CalibrationSurface,fill:string,stroke:string='none')=>`<rect x="${x(p.xMin)}" y="${y(p.depthMax)}" width="${(p.xMax-p.xMin)*scale}" height="${(p.depthMax-p.depthMin)*scale}" fill="${fill}" stroke="${stroke}" stroke-width="1.3"/>`;
 let bodies:string;
 if(janko){
  const pitches=[...new Set(scene.map(k=>k.midiPitch))];
  bodies=pitches.map(pitch=>{
   const keys=scene.filter(k=>k.midiPitch===pitch).sort((a,b)=>a.usable[0].depthMin-b.usable[0].depthMin);
   const patches=keys.flatMap(k=>k.body??k.usable),bottom=Math.min(...patches.map(p=>p.depthMin)),top=Math.max(...patches.map(p=>p.depthMax));
   const p={...patches[0],depthMin:bottom,depthMax:top},light=keys[0].color==='light',fill=light?'#e6e4db':'#080808',stroke=light?'#99978f':'#6a6a6a';
   const split=(keys[0].usable[0].depthMax+keys[1].usable[0].depthMin)/2;
   return `<g data-pitch="${pitch}">${rect(p,fill,stroke)}<path d="M${x(p.xMin)} ${y(split)}H${x(p.xMax)}" fill="none" stroke="${stroke}" stroke-width="1.1"/></g>`;
  }).join('');
 }else {
  bodies=scene.slice().sort((a,b)=>Number(a.color==='dark')-Number(b.color==='dark')).map(k=>`<g data-pitch="${k.midiPitch}">${(k.body??k.usable).map(p=>rect(p,k.color==='light'?'#e6e4db':'#080808',k.color==='light'?'#99978f':'#6a6a6a')).join('')}</g>`).join('');
 }
 const markers=contacts.map(({placement,key},i)=>{
  const color=i===0?'#69b6e5':'#f1c36c',patch=key.usable[0],cx=x((patch.xMin+patch.xMax)/2),cy=y((patch.depthMin+patch.depthMax)/2),other=contacts[1-i].key.usable[0],left=cx===x((other.xMin+other.xMax)/2)?i===0:cx<x((other.xMin+other.xMax)/2);
  const tip=left?240:1160,tx=left?220:1180;
  return `<g data-contact-key="${calibrationEscape(key.id)}" data-finger="${placement.finger}">${key.usable.map(p=>rect(p,color)).join('')}<text x="${cx}" y="${y(patch.depthMin)-12}" text-anchor="middle" fill="#000" font-size="22">${calibrationPitchText(key.midiPitch,names)}</text><path d="M${left?x(patch.xMin):x(patch.xMax)} ${cy}H${tip}" stroke="${color}" stroke-width="2" fill="none"/><text x="${tx}" y="${cy+7}" text-anchor="${left?'end':'start'}" fill="${color}" font-size="24">${calibrationFingerNames[placement.finger]}</text></g>`;
 }).join('');
 const label=contacts.map(({placement,key})=>`${calibrationFingerNames[placement.finger]} on ${calibrationPitchText(key.midiPitch,names)}${key.row?`, ${key.level} level`:''}`).join('; ');
 return `<svg class="calibration-contact-diagram" role="img" aria-label="${calibrationEscape(label)}" viewBox="0 0 1400 410" xmlns="http://www.w3.org/2000/svg">${bodies}${markers}</svg>`;
}
