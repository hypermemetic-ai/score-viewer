import artwork from './calibration-assets/fingertip-illustrations.json';
import {FINGERTIP_PAIRS,parseFingertip,type FingertipHand} from './calibration-fingertips';
import type {FingertipState} from './calibration-fingertips-controller';
export const fingertipActualPitch=(canonicalPitch:number,hand:FingertipHand)=>hand==='LH'?124-canonicalPitch:canonicalPitch;
export function fingertipPitchName(pitch:number,noteNames:'iso'|'traditional'):string {return noteNames==='iso'?'0123456789AB'[pitch%12]:['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'][pitch%12];}
export const fingertipKeyBlack=(pitch:number,layout:'five-seven'|'classic')=>layout==='classic'?[1,3,6,8,10].includes(pitch%12):pitch%12<5;
/** Both instructions and key labels share the literal placement pitches in the accepted artwork. */
export function fingertipPlacements(pair:number,hand:FingertipHand){const source=artwork.cases[pair];return FINGERTIP_PAIRS[pair].map((name,i)=>({name,pitch:fingertipActualPitch((source.bands[name as keyof typeof source.bands] as number[])[0],hand),level:pair===0&&i===0?'lowest':'lower main'}));}
export function fingertipPlacementInstruction(pair:number,hand:FingertipHand,noteNames:'iso'|'traditional'):string {return fingertipPlacements(pair,hand).map(p=>`${p.name} on ${fingertipPitchName(p.pitch,noteNames)}’s ${p.level} level.`).join(' ');}
const ns='http://www.w3.org/2000/svg';
const project=(x:number,y:number,z:number)=>[0,1].map(i=>artwork.projection.origin[i]+x*artwork.projection.axes[0][i]+y*artwork.projection.axes[1][i]+z*artwork.projection.axes[2][i]);
const path=(points:number[][])=>'M'+points.map(p=>project(p[0],p[1],p[2]).map(n=>n.toFixed(2)).join(',')).join(' L')+' Z';
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function fingertipRulerSvg(s:FingertipState):string {
 const names=FINGERTIP_PAIRS[s.pair],value=parseFingertip(s.raw,'millimeters'),delta=value===undefined?70:Math.min(value*7.5,235),start=315;
 const finger=(i:number)=>{const x=i===0?345:560,reference=s.reference===(i===0?'first':'second')||s.reference==='both',y=reference?start:start+delta,color=reference?'#ebbf78':'#76cce2';return `<path d="M${x-31} 755 V${y+31} Q${x-31} ${y} ${x} ${y} Q${x+31} ${y} ${x+31} ${y+31} V755 Z" fill="${color}"/><text x="${x}" y="805" text-anchor="middle" font-size="23" fill="${color}">${names[i]}</text>`;};
 return `<svg xmlns="${ns}" viewBox="0 220 920 630" role="img" aria-label="Direct ruler measurement of ${names.join(' and ')}"><g font-family="URW Gothic">${finger(0)+finger(1)}<path d="M625 ${start} H715 M625 ${start+delta} H715 M695 ${start} V${start+delta}" fill="none" stroke="#aaa59d" stroke-width="1.5" stroke-dasharray="4 5"/>${value===undefined?'':`<text x="725" y="${start+delta/2+6}" font-size="22" fill="#eeeae0">${escape(s.raw)} mm</text>`}<text x="460" y="260" text-anchor="middle" font-size="17" fill="#aaa59d">Illustrated ruler reading · not to scale</text></g></svg>`;
}
/** Reflect shapes while relocating text anchors independently, so names stay readable. */
export function reflectFingertipSvg(svg:SVGSVGElement,hand:FingertipHand):void {
 if(hand!=='LH')return;
 svg.querySelectorAll('path,line,polygon,polyline').forEach(el=>el.setAttribute('transform','translate(920 0) scale(-1 1)'));
 svg.querySelectorAll('text').forEach(el=>el.setAttribute('x',String(920-Number(el.getAttribute('x')))));
}
export function renderFingertipIllustration(container:HTMLElement,s:FingertipState,noteNames:'iso'|'traditional',keyColors:'five-seven'|'classic'='five-seven'):void {
 container.innerHTML=s.method==='millimeters'?fingertipRulerSvg(s):artwork.cases[s.pair].svg;
 const svg=container.querySelector('svg')!;svg.setAttribute('viewBox','0 220 920 630');svg.removeAttribute('width');svg.removeAttribute('height');svg.setAttribute('role','img');svg.setAttribute('aria-label',`${s.hand==='LH'?'Left':'Right'} hand ${FINGERTIP_PAIRS[s.pair].join(' and ')} placement`);
 if(s.method==='percent'){
  svg.querySelectorAll('[data-key-midi]').forEach(el=>{const actual=fingertipActualPitch(Number(el.getAttribute('data-key-midi')),s.hand),black=fingertipKeyBlack(actual,keyColors);el.setAttribute('data-key-midi',String(actual));if(el.tagName==='text'){el.textContent=fingertipPitchName(actual,noteNames);el.setAttribute('fill',black?'#eeeae0':'#000');return;}const top=['#eeeae0','#090909'].includes(el.getAttribute('fill')??'');el.setAttribute('fill',black?(top?'#090909':'#161616'):(top?'#eeeae0':'#b3afa6'));el.setAttribute('stroke',black?'#484848':'#817d75');});
  const placements=fingertipPlacements(s.pair,s.hand);
  svg.querySelectorAll('text:not([data-key-midi])').forEach(el=>{const text=el.textContent??'',placement=placements.find(p=>text===p.name||text.startsWith(p.name+' · '));if(placement){el.textContent=`${placement.name} · ${fingertipPitchName(placement.pitch,noteNames)}`;el.setAttribute('data-contact-midi',String(placement.pitch));}else if(text.length===1&&'0123456789AB'.includes(text)){const actual=fingertipActualPitch(60+'0123456789AB'.indexOf(text),s.hand);el.textContent=fingertipPitchName(actual,noteNames);el.setAttribute('data-contact-midi',String(actual));}});
  svg.querySelectorAll('[data-contact-finger]').forEach(el=>{const name=el.getAttribute('data-contact-finger'),index=FINGERTIP_PAIRS[s.pair].indexOf(name as never),reference=s.reference==='both'||s.reference===(index===0?'first':'second'),color=reference?'#ebbf78':'#76cce2';el.setAttribute(el.tagName==='text'?'fill':'stroke',color);});
  const pair=artwork.cases[s.pair],g=svg.querySelector('g')!;
  FINGERTIP_PAIRS[s.pair].forEach(name=>{const [pitch,entry,wall,height]=pair.bands[name as keyof typeof pair.bands] as number[];for(const pct of [0,50,100]){const [x,y]=project((pitch-58)*15+7,entry+pct/100*(wall-entry),height+.2);const label=document.createElementNS(ns,'text');label.setAttribute('x',String(x));label.setAttribute('y',String(y+5));label.setAttribute('font-size','16');label.setAttribute('fill','#aaa59d');label.textContent=String(pct);g.append(label);}});
  svg.querySelectorAll('[data-finger]').forEach(el=>el.remove());

  if(s.reference)FINGERTIP_PAIRS[s.pair].forEach((name,i)=>{
   const reference=s.reference===(i===0?'first':'second')||s.reference==='both',pct=reference?100:parseFingertip(s.raw,'percent');if(pct===undefined)return;
   const [pitch,entry,wall,height,r]=pair.bands[name as keyof typeof pair.bands] as number[],x=(pitch-58)*15,tip=entry+pct/100*(wall-entry),bottom=Math.min(-5,tip-2*r),screen=project(x,tip,height);if(!screen.every(Number.isFinite)||screen[1]>840)return;
   const points=[[x-r,bottom,height+.3],[x-r,tip-r,height+.3]];for(let n=0;n<=16;n++){const a=Math.PI-n*Math.PI/16;points.push([x+r*Math.cos(a),tip-r+r*Math.sin(a),height+.3]);}points.push([x+r,bottom,height+.3]);
   const el=document.createElementNS(ns,'path');el.setAttribute('d',path(points));el.setAttribute('fill',reference?'#ebbf78':'#76cce2');el.setAttribute('data-finger',name);el.setAttribute('data-percent',String(pct));g.append(el);
  });
 }
 reflectFingertipSvg(svg,s.hand);
}
