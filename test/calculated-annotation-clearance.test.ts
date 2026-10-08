import test from 'node:test';import assert from 'node:assert/strict';
import {actualPageObstacles,boxesOverlap} from '../src/svg-annotation-clearance';
const page=(ink:string)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300"><rect width="100%" height="100%" fill="#FFFFFF"/>${ink}</svg>`;
test('foreign actual primitives, transformed curve control hulls and text bands remain obstacles independent of owned carrier geometry',()=>{
 const p=actualPageObstacles(page('<g transform="translate(30 60) scale(2 -2)"><path d="M0 0 C2 8 6 10 10 0" fill="none" stroke="black" stroke-width="2"/></g><circle cx="80" cy="120" r="5"/><text x="170" y="160" font-size="10">Foreign voice</text>'),new Map());
 assert.equal(p.boxes.length,3);assert.ok(boxesOverlap([28,38,35,43],p.boxes[0]));
 assert.ok(boxesOverlap([79,119,81,121],p.boxes[1]));assert.ok(boxesOverlap([5,145,10,150],p.boxes[2]),'foreign text reserves complete horizontal coverage');
 assert.equal(p.width,200);assert.equal(p.height,300);
});
test('default stroke width, square caps and miter protrusions have conservative paint bounds',()=>{
 const p=actualPageObstacles(page('<polyline points="20,20 30,40 40,20" fill="none" stroke="black"/><line x1="80" y1="80" x2="100" y2="80" stroke="black" stroke-width="8" stroke-linecap="square" stroke-linejoin="bevel"/><path d="M120 20 L130 60 L131 20" stroke="black" stroke-width="2" stroke-miterlimit="12"/>'),new Map());
 assert.ok(p.boxes[0][0]<18,'default width one and default miter four are included');
 assert.ok(p.boxes[1][0]<=72&&p.boxes[1][2]>=108);assert.ok(p.boxes[2][0]<=108&&p.boxes[2][2]>=143);
});
test('positioned descendants, text displacement and unbounded paint effects fail closed',()=>{
 for(const ink of ['<text x="10" y="20" font-size="8"><tspan x="80" y="120">Shifted</tspan></text>',
  '<text x="10" y="20" dy="100" font-size="8">Shifted</text>',
  '<path d="M10 10 L20 20" stroke="black" vector-effect="non-scaling-stroke"/>',
  '<path d="M10 10 A10 10 0 1 0 20 20"/>',
  '<g style="filter:blur(3px)"><line x1="1" y1="2" x2="3" y2="4"/></g>'])
  assert.throws(()=>actualPageObstacles(page(ink),new Map()),/Unsupported/);
});
